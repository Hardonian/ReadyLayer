export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'compliance' | 'code-quality' | 'custom';
  rules: PolicyRule[];
  version: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'warn' | 'info';
  description: string;
}

// OWASP Top 10 Template
export const OWASP_TOP_10_TEMPLATE: PolicyTemplate = {
  id: 'owasp-top-10',
  name: 'OWASP Top 10',
  description: 'Security policy based on OWASP Top 10 vulnerabilities',
  category: 'security',
  version: '2021',
  rules: [
    {
      id: 'a01-injection',
      name: 'Prevent SQL Injection',
      pattern: '(query|sql)\\s*=\\s*[\'"`].*(%|\\$).*[\'"`]',
      severity: 'critical',
      action: 'block',
      description: 'Detects potential SQL injection vulnerabilities',
    },
    {
      id: 'a02-authentication',
      name: 'Enforce Authentication',
      pattern: '(password|auth|token)\\s*=\\s*[\'"`]?[^\'"`]*[\'"`]?',
      severity: 'high',
      action: 'warn',
      description: 'Warns about hardcoded credentials',
    },
    {
      id: 'a03-broken-access',
      name: 'Check Access Control',
      pattern: '(admin|root|privileged)\\s*=\\s*(true|1)',
      severity: 'high',
      action: 'warn',
      description: 'Detects potential privilege escalation',
    },
    {
      id: 'a04-insecure-design',
      name: 'Insecure Design Patterns',
      pattern: '(weak|insecure|deprecated)\\s*(crypto|ssl|hash)',
      severity: 'high',
      action: 'warn',
      description: 'Warns about insecure design patterns',
    },
    {
      id: 'a05-vulnerable-components',
      name: 'Check Dependencies',
      pattern: 'package\\.json|requirements\\.txt|Gemfile',
      severity: 'medium',
      action: 'info',
      description: 'Reminds to check dependency versions',
    },
    {
      id: 'a06-api-security',
      name: 'API Security',
      pattern: '(api|endpoint).*[\'"`](http|ftp)[\'"`]',
      severity: 'high',
      action: 'warn',
      description: 'Ensures API endpoints use HTTPS',
    },
    {
      id: 'a07-logging',
      name: 'Logging & Monitoring',
      pattern: 'console\\.(log|debug).*password|secret|token',
      severity: 'high',
      action: 'block',
      description: 'Prevents logging sensitive information',
    },
    {
      id: 'a08-csrm',
      name: 'CSRF Protection',
      pattern: '(post|put|delete).*csrf.*',
      severity: 'medium',
      action: 'warn',
      description: 'Ensures CSRF tokens are validated',
    },
  ],
};

// PCI-DSS Template
export const PCI_DSS_TEMPLATE: PolicyTemplate = {
  id: 'pci-dss',
  name: 'PCI-DSS Compliance',
  description: 'Policy for PCI Data Security Standard compliance',
  category: 'compliance',
  version: '3.2.1',
  rules: [
    {
      id: 'pci-1-firewall',
      name: 'Network Segmentation',
      pattern: '(firewall|port|network)\\s*=\\s*',
      severity: 'high',
      action: 'warn',
      description: 'Review network configuration',
    },
    {
      id: 'pci-2-defaults',
      name: 'No Default Credentials',
      pattern: '(admin|root)\\s*:\\s*(admin|password|123)',
      severity: 'critical',
      action: 'block',
      description: 'Blocks use of default credentials',
    },
    {
      id: 'pci-3-cardholder',
      name: 'Cardholder Data Protection',
      pattern: '(card|pan|cvv|ssn)\\s*=\\s*',
      severity: 'critical',
      action: 'block',
      description: 'Prevents hardcoding payment card data',
    },
    {
      id: 'pci-4-encryption',
      name: 'Encryption in Transit',
      pattern: '(http|ftp)://(?!localhost)',
      severity: 'high',
      action: 'block',
      description: 'Requires HTTPS for all connections',
    },
    {
      id: 'pci-6-secure-dev',
      name: 'Secure Development',
      pattern: '(eval|exec|system)\\s*\\(',
      severity: 'high',
      action: 'warn',
      description: 'Warns about code execution risks',
    },
    {
      id: 'pci-10-logging',
      name: 'Logging & Monitoring',
      pattern: 'log.*=.*null|log.*disabled',
      severity: 'high',
      action: 'warn',
      description: 'Ensures logging is enabled',
    },
  ],
};

// HIPAA Template
export const HIPAA_TEMPLATE: PolicyTemplate = {
  id: 'hipaa',
  name: 'HIPAA Compliance',
  description: 'Policy for Health Insurance Portability and Accountability Act compliance',
  category: 'compliance',
  version: '1.0',
  rules: [
    {
      id: 'hipaa-1-phi',
      name: 'Protected Health Information',
      pattern: '(ssn|patient|health|medical)\\s*=\\s*',
      severity: 'critical',
      action: 'block',
      description: 'Prevents exposure of PHI data',
    },
    {
      id: 'hipaa-2-encryption',
      name: 'Encryption Required',
      pattern: '(encrypt|aes|rsa)',
      severity: 'high',
      action: 'warn',
      description: 'Ensures encryption standards',
    },
    {
      id: 'hipaa-3-access',
      name: 'Access Control',
      pattern: '(authorize|authenticate)\\s*=\\s*',
      severity: 'high',
      action: 'warn',
      description: 'Verifies access controls',
    },
    {
      id: 'hipaa-4-audit',
      name: 'Audit Controls',
      pattern: 'audit.*log|access.*log',
      severity: 'medium',
      action: 'info',
      description: 'Requires audit logging',
    },
  ],
};

// Code Quality Template
export const CODE_QUALITY_TEMPLATE: PolicyTemplate = {
  id: 'code-quality',
  name: 'Code Quality Standards',
  description: 'Policy for enforcing code quality and best practices',
  category: 'code-quality',
  version: '1.0',
  rules: [
    {
      id: 'cq-1-eslint',
      name: 'ESLint Compliance',
      pattern: '\\.(eslintrc|eslintignore)',
      severity: 'medium',
      action: 'info',
      description: 'Verify ESLint configuration',
    },
    {
      id: 'cq-2-tests',
      name: 'Test Coverage',
      pattern: '\\.(test|spec)\\.ts',
      severity: 'medium',
      action: 'warn',
      description: 'Requires tests for new code',
    },
    {
      id: 'cq-3-types',
      name: 'TypeScript Strict Mode',
      pattern: '"strict"\\s*:\\s*true',
      severity: 'low',
      action: 'warn',
      description: 'Encourages strict mode',
    },
    {
      id: 'cq-4-docs',
      name: 'Documentation',
      pattern: '\\/\\/\\s*TODO|\\/\\/\\s*FIXME',
      severity: 'low',
      action: 'info',
      description: 'Tracks outstanding documentation',
    },
  ],
};

// SOC 2 Template
export const SOC2_TEMPLATE: PolicyTemplate = {
  id: 'soc2',
  name: 'SOC 2 Compliance',
  description: 'Policy for Service Organization Control 2 compliance',
  category: 'compliance',
  version: '1.0',
  rules: [
    {
      id: 'soc2-1-access',
      name: 'Access Control',
      pattern: '(role|permission|access)\\s*=\\s*',
      severity: 'high',
      action: 'warn',
      description: 'Reviews access control implementation',
    },
    {
      id: 'soc2-2-encryption',
      name: 'Data Encryption',
      pattern: '(encrypt|secure|tls|ssl)',
      severity: 'high',
      action: 'warn',
      description: 'Verifies encryption usage',
    },
    {
      id: 'soc2-3-logging',
      name: 'Activity Logging',
      pattern: '(log|audit|track)',
      severity: 'medium',
      action: 'warn',
      description: 'Ensures activity is logged',
    },
    {
      id: 'soc2-4-testing',
      name: 'Change Testing',
      pattern: '\\.(test|spec)',
      severity: 'medium',
      action: 'warn',
      description: 'Requires change testing',
    },
  ],
};

export const POLICY_TEMPLATES = [
  OWASP_TOP_10_TEMPLATE,
  PCI_DSS_TEMPLATE,
  HIPAA_TEMPLATE,
  CODE_QUALITY_TEMPLATE,
  SOC2_TEMPLATE,
];

export function getTemplate(id: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: string
): PolicyTemplate[] {
  return POLICY_TEMPLATES.filter((t) => t.category === category);
}

export function listAllTemplates(): PolicyTemplate[] {
  return POLICY_TEMPLATES;
}
