# AI Anomaly Detection & Optimization Feature

## Overview

ReadyLayer now emphasizes its ability to detect AI anomalies, drift, context token waste, and repeated mistakes. It provides personalized suggestions for system prompt improvements and model fine-tuning, tailored to developer technical ability and stack.

## Features

### 1. AI Anomaly Detection

The system detects four types of anomalies:

- **Drift**: Code-documentation mismatches detected by Doc Sync
- **Context Slips**: Repeated violations of the same rule indicating AI losing context
- **Hallucinations**: Unusual patterns suggesting AI-generated incorrect code
- **Token Waste**: Inefficient use of context tokens leading to unnecessary costs

### 2. Token Waste Analysis

Tracks and analyzes:
- Total tokens used (input + output)
- Context vs output token breakdown
- Waste percentage and sources
- Trends over time
- Specific waste sources with actionable suggestions

### 3. Repeated Mistake Detection

Identifies patterns where:
- Same rule violations occur multiple times
- Mistakes cluster in specific files
- Patterns suggest systematic issues

Provides suggestions for addressing root causes.

### 4. Optimization Suggestions

Personalized recommendations based on:

#### Developer Technical Level
- **Beginner**: Easy-to-implement system prompt improvements
- **Intermediate**: Structured prompt templates, context optimization
- **Advanced**: RAG integration, dynamic prompt generation
- **Expert**: Continuous fine-tuning pipelines, custom optimization

#### Stack Awareness
- Tailored suggestions for specific tech stacks (React, TypeScript, Node, Python, etc.)
- Stack-specific code examples and patterns

#### LLM Access
- Suggestions adapt based on available LLM providers (OpenAI, Anthropic, self-hosted)
- Fine-tuning suggestions only appear if provider supports it

### 5. Suggestion Types

#### System Prompt Optimization
- **Easy**: Add explicit rule instructions
- **Intermediate**: Structured prompt templates
- **Advanced**: Dynamic prompt generation with RAG

#### Fine-Tuning Recommendations
- **Intermediate**: Fine-tune for specific codebase patterns
- **Advanced**: Continuous fine-tuning pipeline

#### Context Optimization
- **Easy**: Reduce context window size
- **Intermediate**: Code chunking strategies
- **Advanced**: RAG for context retrieval

#### Model Selection
- Recommendations for optimal model choice based on usage patterns

## Implementation

### Database Schema

New models added:
- `AIAnomaly`: Tracks detected anomalies
- `AIOptimizationSuggestion`: Stores personalized suggestions
- `TokenUsage`: Detailed token usage tracking per review/request

### Services

#### `services/ai-anomaly-detection/index.ts`
Main service providing:
- `analyzeRepository()`: Comprehensive analysis of repository
- Anomaly detection algorithms
- Token waste analysis
- Repeated mistake detection
- Suggestion generation engine

### API Endpoints

#### `GET /api/v1/ai-optimization`
Get AI optimization analysis and suggestions
- Query params: `repositoryId`, `organizationId`, `technicalLevel`, `stack`, `llmAccess`
- Returns: Anomalies, token waste analysis, repeated mistakes, suggestions

#### `GET /api/v1/ai-optimization/suggestions`
List saved suggestions
- Query params: `repositoryId`, `organizationId`, `status`, `difficulty`, `type`
- Returns: Paginated list of suggestions

#### `PATCH /api/v1/ai-optimization/suggestions/:id`
Update suggestion status
- Body: `{ status: 'pending' | 'in_progress' | 'completed' | 'dismissed' }`
- Returns: Updated suggestion

### Dashboard Integration

New "AI Optimization Insights" section on dashboard:
- Summary statistics (anomalies, token waste, repeated mistakes, suggestions)
- Top optimization suggestions with difficulty and impact indicators
- Repeated mistakes list
- One-click analysis trigger

### Review Service Integration

Token usage is automatically tracked during code reviews:
- Records input/output tokens per LLM call
- Calculates waste percentage
- Stores in `TokenUsage` table for analysis

## Usage

### For Developers

1. **View Insights**: Navigate to dashboard and click "Analyze AI Usage"
2. **Review Suggestions**: See personalized recommendations based on your codebase
3. **Filter by Difficulty**: Focus on easy wins or advanced optimizations
4. **Track Progress**: Mark suggestions as in-progress or completed

### For Organizations

1. **Organization-Level Analysis**: Analyze across all repositories
2. **Track Token Costs**: Monitor waste and optimize spending
3. **Pattern Detection**: Identify systematic issues across teams
4. **Optimization ROI**: See estimated savings from suggestions

## Benefits

1. **Cost Reduction**: Identify and eliminate token waste
2. **Quality Improvement**: Detect and prevent repeated mistakes
3. **Personalized Guidance**: Suggestions tailored to technical level and stack
4. **Proactive Optimization**: Catch issues before they become expensive
5. **Transparency**: Clear visibility into AI usage patterns

## Future Enhancements

- Real-time anomaly alerts
- Automated suggestion implementation
- Integration with CI/CD for continuous optimization
- Team-level analytics and benchmarking
- Custom suggestion templates
