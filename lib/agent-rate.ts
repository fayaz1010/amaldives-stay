/**
 * B2B agent pricing: sell rate = rack total × (1 + markupPercent/100).
 * Positive markup = agent pays above rack; negative = discount off rack.
 */
export function agentRateFromRack(rackTotal: number, markupPercent: number): number {
  if (!Number.isFinite(rackTotal) || rackTotal < 0) return 0;
  if (!Number.isFinite(markupPercent)) return rackTotal;
  return Math.round(rackTotal * (1 + markupPercent / 100) * 100) / 100;
}

export function agentNightlyFromRack(rackNightly: number, markupPercent: number): number {
  return agentRateFromRack(rackNightly, markupPercent);
}
