/** Small "working hours / off hours" note for a city, based on the real local time. Weekdays 09:00 to 18:00; weekend days differ by country. */
const WEEKEND: Record<string, string[]> = {
  'Europe/Helsinki': ['Sat', 'Sun'],
  'Asia/Dhaka': ['Fri', 'Sat']
};

function localParts(tz: string, now: Date) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: tz }).format(now));
  const minute = Number(new Intl.DateTimeFormat('en-GB', { minute: '2-digit', timeZone: tz }).format(now));
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(now);
  return { hour, minute, weekday };
}

export function isWorkingNow(tz: string, now: Date = new Date()): boolean {
  const { hour, weekday } = localParts(tz, now);
  return !(WEEKEND[tz] ?? ['Sat', 'Sun']).includes(weekday) && hour >= 9 && hour < 18;
}

/** Whole hours Dhaka is ahead of Helsinki right now (4 in winter, 3 in Finnish summer time). */
export function hoursAhead(now: Date = new Date()): number {
  const a = localParts('Europe/Helsinki', now);
  const b = localParts('Asia/Dhaka', now);
  return Math.round((((b.hour * 60 + b.minute) - (a.hour * 60 + a.minute) + 1440) % 1440) / 60);
}

export function WorkStatus({ tz }: { tz: string }) {
  const working = isWorkingNow(tz);
  return (
    <span className="work-status-wrap">
      <span className={`work-status ${working ? 'is-working' : 'is-off'}`}>
        <span className="work-dot" aria-hidden="true" />
        {working ? 'Working hours' : 'Off hours'}
      </span>
    </span>
  );
}
