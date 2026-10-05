/** Normalize common CI coverage artifacts into a stable shape. */
export async function parseCoverageArtifact(blob: Blob): Promise<Record<string, unknown> | null> {
  const text = new TextDecoder().decode(await blob.arrayBuffer()).trim();
  if (!text) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to LCOV parsing.
  }

  if (!text.includes('SF:') || !text.includes('LF:')) return null;
  const sumLcov = (prefix: string): { total: number; covered: number; percentage: number } => {
    const total = [...text.matchAll(new RegExp(`^${prefix}F:(\\d+)$`, 'gm'))]
      .reduce((sum, match) => sum + Number(match[1]), 0);
    const covered = [...text.matchAll(new RegExp(`^${prefix}H:(\\d+)$`, 'gm'))]
      .reduce((sum, match) => sum + Number(match[1]), 0);
    return { total, covered, percentage: total > 0 ? (covered / total) * 100 : 0 };
  };

  return {
    lines: sumLcov('L'),
    functions: sumLcov('FN'),
    branches: sumLcov('BR'),
  };
}
