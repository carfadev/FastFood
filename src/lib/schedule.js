export function colombiaTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '00';
  return { hour: Number(get('hour')), minute: Number(get('minute')) };
}

export function isBranchWithinSchedule(branch, date = new Date()) {
  if (branch?.open_time && branch?.close_time) {
    const { hour, minute } = colombiaTimeParts(date);
    const now = hour * 60 + minute;
    const open = toMinutes(branch.open_time);
    const close = toMinutes(branch.close_time);
    if (open === close) return true;
    if (open < close) return now >= open && now < close;
    return now >= open || now < close;
  }
  return branch?.is_open !== false;
}

export function toMinutes(value) {
  if (typeof value !== 'string') return 0;
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}
