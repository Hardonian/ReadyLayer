'use client'

import { useMemo, useState } from 'react';
import runnerOutputSchema from '@/tools/ready-layer-runner/schemas/runner_output.schema.json';

type RunnerOutput = {
  schema_version: string;
  tool_version: string;
  summary: {
    pass: boolean;
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
    duration_seconds: number;
  };
  changed_files: string[];
  check_results: Array<{
    name: string;
    category: string;
    status: string;
    exit_code: number;
    duration_seconds: number;
    stdout_path: string;
    stderr_path: string;
    artifacts: string[];
  }>;
  evidence_manifest: {
    input_hashes: Record<string, string>;
    output_hashes: Record<string, string>;
  };
  error_classification: string;
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

export default function RunnerImportPage(): React.JSX.Element {
  const [output, setOutput] = useState<RunnerOutput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filename, setFilename] = useState<string>('');

  const statusLabel = useMemo(() => {
    if (!output) return 'Awaiting import';
    return output.summary.pass ? 'Pass' : 'Fail';
  }, [output]);

  const handleFile = async (file: File) => {
    setFilename(file.name);
    setErrors([]);
    setOutput(null);

    const text = await file.text();
    try {
      const json = JSON.parse(text) as unknown;
      const validationErrors = validateSchema(runnerOutputSchema as unknown as SchemaNode, json);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map((error) => `${error.path} ${error.message}`));
        return;
      }
      setOutput(json as RunnerOutput);
    } catch (error) {
      setErrors([`Invalid JSON: ${(error as Error).message}`]);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Runner Import</p>
        <h1 className="text-3xl font-semibold text-foreground">ReadyLayer Runner Results</h1>
        <p className="text-base text-muted-foreground">
          Import a <code>runner_output.json</code> file to visualize results locally. This page runs entirely in your
          browser and does not require authentication.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground" htmlFor="runner-output">
            Runner Output JSON
          </label>
          <input
            id="runner-output"
            type="file"
            accept="application/json"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
          {filename && <p className="text-xs text-muted-foreground">Loaded: {filename}</p>}
          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-semibold">Schema validation errors</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`text-2xl font-semibold ${output?.summary.pass ? 'text-emerald-500' : 'text-rose-500'}`}>
                {statusLabel}
              </p>
            </div>
            <div className="flex flex-col text-sm text-muted-foreground">
              <span>Schema version: {output?.schema_version ?? '—'}</span>
              <span>Tool version: {output?.tool_version ?? '—'}</span>
            </div>
          </div>

          {output && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Checks</p>
                <p className="text-lg font-semibold text-foreground">
                  {output.summary.passed_checks}/{output.summary.total_checks} passed
                </p>
                <p className="text-xs text-muted-foreground">Failed: {output.summary.failed_checks}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Duration</p>
                <p className="text-lg font-semibold text-foreground">{output.summary.duration_seconds.toFixed(2)}s</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase text-muted-foreground">Error classification</p>
                <p className="text-lg font-semibold text-foreground">{output.error_classification}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {output && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Checks</h2>
            <div className="mt-4 space-y-4">
              {output.check_results.map((check) => (
                <div key={`${check.name}-${check.category}`} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.category}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        check.status === 'pass'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>Exit code: {check.exit_code}</p>
                    <p>Duration: {check.duration_seconds.toFixed(2)}s</p>
                    <p>Stdout: {check.stdout_path}</p>
                    <p>Stderr: {check.stderr_path}</p>
                    {check.artifacts.length > 0 && (
                      <p>Artifacts: {check.artifacts.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Changed files</h2>
            {output.changed_files.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No changed files detected.</p>
            ) : (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {output.changed_files.map((file) => (
                  <li key={file}>{file}</li>
                ))}
              </ul>
            )}
            <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>
                Log files and artifacts are referenced by relative path. If you have the evidence bundle, unzip it next to
                this JSON file to review logs locally.
              </p>
            </div>
          </div>
        </section>
      )}
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
