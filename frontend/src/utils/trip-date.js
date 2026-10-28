// Trip dates are calendar dates, not instants in the browser's timezone.
export function vietnamToday(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

export function calendarDate(value) {
  const day = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const parsed = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : '';
}

export function formatTripDate(value, options = {}) {
  const day = calendarDate(value);
  return day ? new Date(`${day}T00:00:00.000Z`).toLocaleDateString('vi-VN', { ...options, timeZone: 'UTC' }) : '—';
}
