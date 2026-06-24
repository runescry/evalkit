export function formatCostUsd(totalCost: number): string {
  if (totalCost > 0 && totalCost < 0.0001) {
    return `$${totalCost.toFixed(6)}`;
  }
  return `$${totalCost.toFixed(4)}`;
}
