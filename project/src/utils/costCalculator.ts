// Claude Sonnet 4 pricing (as of 2025)
const PRICING = {
  INPUT_TOKENS_PER_MILLION: 3.0,
  OUTPUT_TOKENS_PER_MILLION: 15.0,
};

export interface UsageData {
  input_tokens: number;
  output_tokens: number;
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export function calculateCost(usage: UsageData): CostBreakdown {
  const inputCost = (usage.input_tokens / 1_000_000) * PRICING.INPUT_TOKENS_PER_MILLION;
  const outputCost = (usage.output_tokens / 1_000_000) * PRICING.OUTPUT_TOKENS_PER_MILLION;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    inputCost,
    outputCost,
    totalCost,
  };
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// Estimate costs based on content length and operation type
export function estimateCost(contentLength: number, operationType: string): { min: number; max: number; estimate: number } {
  // Rough estimation: ~4 characters per token
  const estimatedInputTokens = Math.ceil(contentLength / 4);

  // Different operations have different output sizes
  const outputTokenMultipliers: Record<string, { min: number; max: number; avg: number }> = {
    extract_idea: { min: 300, max: 600, avg: 450 },
    generate_prd: { min: 2000, max: 4000, avg: 3000 },
    generate_gtm: { min: 1500, max: 3000, avg: 2000 },
    generate_marketing: { min: 1500, max: 3000, avg: 2000 },
  };

  const multiplier = outputTokenMultipliers[operationType] || { min: 500, max: 2000, avg: 1000 };

  const minCost = calculateCost({
    input_tokens: estimatedInputTokens,
    output_tokens: multiplier.min,
  }).totalCost;

  const maxCost = calculateCost({
    input_tokens: estimatedInputTokens,
    output_tokens: multiplier.max,
  }).totalCost;

  const estimate = calculateCost({
    input_tokens: estimatedInputTokens,
    output_tokens: multiplier.avg,
  }).totalCost;

  return { min: minCost, max: maxCost, estimate };
}
