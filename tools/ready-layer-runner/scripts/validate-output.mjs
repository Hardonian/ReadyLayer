import { readFile } from 'node:fs/promises';

const schemaPath = process.argv[2];
const outputPath = process.argv[3];

if (!schemaPath || !outputPath) {
  console.error('Usage: node validate-output.mjs <schemaPath> <outputPath>');
  process.exit(2);
}

const schema = JSON.parse(await readFile(schemaPath, 'utf-8'));
const output = JSON.parse(await readFile(outputPath, 'utf-8'));
const errors = validateSchema(schema, output);

if (errors.length > 0) {
  console.error('Schema validation failed:');
  for (const error of errors) {
    console.error(`- ${error.path} ${error.message}`);
  }
  process.exit(1);
}

console.log('Schema validation passed.');

function validateSchema(schema, data, path = '/') {
  const errors = [];
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
    const record = data;
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
      errors.push(...validateSchema(schema.items, item, `${path}${index}/`));
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
