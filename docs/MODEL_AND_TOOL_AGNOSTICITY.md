# Model & Tool Agnosticity

**Last Updated:** 2026-01-24
**Purpose:** Define ReadyLayer's independence from specific AI models, LLM providers, and development tools

---

## Philosophy

**ReadyLayer treats AI output as untrusted input.**

We intentionally do NOT lock users into:
- Specific LLM providers (OpenAI, Anthropic, etc.)
- Specific AI coding assistants (Copilot, Cursor, Claude, etc.)
- Specific model families or versions
- Specific IDEs or editors
- Specific CI/CD vendors

**Why?** Governance tooling must be **model-agnostic** and **tool-agnostic**. Your choice of AI assistance should not determine your governance infrastructure.

---

## Core Principle: AI Output is Untrusted Input

ReadyLayer does NOT care **how** code was written. Whether by:
- Human developer
- GitHub Copilot
- Cursor AI
- Claude Code
- GPT-4 via API
- Local open-source LLM
- Future AI tools that don't exist yet

**All code undergoes identical governance checks.**

### Why This Matters

```
Traditional Approach (WRONG):
├── Human-written code → Light review
├── AI-generated code → Heavy scrutiny
└── Specific AI tool → Custom rules

ReadyLayer Approach (RIGHT):
├── ANY code → Same deterministic checks
├── Source-agnostic governance
└── Tool-independent enforcement
```

---

## LLM Provider Agnosticity

### What ReadyLayer Does NOT Assume

**We do NOT assume OpenAI.**

ReadyLayer's governance features (when using LLM-enhancement) work with:

✅ **OpenAI** (GPT-4, GPT-3.5-turbo)
✅ **Anthropic** (Claude 3 Opus, Sonnet, Haiku)
✅ **OpenCode** (Stable baseline models)
✅ **OpenRouter** (Multi-provider routing)
✅ **Any OpenAI-compatible API**
✅ **Local models** (Ollama, LM Studio, etc.)

### Architecture: Provider Abstraction

```typescript
// services/llm/index.ts (lines 36-39)
export interface LLMProvider {
  name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
```

**All providers implement the same interface.** ReadyLayer doesn't care about implementation details.

### Adding a New LLM Provider

```typescript
// Example: Adding Cohere support
class CohereProvider implements LLMProvider {
  name = 'cohere';

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Call Cohere API
    // Return standardized LLMResponse
  }
}

// Register provider
this.providers.set('cohere', new CohereProvider());
```

**No changes to core governance logic required.**

### Provider Selection Strategy

ReadyLayer selects providers based on **configuration**, not hardcoded logic:

```typescript
// services/llm/index.ts (lines 556-566)
let providerName = this.defaultProvider;
if (request.model?.includes('claude')) {
  providerName = 'anthropic';
} else if (request.model?.includes('opencode')) {
  providerName = 'opencode';
}

const provider = this.providers.get(providerName);
if (!provider) {
  throw new Error(`Provider ${providerName} not available`);
}
```

**Fallback Mechanism:**

```typescript
// services/llm/index.ts (lines 577-584)
try {
  const response = await provider.complete(request);
  return response;
} catch (_error) {
  // If primary provider fails, try fallback
  if (providerName !== this.defaultProvider &&
      this.providers.has(this.defaultProvider)) {
    const fallbackProvider = this.providers.get(this.defaultProvider)!;
    return fallbackProvider.complete(request);
  }
  throw _error;
}
```

### LLM Usage is Optional

**Critical: ReadyLayer's core governance does NOT require LLMs.**

| Feature | Requires LLM? | Fallback Behavior |
|---------|---------------|-------------------|
| **Security scanning** | ❌ No | Regex patterns, AST analysis (deterministic) |
| **Secret detection** | ❌ No | Regex patterns (always deterministic) |
| **Test coverage enforcement** | ❌ No | Coverage report parsing |
| **Documentation validation** | ❌ No | AST diff analysis |
| **Policy evaluation** | ❌ No | Rule engine (fully deterministic) |
| **Test generation suggestions** | ✅ Optional | Skipped if LLM unavailable |
| **Code explanation** | ✅ Optional | Returns basic static analysis |

**LLMs enhance, but never gate, governance.**

---

## Tool Agnosticity

### AI Coding Assistants

ReadyLayer does NOT integrate with specific coding assistants. It operates **downstream** in CI/CD:

```
Developer writes code (with ANY tool)
    ↓
    [GitHub Copilot / Cursor / Claude / manual]
    ↓
Code committed to git
    ↓
Pull request created
    ↓
ReadyLayer runs (CI/CD)
    ↓
Source-agnostic governance
```

**Why this matters:**
- Developers can switch AI tools without changing governance
- No vendor lock-in to specific coding assistants
- Works with tools that don't exist yet

### IDE Independence

**We do NOT assume VS Code.**

ReadyLayer operates via:
- **CLI** (works in any editor)
- **GitHub Action** (editor-agnostic)
- **Docker** (editor-agnostic)
- **API** (programmable interface)

**Planned integrations** (thin wrappers, not dependencies):
- VS Code extension (Q1 2026)
- IntelliJ plugin (Q2 2026)
- Vim plugin (Q2 2026)
- Emacs integration (Q3 2026)

**Core logic remains editor-independent.**

### CI/CD Platform Independence

**We do NOT assume GitHub Actions.**

ReadyLayer runs on:
- GitHub Actions
- GitLab CI
- Bitbucket Pipelines
- Jenkins
- CircleCI
- Travis CI
- Any CI with Docker support

**Platform-specific integrations are adapters, not core logic.**

---

## Model Governance Without Model Lock-In

### The Problem ReadyLayer Solves

**Anti-pattern:** Governance tied to specific models

```yaml
# ❌ BAD: Hard dependency on specific model
governance:
  model: gpt-4-turbo-2024-04-09
  provider: openai
  # What happens when GPT-5 is released?
  # What if OpenAI changes pricing?
  # What if you want Claude instead?
```

**ReadyLayer's approach:**

```yaml
# ✅ GOOD: Category-based configuration
governance:
  llm_categories:
    security_analysis: tier-1  # Any capable model
    test_generation: tier-2    # Mid-range model
    code_explanation: tier-3   # Basic model

  provider_preference:
    - anthropic  # Try Claude first
    - openai     # Fallback to OpenAI
    - opencode   # Fallback to baseline
```

### Provider Configuration

ReadyLayer uses **ProviderConfig** model to allow per-organization LLM settings:

```prisma
// prisma/schema.prisma
model ProviderConfig {
  id             String   @id @default(cuid())
  organizationId String
  provider       String   // openai, anthropic, opencode
  config         Json     // API keys, endpoints, model preferences
  isDefault      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(...)
}
```

**This enables:**
- Organization-level provider selection
- API key rotation without code changes
- Multi-provider strategies (primary + fallback)
- Cost optimization (use cheaper models for non-critical tasks)

---

## Security: Treating AI Output as Untrusted

### Pre-LLM Redaction

**Before any code is sent to an LLM, it is redacted:**

```typescript
// services/llm/index.ts (lines 520-532)
async complete(request: LLMRequest): Promise<LLMResponse> {
  // SECURITY: Validate that prompt doesn't contain unredacted secrets
  const { isRedactedSafe } = await import('../../lib/secrets/redaction');
  if (!isRedactedSafe(request.prompt)) {
    logger.error(
      { organizationId: request.organizationId },
      'CRITICAL: Unredacted secrets detected in LLM prompt - blocking request'
    );
    throw new Error(
      'Security violation: Unredacted secrets detected in prompt. ' +
      'All code must be redacted before LLM calls.'
    );
  }
  // ... continue
}
```

**Detection patterns:**
- AWS keys (`AKIA[0-9A-Z]{16}`)
- Private keys (`-----BEGIN .* PRIVATE KEY-----`)
- API tokens (`sk-[a-zA-Z0-9]{32,}`)
- Passwords in code
- Email addresses (PII)

**Reference:** `lib/secrets/redaction.ts`

### LLM Responses are Suggestions, Not Decisions

**Critical distinction:**

| Component | Trust Level | Enforcement |
|-----------|-------------|-------------|
| **Policy Engine** | Trusted | Blocking decisions |
| **Static Analysis** | Trusted | Blocking decisions |
| **LLM Suggestions** | Untrusted | Non-blocking feedback |

```typescript
// Deterministic (blocking)
const securityIssues = await staticAnalyzer.scan(code);
if (securityIssues.critical.length > 0) {
  return { blocked: true, reason: securityIssues };
}

// AI-enhanced (non-blocking)
const llmSuggestions = await llm.analyzeSecurity(redactedCode);
return {
  blocked: false,  // LLM never blocks
  suggestions: llmSuggestions
};
```

---

## Determinism vs. AI Enhancement

### Deterministic Core

**Same inputs + same policy = same outputs**

```typescript
// ✅ Deterministic (temperature = 0, caching enabled)
const result = await llm.complete({
  prompt: redactedCode,
  model: 'gpt-4-turbo-preview',
  temperature: 0,  // Deterministic
  cache: true      // Same input → cached response
});
```

**Caching strategy:**

```typescript
// services/llm/index.ts (lines 592-615)
private async getCachedResponse(request: LLMRequest): Promise<LLMResponse | null> {
  const model = request.model || 'gpt-4-turbo-preview';
  const temperature = request.temperature ?? 0;

  // P0: Only cache deterministic requests (temperature = 0)
  if (temperature !== 0) {
    return null;
  }

  const cacheKey = generateCacheKey(request.prompt, model, temperature);
  const cached = await getCached(cacheKey);

  if (cached) {
    return {
      content: cached.content,
      model: cached.model,
      tokensUsed: cached.tokensUsed,
      cost: cached.cost,
      cached: true,  // Indicates deterministic result
    };
  }

  return null;
}
```

### AI Enhancement Layer

**Non-deterministic LLM calls are clearly marked:**

```typescript
// Code explanation (non-blocking, non-deterministic)
const explanation = await llm.complete({
  prompt: redactedCode,
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,  // Creative, non-deterministic
  cache: false       // Never cached
});

// This is metadata, not a governance decision
return { explanation: explanation.content };
```

---

## Cost Optimization: Model Tiers

### Category-Based Model Selection

ReadyLayer can route different tasks to different model tiers:

| Task Category | Model Tier | Example Models | Cost |
|---------------|------------|----------------|------|
| **Security scanning** | Tier 1 (capable) | GPT-4, Claude Opus | High |
| **Test generation** | Tier 2 (mid-range) | GPT-3.5-turbo, Claude Sonnet | Medium |
| **Code formatting** | Tier 3 (basic) | OpenCode baseline, Haiku | Free/Low |

**Configuration:**

```yaml
# .readylayer/llm-config.yml
model_routing:
  security_critical:
    providers: [anthropic, openai]
    models: [claude-3-opus-20240229, gpt-4-turbo-preview]
    temperature: 0
    cache: true

  test_suggestions:
    providers: [openai, anthropic]
    models: [gpt-3.5-turbo, claude-3-sonnet-20240229]
    temperature: 0.3
    cache: false

  explanations:
    providers: [opencode, openai]
    models: [opencode-baseline-v1, gpt-3.5-turbo]
    temperature: 0.7
    cache: false
```

### Cost Tracking

**Per-organization cost tracking:**

```typescript
// services/llm/index.ts (lines 154-187)
private async trackCost(
  organizationId: string,
  model: string,
  tokens: number,
  cost: number
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.costTracking.upsert({
    where: {
      organizationId_date_service_provider: {
        organizationId,
        date: today,
        service: 'llm',
        provider: 'openai',  // or anthropic, opencode
      },
    },
    update: {
      amount: { increment: cost },
      units: { increment: tokens },
      metadata: { model },
    },
    create: {
      organizationId,
      date: today,
      service: 'llm',
      provider: 'openai',
      amount: cost,
      units: tokens,
      metadata: { model },
    },
  });
}
```

---

## Migration Path: Switching Providers

### Zero Downtime Provider Switch

**Scenario:** Organization wants to switch from OpenAI to Anthropic

```bash
# 1. Add new provider credentials
ANTHROPIC_API_KEY=sk-ant-xxx

# 2. Update default provider
DEFAULT_LLM_PROVIDER=anthropic

# 3. Restart service
docker restart readylayer

# 4. Verify new provider
curl -X POST /api/v1/reviews \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"provider": "anthropic", ...}'

# 5. Remove old credentials (optional)
unset OPENAI_API_KEY
```

**No policy changes required. No code changes required.**

### Multi-Provider Strategy

**Run multiple providers simultaneously:**

```yaml
# Organization A: Use OpenAI (cost-optimized)
providers:
  - name: openai
    models: [gpt-3.5-turbo]
    budget: $100/month

# Organization B: Use Anthropic (quality-optimized)
providers:
  - name: anthropic
    models: [claude-3-opus-20240229]
    budget: unlimited

# Organization C: Use both with failover
providers:
  - name: anthropic
    priority: 1
  - name: openai
    priority: 2  # Fallback if Anthropic fails
```

---

## Future-Proofing

### What Happens When GPT-5 / Claude 4 / New Model is Released?

**ReadyLayer's response: Nothing.**

New models work automatically if they're API-compatible:

```typescript
// No code changes needed
const result = await llm.complete({
  model: 'gpt-5-turbo',  // New model
  prompt: redactedCode,
  temperature: 0
});
```

**Configuration update (not code change):**

```yaml
# .readylayer/llm-config.yml
models:
  tier_1:
    - gpt-5-turbo          # Add new model
    - claude-4-opus         # Add new model
    - gpt-4-turbo-preview  # Keep existing
```

### What About Proprietary Models?

**ReadyLayer works with closed and open models:**

✅ **OpenAI** (proprietary, API)
✅ **Anthropic** (proprietary, API)
✅ **Llama 3** (open weights, local)
✅ **Mixtral** (open weights, local)
✅ **DeepSeek** (open weights, local)
✅ **Any future model with compatible API**

**Example: Running local Llama 3 via Ollama**

**Status:** Planned for Q2 2026. CLI configuration support exists (`cli/readylayer-cli.ts:282-289`), provider implementation in progress.

```typescript
// Future implementation:
class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private baseUrl = 'http://localhost:11434';

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: request.model || 'llama3',
        prompt: request.prompt,
        stream: false
      })
    });

    const data = await response.json();
    return {
      content: data.response,
      model: 'llama3',
      tokensUsed: data.eval_count || 0,
      cost: 0,  // Local model, no cost
      cached: false
    };
  }
}
```

**No changes to governance logic needed. Just add the provider.**

---

## Anti-Patterns We Avoid

### ❌ Hardcoded Model Names

**Bad:**
```typescript
// ❌ Don't do this
const model = 'gpt-4-turbo-2024-04-09';  // What if deprecated?
```

**Good:**
```typescript
// ✅ Do this instead
const model = config.models.tier1 || 'gpt-4-turbo-preview';
```

### ❌ Provider-Specific Logic in Core

**Bad:**
```typescript
// ❌ Don't do this
if (provider === 'openai') {
  return await callOpenAI(prompt);
} else if (provider === 'anthropic') {
  return await callAnthropic(prompt);
}
```

**Good:**
```typescript
// ✅ Do this instead
const llmProvider = providers.get(providerName);
return await llmProvider.complete(request);
```

### ❌ Blocking on LLM Availability

**Bad:**
```typescript
// ❌ Don't do this
const securityIssues = await llm.scanForIssues(code);
if (securityIssues.length > 0) {
  return { blocked: true };  // What if LLM is down?
}
```

**Good:**
```typescript
// ✅ Do this instead
// Deterministic scan (always works)
const staticIssues = await staticAnalyzer.scan(code);
if (staticIssues.critical.length > 0) {
  return { blocked: true };
}

// LLM enhancement (optional)
try {
  const llmSuggestions = await llm.scanForIssues(redactedCode);
  return { blocked: false, suggestions: llmSuggestions };
} catch (error) {
  // LLM failed, continue without it
  return { blocked: false, suggestions: [] };
}
```

---

## Testing Model Agnosticity

### Verification Matrix

We test ReadyLayer with multiple providers:

| Provider | Models Tested | Status |
|----------|---------------|--------|
| **OpenAI** | gpt-4-turbo-preview, gpt-3.5-turbo | ✅ Production |
| **Anthropic** | claude-3-opus, claude-3-sonnet, claude-3-haiku | ✅ Production |
| **OpenCode** | opencode-baseline-v1 | ✅ Production |
| **OpenRouter** | Multiple via routing | 📋 Planned Q2 2026 |
| **Ollama (local)** | llama3, mixtral | 🔄 In Progress (CLI config ready, provider pending) |

### Provider Failover Tests

```typescript
// tests/llm/provider-failover.test.ts
describe('LLM Provider Failover', () => {
  it('should fallback to secondary provider if primary fails', async () => {
    // Mock primary provider failure
    mockProvider('anthropic').mockRejectedValue(new Error('API error'));
    mockProvider('openai').mockResolvedValue({ content: 'success' });

    const result = await llm.complete({
      prompt: 'test',
      organizationId: 'org-123'
    });

    expect(result.content).toBe('success');
    expect(mockProvider('openai')).toHaveBeenCalled();
  });

  it('should work without any LLM if core scan is sufficient', async () => {
    // Disable all LLM providers
    process.env.OPENAI_API_KEY = '';
    process.env.ANTHROPIC_API_KEY = '';

    const result = await reviewGuard.scan(code);

    expect(result.blocked).toBe(true);  // Static analysis still works
    expect(result.llmSuggestions).toBe(undefined);  // No LLM, no suggestions
  });
});
```

---

## Roadmap: Expanding Model Support

### Q1 2026
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Anthropic (Claude 3 family)
- ✅ OpenCode (baseline model)

### Q2 2026
- 🔄 Ollama integration (CLI config exists, provider implementation in progress)
- 📋 OpenRouter support (multi-provider routing) - PLANNED
- 🔄 Azure OpenAI support

### Q3 2026
- 🔄 Google Gemini support
- 🔄 Cohere support
- 🔄 LM Studio integration

### Q4 2026
- 🔄 Model performance benchmarking
- 🔄 Automatic model selection based on task
- 🔄 Cost optimization recommendations

---

## FAQs

### Can I use ReadyLayer without any LLM?

**Yes.** Core governance (security scanning, test enforcement, doc validation) works without LLMs. LLMs only provide optional enhancements.

### What if my preferred model isn't supported?

**Contribute an adapter.** If the model has an OpenAI-compatible API, it takes ~50 lines of code. See `services/llm/index.ts` for examples.

### How do I switch providers without downtime?

**Add new provider credentials, update config, restart.** No code changes. No policy migration.

### Can I use multiple providers simultaneously?

**Yes.** Configure provider priorities and fallback chains. ReadyLayer automatically routes requests.

### What if a provider changes their API?

**Provider-specific changes are isolated.** Update the provider adapter, not core logic. Other providers unaffected.

### Do you send my code to third-party LLMs?

**Only if you configure LLM providers.** Self-hosted mode with no LLM configuration = zero external API calls. All code is redacted before transmission.

---

## Related Documents

- [Stack Agnosticity](./STACK_AGNOSTICITY.md) - Platform, CI/CD, database independence
- [Governance Invariants](./GOVERNANCE_INVARIANTS.md) - What ReadyLayer enforces
- [Security](../SECURITY.md) - Security model and threat model
- [Architecture](./architecture/deep-dives.md) - Technical deep dives

---

<div align="center">

**ReadyLayer is model-agnostic by design.**

No vendor lock-in. No model assumptions. Your AI stack, your choice.

</div>
