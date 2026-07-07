export const PRESENCE_ACTIVITY_STORAGE_KEY = 'presence_activity_events';
export const LAB_ATTENDANCE_STORAGE_KEY = 'lab_attendance';
export const LAB_DAYS_OFF_STORAGE_KEY = 'lab_days_off';

export const WORKDAY_START_MINUTES = 8 * 60 + 30;
export const WORKDAY_END_MINUTES = 18 * 60 + 30;
export const WORKDAY_HOURS = 10;
export const HEATMAP_DAYS = 30;

const ACTIVITY_COLOR_CLASSES = [
  'bg-[#ebedf0]/40',
  'bg-[#9be9a8]',
  'bg-[#40c463]',
  'bg-[#30a14e]',
  'bg-[#216e39]'
];

function safeParseStorage(key, fallback = []) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function toUserId(user) {
  return String(user?.uid || user?.id || user?.cin || user?.email || 'guest');
}

function dateKey(date) {
  return date.toISOString().split('T')[0];
}

function minutesFromDayStart(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getTimestamp(event) {
  return event?.timestamp || event?.createdAt || event?.submittedAt || event?.date;
}

function readDaysOff() {
  const daysOff = safeParseStorage(LAB_DAYS_OFF_STORAGE_KEY, []);
  return new Set(daysOff.map(String));
}

function readAttendance() {
  return safeParseStorage(LAB_ATTENDANCE_STORAGE_KEY, []);
}

function readPresenceActivityEvents() {
  return safeParseStorage(PRESENCE_ACTIVITY_STORAGE_KEY, []);
}

function isSameUser(entry, userId) {
  return String(entry?.userId || entry?.uid || '') === String(userId);
}

function isInsideAttendanceWindow(timestamp, attendance, userId) {
  const actionTime = new Date(timestamp).getTime();
  if (Number.isNaN(actionTime)) return false;

  return attendance.some((entry) => {
    if (entry?.type !== 'in' || !isSameUser(entry, userId)) return false;

    const inTime = new Date(entry.timestamp).getTime();
    const outTime = entry.timestampOut ? new Date(entry.timestampOut).getTime() : Date.now();

    return !Number.isNaN(inTime) &&
      !Number.isNaN(outTime) &&
      actionTime >= inTime &&
      actionTime <= outTime;
  });
}

function isCountableActivity(event, attendance, daysOff, userId) {
  if (!isSameUser(event, userId)) return false;

  const timestamp = getTimestamp(event);
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  if (isWeekend(date) || daysOff.has(dateKey(date))) return false;

  const minutes = minutesFromDayStart(date);
  if (minutes < WORKDAY_START_MINUTES || minutes >= WORKDAY_END_MINUTES) return false;

  return isInsideAttendanceWindow(timestamp, attendance, userId);
}

function buildHeatmapStartDate(today = new Date()) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (HEATMAP_DAYS - 1));
  return start;
}

function getCellDate(startDate, col, row) {
  const cellDate = new Date(startDate);
  cellDate.setDate(startDate.getDate() + col);
  const minutes = WORKDAY_START_MINUTES + row * 60;
  cellDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return cellDate;
}

function activityLevel(count) {
  if (count >= 4) return 4;
  return count;
}

function getAttendanceTimestamp(entry) {
  return entry?.timestamp || entry?.timestampIn || entry?.createdAt || entry?.date;
}

function countServerAttendance(attendance, daysOff, userId) {
  const counts = new Map();

  attendance
    .filter((entry) => isSameUser(entry, userId))
    .forEach((entry) => {
      const timestamp = getAttendanceTimestamp(entry);
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return;
      if (isWeekend(date) || daysOff.has(dateKey(date))) return;

      const minutes = minutesFromDayStart(date);
      if (minutes < WORKDAY_START_MINUTES || minutes >= WORKDAY_END_MINUTES) return;

      const row = Math.floor((minutes - WORKDAY_START_MINUTES) / 60);
      const key = `${dateKey(date)}-${row}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

  return counts;
}

export function createPresenceActivityEvent(user, type, metadata = {}, timestamp = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    userId: toUserId(user),
    type,
    timestamp,
    source: 'frontend-mock',
    ...metadata
  };
}

export function savePresenceActivityEvent(event) {
  const events = readPresenceActivityEvents();
  const updated = [event, ...events];
  localStorage.setItem(PRESENCE_ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function buildPresenceHeatmapCells(user, events = readPresenceActivityEvents(), serverAttendance = null) {
  const userId = toUserId(user);
  const attendance = readAttendance();
  const daysOff = readDaysOff();
  const startDate = buildHeatmapStartDate();

  const counts = Array.isArray(serverAttendance)
    ? countServerAttendance(serverAttendance, daysOff, userId)
    : new Map();

  if (!Array.isArray(serverAttendance)) {
    events
      .filter((event) => isCountableActivity(event, attendance, daysOff, userId))
      .forEach((event) => {
        const date = new Date(getTimestamp(event));
        const row = Math.floor((minutesFromDayStart(date) - WORKDAY_START_MINUTES) / 60);
        const key = `${dateKey(date)}-${row}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
  }

  return Array.from({ length: HEATMAP_DAYS * WORKDAY_HOURS }).map((_, i) => {
    const col = i % HEATMAP_DAYS;
    const row = Math.floor(i / HEATMAP_DAYS);
    const cellDate = getCellDate(startDate, col, row);
    const key = `${dateKey(cellDate)}-${row}`;
    const isClosed = isWeekend(cellDate) || daysOff.has(dateKey(cellDate));
    const count = isClosed ? 0 : (counts.get(key) || 0);
    const level = activityLevel(count);

    return {
      key,
      col,
      row,
      count,
      level,
      colorClass: ACTIVITY_COLOR_CLASSES[level],
      title: `Jour ${col + 1}, Rang ${row + 1}`
    };
  });
}
