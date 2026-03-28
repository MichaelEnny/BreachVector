export const DAILY_SCAN_LIMIT = 8;

export function getRemainingDailyScans(count: number) {
  return Math.max(DAILY_SCAN_LIMIT - count, 0);
}
