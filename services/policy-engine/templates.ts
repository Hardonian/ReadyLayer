/**
 * Policy Engine Templates
 *
 * Pre-built policy templates for common compliance standards:
 * - OWASP Top 10
 * - PCI-DSS
 * - HIPAA
 * - SOC 2
 */

import { logger } from '@/observability/logging';

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'compliance' | 'quality' | 'performance';
  rules: Array<{
    id: string;
    name: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    pattern: string;
    remediation: string;
  }>;
  minCoverage: number;
  enforcementLevel: 'required' | 'recommended' | 'optional';
}

/**
 * OWASP Top 10 Policy Template
 */
export const owaspTop10Template: PolicyTemplate = {
  id: 'owasp-top-10',
  name: 'OWASP Top 10',
  description: 'OWASP Top 10 Web Application Security Risks',
  category: 'security',
  rules: [
    {
      id: 'a01-injection',
      name: 'Injection Prevention',
      description: 'Prevent SQL injection, NoSQL injection, and OS command injection',
      severity: 'critical',
      pattern: '(SQLQuery|NoSQLQuery|exec|eval)\\s*\\(\\s*.*\\$|`.*\\$',
      remediation:
        'Use parameterized queries and prepared statements. Never concatenate user input into queries.',
    },
    {
      id: 'a02-auth',
      name: 'Authentication & Session Management',
      description: 'Implement strong authentication and secure session handling',
      severity: 'critical',
      pattern:
        '(password|credential)\\s*=\\s*[\'"]|session\\.destroy\\s*\\(\\s*\\)|hardcoded.*secret',
      remediation:
        'Use secure session management, enforce password policies, implement MFA.',
    },
    {
      id: 'a03-sensitive-data',
      name: 'Sensitive Data Exposure',
      description: 'Protect sensitive data in transit and at rest',
      severity: 'critical',
      pattern: '(password|api_key|secret|token)\\s*=\\s*[\'"][^\'"]*[\'"]',
      remediation:
        'Encrypt sensitive data, use HTTPS, implement proper access controls.',
    },
    {
      id: 'a04-xxe',
      name: 'XML External Entity (XXE)',
      description: 'Prevent XML External Entity attacks',
      severity: 'high',
      pattern: 'parseXML|XMLParser|DOCTYPE',
      remediation:
        'Disable XML external entity processing and DTD processing.',
    },
    {
      id: 'a05-broken-access',
      name: 'Broken Access Control',
      description: 'Implement proper authorization controls',
      severity: 'critical',
      pattern: 'if\\s*\\(\\s*user\\.id\\s*===.*\\)|authorization\\s*:\\s*false',
      remediation:
        'Implement role-based access control and verify permissions on every request.',
    },
    {
      id: 'a06-security-config',
      name: 'Security Misconfiguration',
      description: 'Secure configuration of frameworks and infrastructure',
      severity: 'high',
      pattern: 'debug\\s*:\\s*true|CORS\\s*:\\s*\\*|security\\s*:\\s*false',
      remediation:
        'Disable debug mode in production, restrict CORS, enable security headers.',
    },
    {
      id: 'a07-xss',
      name: 'Cross-Site Scripting (XSS)',
      description: 'Prevent XSS attacks through input validation and output encoding',
      severity: 'high',
      pattern: 'innerHTML\\s*=|dangerouslySetInnerHTML|eval\\s*\\(|new\\s*Function',
      remediation:
        'Use content security policy, validate and sanitize all user inputs.',
    },
    {
      id: 'a08-insecure-deserial',
      name: 'Insecure Deserialization',
      description: 'Prevent arbitrary code execution through deserialization',
      severity: 'high',
      pattern: 'pickle\\.loads|deserialize|JSON\\.parse.*untrusted',
      remediation:
        'Validate and sanitize serialized data before deserialization.',
    },
    {
      id: 'a09-known-vuln',
      name: 'Using Components with Known Vulnerabilities',
      description: 'Keep dependencies up to date',
      severity: 'high',
      pattern: 'dependencies.*vulnerable',
      remediation: 'Regularly update dependencies and perform security audits.',
    },
    {
      id: 'a10-logging',
      name: 'Insufficient Logging and Monitoring',
      description: 'Implement comprehensive logging and monitoring',
      severity: 'medium',
      pattern: 'console\\.log|console\\.error',
      remediation:
        'Use structured logging, implement security event monitoring.',
    },
  ],
  minCoverage: 80,
  enforcementLevel: 'required',
};

/**
 * PCI-DSS Policy Template
 */
export const pciDssTemplate: PolicyTemplate = {
  id: 'pci-dss',
  name: 'PCI-DSS',
  description: 'Payment Card Industry Data Security Standard',
  category: 'compliance',
  rules: [
    {
      id: 'pci-requirement-3',
      name: 'Protect Stored Cardholder Data',
      description: 'Render PAN unreadable anywhere it is stored',
      severity: 'critical',
      pattern: '(card_number|cardNumber|pan)\\s*=\\s*[\'"][0-9]{13,19}[\'"]',
      remediation:
        'Never store full PAN. Use tokenization or encryption.',
    },
    {
      id: 'pci-requirement-4',
      name: 'Protect Transmission of Cardholder Data',
      description: 'Use strong cryptography for data in transit',
      severity: 'critical',
      pattern: 'http://.*card|plaintext.*payment',
      remediation: 'Use TLS 1.2 or higher for all cardholder data transmission.',
    },
    {
      id: 'pci-requirement-6',
      name: 'Secure Development',
      description: 'Implement secure development practices',
      severity: 'high',
      pattern: 'eval|exec|code\\s*injection',
      remediation: 'Use secure coding practices and code review processes.',
    },
    {
      id: 'pci-requirement-8',
      name: 'User Authentication',
      description: 'Assign unique IDs and restrict access',
      severity: 'high',
      pattern: 'password.*default|auth\\s*:\\s*false',
      remediation: 'Implement strong password policies and multi-factor authentication.',
    },
  ],
  minCoverage: 90,
  enforcementLevel: 'required',
};

/**
 * HIPAA Policy Template
 */
export const hipaaTemplate: PolicyTemplate = {
  id: 'hipaa',
  name: 'HIPAA',
  description: 'Health Insurance Portability and Accountability Act',
  category: 'compliance',
  rules: [
    {
      id: 'hipaa-phi-protection',
      name: 'PHI Protection',
      description: 'Protect Protected Health Information',
      severity: 'critical',
      pattern: '(ssn|social.*security|health.*record)\\s*=\\s*[\'"][^\'"]*[\'"]',
      remediation:
        'Encrypt PHI at rest and in transit. Implement access controls.',
    },
    {
      id: 'hipaa-audit-logging',
      name: 'Audit Logging',
      description: 'Maintain comprehensive audit logs',
      severity: 'high',
      pattern: 'audit.*disable|logging.*off',
      remediation: 'Enable and maintain detailed audit logs of PHI access.',
    },
    {
      id: 'hipaa-access-control',
      name: 'Access Control',
      description: 'Implement role-based access controls',
      severity: 'high',
      pattern: 'authorization.*always|access.*check.*false',
      remediation:
        'Implement minimum necessary access principle and role-based access control.',
    },
  ],
  minCoverage: 95,
  enforcementLevel: 'required',
};

/**
 * SOC 2 Policy Template
 */
export const soc2Template: PolicyTemplate = {
  id: 'soc-2',
  name: 'SOC 2',
  description: 'Service Organization Control 2 Framework',
  category: 'compliance',
  rules: [
    {
      id: 'soc2-availability',
      name: 'Availability',
      description: 'System availability and performance controls',
      severity: 'high',
      pattern: 'timeout\\s*:\\s*0|retry.*false',
      remediation: 'Implement proper timeout and retry logic.',
    },
    {
      id: 'soc2-confidentiality',
      name: 'Confidentiality',
      description: 'Data confidentiality controls',
      severity: 'high',
      pattern: 'encrypt.*false|ssl.*disable',
      remediation: 'Enable encryption for all sensitive data.',
    },
    {
      id: 'soc2-integrity',
      name: 'Integrity',
      description: 'Data integrity controls',
      severity: 'high',
      pattern: 'checksum.*false|validation.*skip',
      remediation: 'Implement data integrity checks and validation.',
    },
  ],
  minCoverage: 85,
  enforcementLevel: 'recommended',
};

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): PolicyTemplate | null {
  const templates: Record<string, PolicyTemplate> = {
    'owasp-top-10': owaspTop10Template,
    'pci-dss': pciDssTemplate,
    hipaa: hipaaTemplate,
    'soc-2': soc2Template,
  };

  return templates[templateId] || null;
}

/**
 * Get all templates
 */
export function getAllTemplates(): PolicyTemplate[] {
  return [owaspTop10Template, pciDssTemplate, hipaaTemplate, soc2Template];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: PolicyTemplate['category']
): PolicyTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Validate rule against pattern
 */
export function validateRulePattern(
  code: string,
  rule: PolicyTemplate['rules'][0]
): boolean {
  try {
    const pattern = new RegExp(rule.pattern, 'gi');
    return pattern.test(code);
  } catch (error) {
    logger.error(
      {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error validating rule pattern'
    );
    return false;
  }
}
