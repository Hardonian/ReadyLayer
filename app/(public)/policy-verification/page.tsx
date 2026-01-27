'use client'

import { useMemo, useState } from 'react';
import factsSchema from '@/contracts/policy_facts.schema.json';
import decisionSchema from '@/contracts/policy_decision.schema.json';

type PolicyFacts = {
  schema_version: string;
  tool_versions: Record<string, string>;
  repo?: {
    name?: string | null;
    owner?: string | null;
    url?: string | null;
    default_branch?: string | null;
  } | null;
  diff_summary?: {
    changed_files?: string[];
    languages?: Array<{ name: string; files?: number | null; additions?: number | null; deletions?: number | null }>;
    total_files?: number | null;
    additions?: number | null;
    deletions?: number | null;
  } | null;
  check_results: Array<{ check_id: string; status: string; exit_code?: number | null }>;
  findings: Array<{ rule_id: string; severity: string; category: string; message: string }>;
  risk_signals?: {
    dependency_changes?: boolean | null;
    permission_changes?: boolean | null;
    secrets_detected?: boolean | null;
    binary_changes?: boolean | null;
  } | null;
};

type PolicyDecision = {
  schema_version: string;
  policy_version: string;
  decision: 'allow' | 'warn' | 'block';
  reasons: Array<{ rule_id: string; message: string }>;
  required_actions: string[];
  evidence_hashes?: Record<string, string>;
  deterministic_statement: string;
};

type SchemaNode = {
  type?: string | string[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
  enum?: string[];
  additionalProperties?: boolean;
  minLength?: number;
  minimum?: number;
};

type ValidationError = {
  path: string;
  message: string;
};

export default function PolicyVerificationPage(): React.JSX.Element {
  const [facts, setFacts] = useState<PolicyFacts | null>(null);
  const [decision, setDecision] = useState<PolicyDecision | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [factsFilename, setFactsFilename] = useState('');
  const [decisionFilename, setDecisionFilename] = useState('');

  const statusLabel = useMemo((): string => {
    if (!decision) return 'Awaiting decision';
    if (decision.decision === 'block') return 'Block';
    if (decision.decision === 'warn') return 'Warn';
    return 'Allow';
  }, [decision]);

  const handleFacts = async (file: File): Promise<void> => {
    setFactsFilename(file.name);
    setErrors([]);
    setFacts(null);

    const text = await file.text();
    try {
      const json = JSON.parse(text) as unknown;
      const validationErrors = validateSchema(factsSchema as unknown as SchemaNode, json);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map((error) => `${error.path} ${error.message}`));
        return;
      }
      setFacts(json as PolicyFacts);
    } catch (error) {
      setErrors([`Invalid JSON: ${(error as Error).message}`]);
    }
  };

  const handleDecision = async (file: File): Promise<void> => {
    setDecisionFilename(file.name);
    setErrors([]);
    setDecision(null);

    const text = await file.text();
    try {
      const json = JSON.parse(text) as unknown;
      const validationErrors = validateSchema(decisionSchema as unknown as SchemaNode, json);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map((error) => `${error.path} ${error.message}`));
        return;
      }
      setDecision(json as PolicyDecision);
    } catch (error) {
      setErrors([`Invalid JSON: ${(error as Error).message}`]);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Policy Verification</p>
        <h1 className="text-3xl font-semibold text-foreground">ReadyLayer Policy Decisions</h1>
        <p className="text-base text-muted-foreground">
          Validate policy facts and decisions locally without relying on a server. Upload <code>facts.json</code> and
          <code>decision.json</code> to verify schemas and inspect rationale.
        </p>
      </header>

      <section className="grid gap-6 rounded-2xl border border-border bg-background p-6 shadow-sm md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground" htmlFor="policy-facts">
            Policy Facts JSON
          </label>
          <input
            id="policy-facts"
            type="file"
            accept="application/json"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFacts(file);
              }
            }}
          />
          {factsFilename && <p className="text-xs text-muted-foreground">Loaded: {factsFilename}</p>}
        </div>
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground" htmlFor="policy-decision">
            Policy Decision JSON
          </label>
          <input
            id="policy-decision"
            type="file"
            accept="application/json"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleDecision(file);
              }
            }}
          />
          {decisionFilename && <p className="text-xs text-muted-foreground">Loaded: {decisionFilename}</p>}
        </div>
        {errors.length > 0 && (
          <div className="md:col-span-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-semibold">Schema validation errors</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Decision</p>
              <p
                className={`text-2xl font-semibold ${
                  decision?.decision === 'block'
                    ? 'text-rose-500'
                    : decision?.decision === 'warn'
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                }`}
              >
                {statusLabel}
              </p>
            </div>
            <div className="flex flex-col text-sm text-muted-foreground">
              <span>Facts schema: {facts?.schema_version ?? '—'}</span>
              <span>Decision schema: {decision?.schema_version ?? '—'}</span>
              <span>Policy version: {decision?.policy_version ?? '—'}</span>
            </div>
          </div>

          {decision && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Reasons</p>
                {decision.reasons.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No policy reasons matched.</p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {decision.reasons.map((reason) => (
                      <li key={`${reason.rule_id}-${reason.message}`}>
                        <span className="font-semibold text-foreground">{reason.rule_id}:</span> {reason.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Required actions</p>
                {decision.required_actions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No required actions.</p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {decision.required_actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 md:col-span-2">
                <p className="text-xs uppercase text-muted-foreground">Determinism statement</p>
                <p className="mt-2 text-sm text-muted-foreground">{decision.deterministic_statement}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function validateSchema(schema: SchemaNode, data: unknown, path = '/'): ValidationError[] {
  const errors: ValidationError[] = [];
  const expectedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (schema.enum && typeof data === 'string' && !schema.enum.includes(data)) {
    errors.push({ path, message: `must be one of ${schema.enum.join(', ')}` });
    return errors;
  }

  if (expectedTypes.length > 0) {
    const matches = expectedTypes.some((type) => matchesType(type, data));
    if (!matches) {
      errors.push({ path, message: `must be ${expectedTypes.join(' or ')}` });
      return errors;
    }
  }

  if (schema.type === 'string' && typeof data === 'string' && schema.minLength && data.length < schema.minLength) {
    errors.push({ path, message: `must have at least ${schema.minLength} characters` });
  }

  if ((schema.type === 'number' || schema.type === 'integer') && typeof data === 'number' && schema.minimum !== undefined) {
    if (data < schema.minimum) {
      errors.push({ path, message: `must be >= ${schema.minimum}` });
    }
  }

  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in record)) {
          errors.push({ path, message: `missing required property ${key}` });
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(record)) {
        if (!schema.properties[key]) {
          errors.push({ path: `${path}${key}/`, message: 'unexpected property' });
        }
      }
    }
    if (schema.properties) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in record) {
          errors.push(...validateSchema(childSchema, record[key], `${path}${key}/`));
        }
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(data) && schema.items) {
    data.forEach((item, index) => {
      errors.push(...validateSchema(schema.items as SchemaNode, item, `${path}${index}/`));
    });
  }

  return errors;
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return true;
  }
}
