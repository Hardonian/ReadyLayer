import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const binary = resolveBinary('readylayer-sarif', 'READYLAYER_SARIF_BIN');
const args = ensureOutputArgs(argv);

const result = spawnSync(binary, args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const summaryPath = getArgValue(args, '--summary');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
validateJson(
  summary,
  new URL('../contracts/findings_summary.schema.json', import.meta.url)
);

const sarifPath = getArgValue(args, '--sarif');
const sarif = JSON.parse(readFileSync(sarifPath, 'utf8'));
if (sarif.version !== '2.1.0') {
  throw new Error(`Unexpected SARIF version: ${sarif.version}`);
}

function resolveBinary(name, envVar) {
  const override = process.env[envVar];
  if (override) {
    return override;
  }
  const ext = process.platform === 'win32' ? '.exe' : '';
  const candidates = [
    path.resolve('target', 'release', `${name}${ext}`),
    path.resolve('target', 'debug', `${name}${ext}`)
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Unable to locate ${name} binary. Build it or set ${envVar}.`);
}

function ensureOutputArgs(args) {
  const normalized = [...args];
  if (!hasArg(normalized, '--sarif')) {
    normalized.push('--sarif', path.join(tmpdir(), 'readylayer.sarif'));
  }
  if (!hasArg(normalized, '--summary')) {
    normalized.push('--summary', path.join(tmpdir(), 'readylayer.summary.json'));
  }
  return normalized;
}

function hasArg(args, key) {
  return args.some((arg) => arg === key || arg.startsWith(`${key}=`));
}

function getArgValue(args, key) {
  const directIndex = args.indexOf(key);
  if (directIndex !== -1 && args[directIndex + 1]) {
    return args[directIndex + 1];
  }
  const withEquals = args.find((arg) => arg.startsWith(`${key}=`));
  if (withEquals) {
    return withEquals.split('=')[1];
  }
  throw new Error(`Missing ${key} argument`);
}

function validateJson(data, schemaUrl) {
  const schemaPath = fileURLToPath(schemaUrl);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const errors = validateSchema(schema, data);
  if (errors.length > 0) {
    throw new Error(`Schema validation failed: ${errors.join('; ')}`);
  }
}

function validateSchema(schema, data, currentPath = '/') {
  const errors = [];
  const expectedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (schema.enum && typeof data === 'string' && !schema.enum.includes(data)) {
    errors.push(`${currentPath} must be one of ${schema.enum.join(', ')}`);
    return errors;
  }

  if (expectedTypes.length > 0) {
    const matches = expectedTypes.some((type) => matchesType(type, data));
    if (!matches) {
      errors.push(`${currentPath} must be ${expectedTypes.join(' or ')}`);
      return errors;
    }
  }

  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data;
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in record)) {
          errors.push(`${currentPath} missing required property ${key}`);
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(record)) {
        if (!schema.properties[key]) {
          errors.push(`${currentPath}${key}/ unexpected property`);
        }
      }
    }
    if (schema.properties) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in record) {
          errors.push(...validateSchema(childSchema, record[key], `${currentPath}${key}/`));
        }
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(data) && schema.items) {
    data.forEach((item, index) => {
      errors.push(...validateSchema(schema.items, item, `${currentPath}${index}/`));
    });
  }

  return errors;
}

function matchesType(type, value) {
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
