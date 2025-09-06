// Mon-based period helpers for: weekly, fortnight, monthly, yearly
// We always return { start: Date, end: Date, key: string } where end is exclusive.

const clampToMidnight = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const nextMonday = (d) => {
  // Return Monday of the week that contains d (Mon-based).
  const x = clampToMidnight(d);
  const day = x.getDay(); // 0 Sun ... 6 Sat
  const offset = (day === 0 ? -6 : 1 - day); // shift so Monday is start
  const mon = new Date(x);
  mon.setDate(x.getDate() + offset);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatKey(prefix, d) {
  // YYYY-MM-DD (start date)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${prefix}:${y}-${m}-${dd}`;
}

export function getPeriod(schedule, refDate = new Date()) {
  const s = (schedule || "weekly").toLowerCase();

  if (s === "weekly") {
    const start = nextMonday(refDate);
    const end = addDays(start, 7);
    return { start, end, key: formatKey("W", start), schedule: "weekly" };
  }

  if (s === "fortnight" || s === "fortnightly") {
    // Anchor to the Monday of the week; group two weeks.
    const mon = nextMonday(refDate);
    // If the ISO week number is odd → start is that Monday; if even → previous Monday - 7
    const weekIndex = getIsoWeekIndex(mon); // starting at 1
    const start = (weekIndex % 2 === 1) ? mon : addDays(mon, -7);
    const end = addDays(start, 14);
    return { start, end, key: formatKey("F", start), schedule: "fortnight" };
  }

  if (s === "monthly") {
    const d = clampToMidnight(refDate);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end, key: formatKey("M", start), schedule: "monthly" };
  }

  // yearly (default)
  const d = clampToMidnight(refDate);
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear() + 1, 0, 1);
  return { start, end, key: formatKey("Y", start), schedule: "yearly" };
}

export function isInRange(ts, { start, end }) {
  const t = typeof ts === "number" ? ts : new Date(ts).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function weekNumberMonBased(d = new Date()) {
  // ISO-like week number (Mon-based)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday in current week decides the year.
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const dayDiff = (date - firstThursday) / 86400000;
  return 1 + Math.floor(dayDiff / 7);
}

function getIsoWeekIndex(d = new Date()) {
  return weekNumberMonBased(d);
}