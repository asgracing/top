// ASG SR is independent of ACC SA and ACC Racecraft (RC).
export const HOURLY_MINIMUM_SR = 3.3;

export function hourlySrRequirement(eventOrServer = {}) {
  const server = eventOrServer?.server ?? eventOrServer;
  for (const key of ['sr_requirement', 'internal_sr_requirement', 'safety_rating_asg_requirement', 'asg_sr_requirement']) {
    const raw = server?.[key];
    if (raw == null || raw === '' || typeof raw === 'boolean') continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0 && value <= 10) return Math.max(HOURLY_MINIMUM_SR, value);
  }
  return HOURLY_MINIMUM_SR;
}
