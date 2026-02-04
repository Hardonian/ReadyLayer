import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readmePath = path.join(repoRoot, 'README.md');
const contributingPath = path.join(repoRoot, 'CONTRIBUTING.md');

const readme = readFile(readmePath);
const contributing = fs.existsSync(contributingPath) ? readFile(contributingPath) : '';

const packageJson = JSON.parse(readFile(path.join(repoRoot, 'package.json')));
const packageScripts = packageJson.scripts ?? {};

const failures = [];

checkNoTodo('README.md', readme);
if (contributing) {
  checkNoTodo('CONTRIBUTING.md', contributing);
}

const quickStart = extractSection(readme, 'Quick Start');
if (!quickStart) {
  failures.push('README.md is missing a "## Quick Start" section.');
} else {
  const commands = extractCommandsFromCodeBlocks(quickStart);
  validateCommands(commands, packageScripts, failures);
}

validateLinks(readme, 'README.md', failures);
if (contributing) {
  validateLinks(contributing, 'CONTRIBUTING.md', failures);
}

if (failures.length > 0) {
  console.error('Documentation verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Documentation verification passed.');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function checkNoTodo(label, contents) {
  if (/\bTODO\b/i.test(contents)) {
    failures.push(`${label} contains a TODO marker.`);
  }
}

function extractSection(contents, heading) {
  const headingRegex = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'm');
  const match = contents.match(headingRegex);
  if (!match || match.index === undefined) {
    return '';
  }
  const startIndex = match.index + match[0].length;
  const rest = contents.slice(startIndex);
  const nextHeadingMatch = rest.match(/^##\s+/m);
  return nextHeadingMatch ? rest.slice(0, nextHeadingMatch.index) : rest;
}

function extractCommandsFromCodeBlocks(section) {
  const commands = [];
  const blockRegex = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g;
  let match;
  while ((match = blockRegex.exec(section)) !== null) {
    const lines = match[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      commands.push(trimmed);
    }
  }
  return commands;
}

function validateCommands(commands, scripts, failuresList) {
  const allowedStandalone = new Set(['git', 'cd', 'cp', 'mkdir', 'echo']);
  for (const command of commands) {
    const [bin] = command.split(/\s+/);
    if (bin === 'npm') {
      validateNpmCommand(command, scripts, failuresList);
      continue;
    }
    if (allowedStandalone.has(bin)) {
      if (bin === 'cp') {
        validateCopyCommand(command, failuresList);
      }
      continue;
    }
    failuresList.push(`Unsupported command in Quick Start: "${command}".`);
  }
}

function validateNpmCommand(command, scripts, failuresList) {
  if (command === 'npm install' || command === 'npm ci') {
    return;
  }
  const runMatch = command.match(/^npm\s+run\s+([\w:-]+)$/);
  if (runMatch) {
    const scriptName = runMatch[1];
    if (!scripts[scriptName]) {
      failuresList.push(`npm script "${scriptName}" referenced in Quick Start but not found in package.json.`);
    }
    return;
  }
  failuresList.push(`Unsupported npm command in Quick Start: "${command}".`);
}

function validateCopyCommand(command, failuresList) {
  const parts = command.split(/\s+/).slice(1);
  if (parts.length < 2) {
    failuresList.push(`cp command in Quick Start is missing paths: "${command}".`);
    return;
  }
  const source = stripQuotes(parts[0]);
  const sourcePath = path.resolve(repoRoot, source);
  if (!fs.existsSync(sourcePath)) {
    failuresList.push(`cp source file not found: ${source}`);
  }
}

function validateLinks(contents, label, failuresList) {
  const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(contents)) !== null) {
    const rawLink = match[1].split('#')[0];
    if (!rawLink || rawLink.startsWith('http') || rawLink.startsWith('mailto:') || rawLink.startsWith('#')) {
      continue;
    }
    const cleaned = rawLink.replace(/^\.?\//, '');
    const linkPath = path.resolve(repoRoot, cleaned);
    if (!fs.existsSync(linkPath)) {
      failuresList.push(`${label} references missing path: ${rawLink}`);
    }
  }
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
