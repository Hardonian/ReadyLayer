# JWT Authentication with Security Scopes & Local Bypass

## Overview

ReadyLayer implements a dual-mode authentication system that prioritizes local-first installation while maintaining seamless cloud authentication capabilities. The system uses JWT tokens with configurable security scopes and supports local SQLite bypass for development and offline scenarios.

## Architecture

### Core Components

1. **JWT Token Service** (`lib/auth/jwt-service.ts`)
2. **Security Scopes Manager** (`lib/auth/scopes.ts`)
3. **Local Bypass Handler** (`lib/auth/local-bypass.ts`)
4. **Auth Middleware** (`middleware/auth.ts`)

### Security Scopes

ReadyLayer uses granular security scopes to enforce the principle of least privilege:

```typescript
type SecurityScope = 
  // Core System
  | 'system:read'          // Read system information
  | 'system:write'         // Write system configuration
  | 'system:admin'         // Full system administration
  
  // Repository Operations
  | 'repo:read'            // Read repository data
  | 'repo:write'           // Modify repository settings
  | 'repo:delete'          // Delete repositories
  
  // Review & Policy
  | 'review:create'        // Create code reviews
  | 'review:read'          // Read review results
  | 'policy:write'         // Write policy configurations
  | 'policy:read'          // Read policy configurations
  
  // User Management
  | 'user:read'            // Read user profiles
  | 'user:write'           // Modify user settings
  | 'org:admin'            // Organization administration
  
  // Billing & Usage
  | 'billing:read'         // Read billing information
  | 'billing:write'        // Modify billing settings
  | 'usage:track'          // Track usage metrics;
```

### JWT Token Structure

```typescript
interface JWTPayload {
  // Standard JWT claims
  sub: string;            // User ID
  iss: string;            // Issuer (readylayer://local or readylayer://cloud)
  aud: string;            // Audience
  iat: number;            // Issued at
  exp: number;            // Expiration time
  jti: string;            // JWT ID for revocation
  
  // ReadyLayer-specific claims
  scopes: SecurityScope[]; // Authorized scopes
  orgId?: string;         // Organization context
  tenantType: 'local' | 'cloud'; // Deployment context
  userId: string;         // User identifier
  sessionId: string;       // Session tracking
  isLocalBypass: boolean; // Local development flag
}
```

## Local-First Installation

### Default Behavior

ReadyLayer defaults to local installation with the following characteristics:

1. **SQLite Database**: Local SQLite database for data persistence
2. **Local JWT Tokens**: Self-signed JWT tokens with local issuer
3. **Bypass Mode**: Automatic local bypass during development
4. **Offline Capability**: Full functionality without internet connectivity

### Local Bypass Implementation

```typescript
// lib/auth/local-bypass.ts
export class LocalBypassAuth {
  private static readonly LOCAL_ISSUER = 'readylayer://local';
  private static readonly LOCAL_SECRET = 'local-development-secret';
  
  static createLocalToken(user: LocalUser): string {
    const payload: JWTPayload = {
      sub: user.id,
      iss: this.LOCAL_ISSUER,
      aud: 'readylayer-local',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      jti: crypto.randomUUID(),
      scopes: this.getDefaultScopes(user.role),
      tenantType: 'local',
      userId: user.id,
      sessionId: crypto.randomUUID(),
      isLocalBypass: true
    };
    
    return jwt.sign(payload, this.LOCAL_SECRET, { algorithm: 'HS256' });
  }
  
  static verifyLocalToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.LOCAL_SECRET) as JWTPayload;
      return decoded.iss === this.LOCAL_ISSUER ? decoded : null;
    } catch {
      return null;
    }
  }
  
  private static getDefaultScopes(role: string): SecurityScope[] {
    switch (role) {
      case 'admin':
        return ['*']; // All scopes
      case 'user':
        return [
          'system:read',
          'repo:read',
          'repo:write',
          'review:create',
          'review:read',
          'policy:read',
          'user:read',
          'user:write',
          'billing:read',
          'usage:track'
        ];
      default:
        return ['system:read', 'repo:read', 'review:read'];
    }
  }
}
```

## Cloud Authentication Integration

### Seamless Transition

When transitioning from local to cloud deployment:

1. **Token Migration**: Existing local tokens are invalidated
2. **Scope Preservation**: User roles and permissions are preserved
3. **Data Migration**: SQLite data migrates to PostgreSQL
4. **Session Continuity**: Users maintain their access patterns

### Cloud OAuth Flow

```typescript
// app/api/auth/oauth/route.ts
export async function GET(request: Request) {
  const { provider } = await request.json();
  
  // Generate state with embedded scopes
  const state = JSON.stringify({
    scopes: requestedScopes,
    redirectUri: postAuthRedirect,
    tenantType: 'cloud'
  });
  
  // Redirect to OAuth provider with embedded state
  return Response.redirect(getOAuthUrl(provider, state));
}
```

## Security Implementation

### Middleware Integration

```typescript
// middleware/auth.ts
export async function authMiddleware(request: Request) {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Try local bypass first
  let payload = LocalBypassAuth.verifyLocalToken(token);
  
  // Fall back to cloud verification
  if (!payload) {
    payload = await verifyCloudToken(token);
  }
  
  if (!payload) {
    return new Response('Invalid token', { status: 401 });
  }
  
  // Verify required scopes for current route
  const requiredScopes = getRequiredScopes(request.url);
  if (!hasRequiredScopes(payload.scopes, requiredScopes)) {
    return new Response('Insufficient permissions', { status: 403 });
  }
  
  // Add user context to request
  request.user = payload;
  return null; // Continue processing
}
```

### Scope Enforcement

```typescript
// lib/auth/scopes.ts
export function hasRequiredScopes(
  userScopes: SecurityScope[],
  requiredScopes: SecurityScope[]
): boolean {
  // Super admin access
  if (userScopes.includes('*')) return true;
  
  return requiredScopes.every(scope => 
    userScopes.includes(scope) || 
    hasWildcardScope(userScopes, scope)
  );
}

function hasWildcardScope(userScopes: SecurityScope[], required: SecurityScope): boolean {
  const [category] = required.split(':');
  return userScopes.some(scope => scope === `${category}:*`);
}
```

## API Integration

### Route Protection

```typescript
// app/api/v1/reviews/route.ts
export async function POST(request: Request) {
  // Auth middleware automatically runs
  const user = request.user as JWTPayload;
  
  // Check specific scope
  if (!hasRequiredScopes(user.scopes, ['review:create'])) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // Process review creation
  const review = await createReview({
    ...await request.json(),
    userId: user.userId,
    orgId: user.orgId
  });
  
  return NextResponse.json({ success: true, data: review });
}
```

### Client-Side Integration

```typescript
// components/AuthProvider.tsx
interface AuthContextType {
  user: JWTPayload | null;
  login: (provider?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasScope: (scope: SecurityScope) => boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(null);
  
  const hasScope = useCallback((scope: SecurityScope) => {
    return user?.scopes.includes('*') || 
           user?.scopes.includes(scope) || 
           false;
  }, [user]);
  
  const login = useCallback(async (provider?: string) => {
    if (process.env.NODE_ENV === 'development') {
      // Local bypass for development
      const localUser = {
        id: 'dev-user',
        email: 'dev@readylayer.local',
        role: 'admin'
      };
      
      const token = LocalBypassAuth.createLocalToken(localUser);
      localStorage.setItem('readylayer_token', token);
      
      const payload = LocalBypassAuth.verifyLocalToken(token);
      setUser(payload);
    } else {
      // Cloud OAuth flow
      window.location.href = `/api/auth/oauth?provider=${provider || 'github'}`;
    }
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, login, logout, hasScope }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Configuration

### Environment Variables

```bash
# Local Development (default)
READYLAYER_MODE=local
JWT_LOCAL_SECRET=your-local-secret-key

# Cloud Deployment
READYLAYER_MODE=cloud
JWT_CLOUD_SECRET=your-cloud-secret-key
OAUTH_GITHUB_CLIENT_ID=your-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-github-client-secret

# Security Settings
JWT_EXPIRY_SECONDS=86400
SESSION_TIMEOUT_MS=86400000
SCOPE_CACHE_TTL=300
```

### Type Definitions

```typescript
// types/auth.ts
export interface AuthConfig {
  mode: 'local' | 'cloud';
  jwtSecret: string;
  issuer: string;
  audience: string;
  tokenExpiry: number;
  sessionTimeout: number;
  oauthProviders: OAuthProvider[];
}

export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  scopeMap: Record<string, SecurityScope[]>;
}

export interface LocalUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'readonly';
  orgId?: string;
}
```

## Security Best Practices

1. **Token Revocation**: Implement JWT denylist for immediate revocation
2. **Scope Validation**: Always verify scopes on both client and server
3. **Secret Rotation**: Regular JWT secret rotation with overlap period
4. **Rate Limiting**: Auth endpoint rate limiting to prevent brute force
5. **Audit Logging**: All auth events logged with correlation IDs
6. **Secure Storage**: Tokens stored in httpOnly cookies or secure localStorage
7. **CORS Configuration**: Proper CORS setup for cross-origin requests
8. **Input Validation**: All auth inputs validated with Zod schemas

## Migration Guide

### Local to Cloud Migration

1. **Backup Local Data**: Export SQLite database
2. **User Account Creation**: Create cloud accounts for local users
3. **Permission Mapping**: Map local roles to cloud scopes
4. **Data Import**: Migrate data to PostgreSQL
5. **Token Invalidation**: Invalidate all local tokens
6. **Verification**: Test authentication flows end-to-end

### Testing

```typescript
// __tests__/auth.test.ts
describe('JWT Authentication', () => {
  it('should create and verify local tokens', () => {
    const user = { id: 'test', email: 'test@local', role: 'user' };
    const token = LocalBypassAuth.createLocalToken(user);
    const payload = LocalBypassAuth.verifyLocalToken(token);
    
    expect(payload).toBeTruthy();
    expect(payload.userId).toBe(user.id);
    expect(payload.isLocalBypass).toBe(true);
  });
  
  it('should enforce scope restrictions', () => {
    const userScopes = ['repo:read', 'review:read'];
    expect(hasRequiredScopes(userScopes, ['repo:read'])).toBe(true);
    expect(hasRequiredScopes(userScopes, ['repo:write'])).toBe(false);
    expect(hasRequiredScopes(['*'], ['system:admin'])).toBe(true);
  });
});
```

This authentication system provides a secure, scalable foundation for ReadyLayer's local-first architecture while maintaining seamless cloud integration capabilities.