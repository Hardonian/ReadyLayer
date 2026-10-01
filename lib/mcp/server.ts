import * as readline from 'node:readline';
import {
  evaluateAgentBlastRadius,
  inspectPackage,
  scanDiffForSlopsquatting,
  generateInTotoAttestation,
} from '../agent-guard';
import { getAllTemplates } from '../../services/policy-engine/templates';

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: boolean;
  };
}

interface StdioLike {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
}

function sendResponse(
  out: NodeJS.WritableStream,
  id: string | number | null | undefined,
  result?: unknown,
  error?: JsonRpcError,
): void {
  if (typeof id === 'undefined') {
    return;
  }

  out.write(`${JSON.stringify({ jsonrpc: '2.0', id, ...(error ? { error } : { result }) })}\n`);
}

function getTools(): ToolDefinition[] {
  return [
    {
      name: 'readylayer.health',
      description: 'Returns ReadyLayer MCP health metadata and active enterprise engine status.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.echo',
      description: 'Echoes a provided message for connectivity validation.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.preflight_check',
      description:
        'Preflight check for AI agents. Evaluates diffs and modified files against enterprise blast radius tiers, package slopsquatting risks, and policy constraints before writing or committing code.',
      inputSchema: {
        type: 'object',
        properties: {
          filePaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files modified or created by the agent',
          },
          diff: {
            type: 'string',
            description: 'Unified diff content representing the agent changes',
          },
        },
        required: ['filePaths'],
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.scan_package',
      description:
        'Inspects a package dependency for AI hallucination / slopsquatting risks, typosquatting, and unverified package stems.',
      inputSchema: {
        type: 'object',
        properties: {
          packageName: { type: 'string', description: 'Name of the package to verify' },
          ecosystem: {
            type: 'string',
            enum: ['npm', 'pypi', 'crates', 'go'],
            description: 'Target package ecosystem (default: npm)',
          },
        },
        required: ['packageName'],
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.check_blast_radius',
      description:
        'Assesses the security blast radius of file modifications (Tier 0 Critical Perimeter to Tier 3 Safe). Detects if autonomous merge is blocked and dual-custody approval is needed.',
      inputSchema: {
        type: 'object',
        properties: {
          filePaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of repository file paths to evaluate',
          },
        },
        required: ['filePaths'],
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.attest_provenance',
      description:
        'Generates a cryptographically signed in-toto v1.0 and SLSA-compliant attestation statement for an AI agent session.',
      inputSchema: {
        type: 'object',
        properties: {
          commitSha: { type: 'string', description: 'Commit SHA or working tree identifier' },
          diffContent: { type: 'string', description: 'Full unified diff of the agentic change' },
          agentId: { type: 'string', description: 'Identifier of the calling agent (e.g. claude-code, cursor, devin)' },
          model: { type: 'string', description: 'Underlying foundation model used' },
          prompts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Prompts issued to the agent to be hashed into provenance',
          },
        },
        required: ['commitSha', 'diffContent', 'agentId'],
        additionalProperties: false,
      },
    },
    {
      name: 'readylayer.get_compliance_policies',
      description:
        'Retrieves turn-key enterprise governance policy packs (OWASP LLM Top 10, NIST AI RMF, EU AI Act, SOC 2, HIPAA) so agents can adhere to enterprise guardrails.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['security', 'compliance', 'all'],
            description: 'Filter policies by category',
          },
        },
        additionalProperties: false,
      },
    },
  ];
}

async function callTool(name: string, args?: Record<string, unknown>): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name === 'readylayer.health') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            service: 'readylayer-enterprise-mcp',
            transport: 'stdio',
            capabilities: ['blast_radius', 'slopsquatting_defense', 'in_toto_attestation', 'aibom', 'compliance_policies'],
            version: '2.0.0',
          }),
        },
      ],
    };
  }

  if (name === 'readylayer.echo') {
    const message = typeof args?.message === 'string' ? args.message : '';
    return {
      content: [{ type: 'text', text: message }],
    };
  }

  if (name === 'readylayer.check_blast_radius') {
    const filePaths = Array.isArray(args?.filePaths) ? (args?.filePaths as string[]) : [];
    const evaluation = evaluateAgentBlastRadius(filePaths);
    return {
      content: [{ type: 'text', text: JSON.stringify(evaluation, null, 2) }],
    };
  }

  if (name === 'readylayer.scan_package') {
    const packageName = typeof args?.packageName === 'string' ? args.packageName : '';
    const ecosystem = (args?.ecosystem === 'pypi' ? 'pypi' : 'npm') as 'npm' | 'pypi';
    const result = inspectPackage(packageName, ecosystem);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === 'readylayer.preflight_check') {
    const filePaths = Array.isArray(args?.filePaths) ? (args?.filePaths as string[]) : [];
    const diff = typeof args?.diff === 'string' ? args.diff : '';

    const blastRadius = evaluateAgentBlastRadius(filePaths);
    const slopsquatting = diff ? scanDiffForSlopsquatting(diff) : undefined;

    const blocked = blastRadius.blockedAutonomousMerge || (slopsquatting ? !slopsquatting.passed : false);

    const result = {
      decision: blocked ? 'BLOCKED' : 'APPROVED',
      blastRadius,
      slopsquatting,
      governanceSummary: blocked
        ? 'Preflight check failed: Changes cross enterprise containment boundaries or introduce unverified dependencies.'
        : 'Preflight check passed: Changes within permissible autonomous thresholds.',
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === 'readylayer.attest_provenance') {
    const commitSha = typeof args?.commitSha === 'string' ? args.commitSha : 'HEAD';
    const diffContent = typeof args?.diffContent === 'string' ? args.diffContent : '';
    const agentId = typeof args?.agentId === 'string' ? args.agentId : 'agent';
    const model = typeof args?.model === 'string' ? args.model : undefined;
    const prompts = Array.isArray(args?.prompts) ? (args?.prompts as string[]) : undefined;

    const blastRadius = evaluateAgentBlastRadius([]);
    const attestation = generateInTotoAttestation({
      commitSha,
      diffContent,
      agent: { id: agentId, model, prompts },
      blastRadius,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(attestation, null, 2) }],
    };
  }

  if (name === 'readylayer.get_compliance_policies') {
    const category = typeof args?.category === 'string' ? args.category : 'all';
    let templates = getAllTemplates();
    if (category !== 'all') {
      templates = templates.filter((t) => t.category === category);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(templates, null, 2) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handleMessage(streams: StdioLike, message: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(message) as JsonRpcRequest;
  } catch {
    streams.stderr.write('Invalid JSON message received\n');
    return;
  }

  if (request.jsonrpc !== '2.0' || !request.method) {
    sendResponse(streams.stdout, request.id, undefined, {
      code: -32600,
      message: 'Invalid Request',
    });
    return;
  }

  if (request.method === 'initialize') {
    sendResponse(streams.stdout, request.id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'readylayer-enterprise-mcp',
        version: '2.0.0',
      },
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
    });
    return;
  }

  if (request.method === 'tools/list') {
    sendResponse(streams.stdout, request.id, { tools: getTools() });
    return;
  }

  if (request.method === 'tools/call') {
    const params = request.params ?? {};
    const name = typeof params.name === 'string' ? params.name : '';
    const args = typeof params.arguments === 'object' && params.arguments && !Array.isArray(params.arguments)
      ? params.arguments as Record<string, unknown>
      : {};

    try {
      const result = await callTool(name, args);
      sendResponse(streams.stdout, request.id, result);
    } catch (error) {
      sendResponse(streams.stdout, request.id, undefined, {
        code: -32602,
        message: error instanceof Error ? error.message : 'Tool call failed',
      });
    }
    return;
  }

  sendResponse(streams.stdout, request.id, undefined, {
    code: -32601,
    message: `Method not found: ${request.method}`,
  });
}

export async function startMcpServer(streams: StdioLike = process): Promise<void> {
  const rl = readline.createInterface({ input: streams.stdin, crlfDelay: Infinity });

  const shutdown = (): void => {
    rl.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }
    await handleMessage(streams, line);
  }
}
