# ReadyLayer Authentication & Security API

> **JWT-based Authentication** • **Configurable Scopes** • **Local Development Bypass**

## 🔐 Authentication Model

ReadyLayer uses JSON Web Tokens (JWT) with role-based access control and configurable security scopes.

### Token Structure
```typescript
interface JWTPayload {
  sub: string;           // User UUID
  email: string;        // User email
  role: 'admin' | 'user' | 'readonly';
  scopes: string[];      // Security scopes (see below)
  org_id: string;       // Organization UUID
  iat: number;          // Issued at
  exp: number;          // Expires at (24h default)
}
```

## 🛡️ Security Scopes

Scopes provide fine-grained access control. Users only get access to what they need.

| Scope | Description | Required By |
|-------|-------------|--------------|
| `read:repos` | View repositories | All users |
| `write:repos` | Create/edit repositories | Admin, Maintainer |
| `delete:repos` | Delete repositories | Admin |
| `read:policies` | View governance policies | All users |
| `write:policies` | Create/edit policies | Admin, Maintainer |
| `delete:policies` | Delete policies | Admin |
| `read:users` | View user management | Admin |
| `write:users` | Manage users | Admin |
| `admin:all` | Full system access | Admin only |

### Scope Examples
```typescript
// Read-only user
const readOnlyUser = ['read:repos', 'read:policies'];

// Maintainer with repository access
const maintainer = ['read:repos', 'write:repos', 'read:policies', 'write:policies'];

// Full admin
const admin = ['admin:all'];
```

## 🔑 Authentication Endpoints

### POST `/api/v1/auth/login`
```typescript
interface LoginRequest {
  email: string;
  password: string;
  scopes?: string[];  // Optional: request specific scopes
}

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
      scopes: string[];
    };
    expiresIn: number;
  };
  error?: string;
}
```

### POST `/api/v1/auth/refresh`
```typescript
interface RefreshRequest {
  token: string;  // Current valid token
}

interface RefreshResponse {
  success: boolean;
  data?: {
    token: string;
    expiresIn: number;
  };
  error?: string;
}
```

### POST `/api/v1/auth/logout`
```typescript
interface LogoutRequest {
  token: string;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
}
```

## 🔒 Local Development Bypass

For local development, ReadyLayer provides secure bypass options:

### Environment Variables
```bash
# Enable local bypass (development only)
LOCAL_DEV_BYPASS=true

# Optional: Default user role
LOCAL_DEV_ROLE=admin

# Optional: Default scopes
LOCAL_DEV_SCOPES="admin:all"
```

### Bypass Headers
```typescript
// Add to local requests
headers: {
  'x-local-dev-bypass': 'true',
  'x-local-dev-role': 'admin',
  'x-local-dev-scopes': 'admin:all'
}
```

## 🛡️ Security Best Practices

### Token Management
```typescript
// Store tokens securely (httpOnly cookies)
httpOnly: true,
secure: process.env.NODE_ENV === 'production',
sameSite: 'strict',

// Implement token rotation
tokenRotationEnabled: true,
maxTokenAge: 24 * 60 * 60 * 1000, // 24 hours

// Validate on every request
const isValidToken = await validateJWT(token, requiredScopes);
```

### Scope Validation
```typescript
// Middleware scope checking
function validateScopes(userScopes: string[], requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => userScopes.includes(scope));
}

// API endpoint protection
export async function GET(req: Request) {
  const token = extractToken(req);
  const user = await decodeJWT(token);
  
  // Require read:repos and read:policies
  if (!validateScopes(user.scopes, ['read:repos', 'read:policies'])) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  
  // Proceed with request
}
```

### Security Headers
```typescript
// Apply to all API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
};
```

## 🔐 JWT Implementation

### Token Generation
```typescript
import jwt from 'jsonwebtoken';

function generateToken(user: User, scopes: string[]): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    scopes: scopes,
    org_id: user.orgId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256'
  });
}
```

### Token Validation
```typescript
function validateToken(token: string): Promise<JWTUser | null> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    }) as JWTPayload;

    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      scopes: decoded.scopes,
      orgId: decoded.org_id
    };
  } catch (error) {
    return null;
  }
}
```

## 🌐 OAuth Integration

ReadyLayer supports OAuth2 integration for external services:

### GitHub OAuth
```typescript
// Authorization URL
const authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
  client_id: process.env.GITHUB_CLIENT_ID,
  redirect_uri: `${process.env.APP_URL}/api/v1/auth/github/callback`,
  scope: 'repo user:email',
  state: generateState() // CSRF protection
})}`;

// Callback handler
export async function GET(req: Request) {
  const { code, state } = await req.json();
  
  // Validate state parameter
  if (!validateState(state)) {
    return Response.json({ error: 'Invalid state' }, { status: 400 });
  }

  // Exchange code for access token
  const githubUser = await exchangeCodeForUser(code);
  
  // Create or update user in database
  const user = await upsertUser(githubUser);
  
  // Generate ReadyLayer token
  const token = generateToken(user, getDefaultScopes(user.role));
  
  return Response.json({
    success: true,
    data: { token, user: sanitizeUser(user) }
  });
}
```

## 📊 Monitoring & Audit

### Security Events
```typescript
interface SecurityEvent {
  type: 'login' | 'logout' | 'token_refresh' | 'permission_denied';
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

// Log security events
async function logSecurityEvent(event: SecurityEvent) {
  await db.securityEvent.create({
    data: event
  });
  
  // Send to external monitoring (optional)
  if (process.env.WEBHOOK_URL) {
    await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }
}
```

### Rate Limiting
```typescript
// Implement user-based rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, limit: number, window: number): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.set(userId, { count: 1, resetTime: now + window });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}
```

## 🚀 Security Checklist

### Authentication
- [x] JWT-based stateless authentication
- [x] Configurable security scopes
- [x] Local development bypass
- [x] Token expiration and refresh
- [x] Secure token storage (httpOnly cookies)

### Authorization  
- [x] Role-based access control
- [x] Scope-based permissions
- [x] Middleware protection
- [x] Audit logging

### OAuth Integration
- [x] GitHub OAuth2 support
- [x] CSRF protection with state
- [x] Secure callback handling
- [x] User provisioning

### Security Headers
- [x] XSS protection
- [x] Clickjacking protection  
- [x] Content type protection
- [x] Transport security
- [x] CSP headers

---

ReadyLayer's authentication system provides enterprise-grade security while maintaining developer productivity with local bypasses for development workflows.