export function formatValueForPercentage(a: number, b: number) {
  return !!a ? ((a / b) * 100).toFixed(0) : 0;
}
