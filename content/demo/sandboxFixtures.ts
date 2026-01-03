/**
 * Deterministic Sandbox Fixtures
 * 
 * Sample code files for demo mode that always produce consistent results.
 * These fixtures are designed to:
 * - Trigger real findings (security issues, code quality)
 * - Enable test generation
 * - Show doc sync capabilities
 * - Always work without external dependencies
 */

export interface SandboxFile {
  path: string;
  content: string;
  beforeContent: string | null;
}

/**
 * Deterministic sample files for sandbox demo
 * 
 * These files contain intentional issues that will be detected:
 * - SQL injection vulnerability
 * - Hardcoded secrets
 * - Missing error handling
 * - Incomplete API documentation
 */
export const sandboxFiles: SandboxFile[] = [
  {
    path: 'src/auth.ts',
    content: `/**
 * Authentication module
 * 
 * WARNING: This code contains security vulnerabilities for demo purposes
 */

export interface User {
  id: string;
  username: string;
  email: string;
}

const API_KEY = 'sk_live_1234567890abcdef'; // Hardcoded secret - will be detected

export async function login(username: string, password: string): Promise<User | null> {
  // SQL injection vulnerability - will be detected
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
  const result = await db.query(query);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0] as User;
}

export async function getUserById(id: string): Promise<User | null> {
  // Missing input validation - will be detected
  const query = \`SELECT * FROM users WHERE id = '\${id}'\`;
  const result = await db.query(query);
  return result.rows[0] || null;
}
`,
    beforeContent: null,
  },
  {
    path: 'src/api/users.ts',
    content: `/**
 * User API endpoints
 */

import { getUserById } from '../auth';

/**
 * GET /api/users/:id
 * Get user by ID
 */
export async function getUser(id: string) {
  // Missing error handling - will be detected
  const user = await getUserById(id);
  return {
    status: 200,
    body: user,
  };
}

/**
 * POST /api/users
 * Create new user
 */
export async function createUser(data: { username: string; email: string; password: string }) {
  // Missing input validation - will be detected
  const query = \`INSERT INTO users (username, email, password) VALUES ('\${data.username}', '\${data.email}', '\${data.password}')\`;
  await db.query(query);
  
  return {
    status: 201,
    body: { message: 'User created' },
  };
}
`,
    beforeContent: null,
  },
  {
    path: 'src/utils/validation.ts',
    content: `/**
 * Validation utilities
 */

export function validateEmail(email: string): boolean {
  if (!email) return false;
  // Unsafe regex - will be detected
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

export function validatePassword(password: string): boolean {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpper && hasLower && hasNumber;
}
`,
    beforeContent: null,
  },
];

/**
 * Deterministic PR metadata for sandbox runs
 */
export const sandboxPRMetadata = {
  prNumber: 42,
  prSha: 'sandbox_demo_abc123def456',
  prTitle: 'Sandbox Demo: Add user authentication',
  diff: `diff --git a/src/auth.ts b/src/auth.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/auth.ts
@@ -0,0 +1,25 @@
+export async function login(username: string, password: string) {
+  const query = \`SELECT * FROM users WHERE username = '\${username}'\`;
+  return await db.query(query);
+}
`,
};
