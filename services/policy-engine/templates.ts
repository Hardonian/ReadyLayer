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
 * OWASP Top 10 for LLM Applications (2025/2026 Edition)
 */
export const owaspLlmTop10Template: PolicyTemplate = {
  id: 'owasp-llm-top-10',
  name: 'OWASP LLM Top 10',
  description: 'OWASP Top 10 for Large Language Model & Agent Applications',
  category: 'security',
  rules: [
    {
      id: 'llm01-prompt-injection',
      name: 'Prompt Injection Defense',
      description: 'Mitigate direct and indirect prompt injection attacks against LLM interfaces',
      severity: 'critical',
      pattern: '(raw_prompt|unfiltered_prompt|eval_prompt|dangerouslyExecutePrompt)\\s*\\(|instructions\\s*\\+=\\s*userInput',
      remediation: 'Sanitize external user input, use system message framing, and enforce strict token delimiters.',
    },
    {
      id: 'llm02-sensitive-disclosure',
      name: 'Sensitive Information & PII Disclosure',
      description: 'Prevent leakage of proprietary prompts, training data, or customer PII in LLM completions',
      severity: 'critical',
      pattern: 'return\\s*completion\\.systemPrompt|exposeSystemInstructions|ssn|credit_card|apiKeyInPrompt',
      remediation: 'Implement pre-call redaction filters and post-call completion scanning with ReadyLayer Privacy Guard.',
    },
    {
      id: 'llm03-supply-chain',
      name: 'AI Supply Chain & Package Slopsquatting',
      description: 'Protect against hallucinated packages and unverified model checkpoints',
      severity: 'critical',
      pattern: 'fast-auth|jwt-helper|vault-client|crypto-fast-kit|super-logger',
      remediation: 'Enforce deterministic package verification with ReadyLayer Slopsquatting Guardrail.',
    },
    {
      id: 'llm06-excessive-agency',
      name: 'Excessive Agent Agency & Blast Radius Containment',
      description: 'Restrict autonomous agents from executing unconstrained destructive actions',
      severity: 'critical',
      pattern: 'exec\\s*\\(\\s*agentCommand\\)|allowAllTools\\s*:\\s*true|autoApproveDestructive',
      remediation: 'Enforce ReadyLayer Blast Radius Tiers and dual-custody approval for Tier 0 perimeter changes.',
    },
    {
      id: 'llm08-vector-insecurity',
      name: 'Vector Database & RAG Insecurity',
      description: 'Ensure semantic search embeddings cannot be poisoned or bypass ACLs',
      severity: 'high',
      pattern: 'vectorSearch\\s*\\(.*tenantId\\s*:\\s*null|rawVectorQuery\\s*\\(',
      remediation: 'Filter vector searches by tenant ID and validate document chunk ACLs before retrieval.',
    },
  ],
  minCoverage: 90,
  enforcementLevel: 'required',
};

/**
 * NIST AI Risk Management Framework 1.0 (Generative AI Profile)
 */
export const nistAiRmfTemplate: PolicyTemplate = {
  id: 'nist-ai-rmf',
  name: 'NIST AI RMF (SP 1270)',
  description: 'NIST Artificial Intelligence Risk Management Framework for Generative AI Systems',
  category: 'compliance',
  rules: [
    {
      id: 'nist-govern-1',
      name: 'Governance & Oversight (GOVERN-1)',
      description: 'Ensure organizational risk management processes are established and transparent',
      severity: 'high',
      pattern: 'bypassGovernance|skipAuditLogs|governanceDisabled\\s*:\\s*true',
      remediation: 'Maintain immutable audit records and adhere to enterprise AI risk policies.',
    },
    {
      id: 'nist-map-1',
      name: 'Context & Lineage Mapping (MAP-1)',
      description: 'Track model provenance, prompt hashes, and training data contexts',
      severity: 'high',
      pattern: 'anonymousPrompt|untrackedModelVersion|syntheticDataNoOrigin',
      remediation: 'Generate cryptographic in-toto provenance statements with model version and prompt SHA-256.',
    },
    {
      id: 'nist-measure-1',
      name: 'Deterministic Verification & Measurement (MEASURE-1)',
      description: 'Rigorously measure model output quality, test coverage delta, and regression rates',
      severity: 'high',
      pattern: 'skipTests\\s*:\\s*true|ignoreCoverage|unmeasuredCodeGeneration',
      remediation: 'Enforce deterministic test coverage delta gates (min 80%) before accepting AI code.',
    },
    {
      id: 'nist-manage-1',
      name: 'Risk Treatment & Incident Fallback (MANAGE-1)',
      description: 'Ensure automatic degradation and human escalation pathways for anomalous AI behavior',
      severity: 'critical',
      pattern: 'disableFallback|unhandledAiException|infiniteRetryAgent',
      remediation: 'Implement fail-closed circuit breakers and human-in-the-loop review queues.',
    },
  ],
  minCoverage: 90,
  enforcementLevel: 'required',
};

/**
 * EU AI Act Code Governance Standard (Articles 14 & 50)
 */
export const euAiActTemplate: PolicyTemplate = {
  id: 'eu-ai-act',
  name: 'EU AI Act Compliance',
  description: 'EU Artificial Intelligence Act Human Oversight (Art. 14) and Transparency (Art. 50)',
  category: 'compliance',
  rules: [
    {
      id: 'eu-art14-human-oversight',
      name: 'Human Oversight Dual-Custody (Article 14)',
      description: 'High-risk automated decisions and critical changes must permit human intervention and stop switches',
      severity: 'critical',
      pattern: 'autoDeployNoReview|bypassHumanInTheLoop|disallowHumanOverride',
      remediation: 'Enforce ReadyLayer Dual-Custody sign-off before committing high-risk agent artifacts.',
    },
    {
      id: 'eu-art50-transparency',
      name: 'AI Code Marking & Transparency (Article 50)',
      description: 'AI-generated or modified code must be identifiably marked in machine-readable format',
      severity: 'high',
      pattern: 'hideAiOrigin|stripProvenanceHeader|falsifyAuthorship',
      remediation: 'Attach verifiable in-toto attestation and CycloneDX AIBOM headers to all generated PRs.',
    },
  ],
  minCoverage: 95,
  enforcementLevel: 'required',
};

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): PolicyTemplate | null {
  const templates: Record<string, PolicyTemplate> = {
    'owasp-top-10': owaspTop10Template,
    'owasp-llm-top-10': owaspLlmTop10Template,
    'pci-dss': pciDssTemplate,
    hipaa: hipaaTemplate,
    'soc-2': soc2Template,
    'nist-ai-rmf': nistAiRmfTemplate,
    'eu-ai-act': euAiActTemplate,
  };

  return templates[templateId] || null;
}

/**
 * Get all templates
 */
export function getAllTemplates(): PolicyTemplate[] {
  return [
    owaspTop10Template,
    owaspLlmTop10Template,
    pciDssTemplate,
    hipaaTemplate,
    soc2Template,
    nistAiRmfTemplate,
    euAiActTemplate,
  ];
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
