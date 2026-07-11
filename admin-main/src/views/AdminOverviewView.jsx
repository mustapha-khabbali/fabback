import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { subscribeRealtime } from '../services/realtime';

const MOROCCAN_HOLIDAYS_2026 = [
  { id: 'h1', name: 'Nouvel An', date: '2026-01-01' },
  { id: 'h2', name: 'Manifeste de l\'Indépendance', date: '2026-01-11' },
  { id: 'h3', name: 'Fête du Travail', date: '2026-05-01' },
  { id: 'h4', name: 'Fête du Trône', date: '2026-07-30' },
  { id: 'h5', name: 'Oued Ed-Dahab', date: '2026-08-14' },
  { id: 'h6', name: 'Révolution du Roi et du Peuple', date: '2026-08-20' },
  { id: 'h7', name: 'Fête de la Jeunesse', date: '2026-08-21' },
  { id: 'h8', name: 'Marche Verte', date: '2026-11-06' },
  { id: 'h9', name: 'Fête de l\'Indépendance', date: '2026-11-18' },
  { id: 'h10', name: 'Aïd al-Fitr (Est.)', date: '2026-03-20' },
  { id: 'h11', name: 'Aïd al-Adha (Est.)', date: '2026-05-27' },
  { id: 'h12', name: '1er Moharram (Est.)', date: '2026-06-16' },
];

const LAB_TIME_ZONE = 'Africa/Casablanca';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'stagiaire', label: 'Stagiaire' },
  { value: 'formateur', label: 'Formateur' },
  { value: 'administrateur', label: 'Administrateur' },
  { value: 'visiteur', label: 'Visiteur' }
];

const PRESENCE_TYPES_BY_ROLE = {
  all: [
    { value: 'all', label: 'Tous', matches: [] },
    { value: 'event', label: 'Event', matches: ['Event'], requiresEvent: true },
    { value: 'project', label: 'Projet', matches: ['Projet en cours', 'Project'] },
    { value: 'visit_objective', label: 'Objectif de visite', matches: ['Objectif de visite'] }
  ],
  stagiaire: [
    { value: 'all', label: 'Tous', matches: [] },
    { value: 'project', label: 'Projet en cours', matches: ['Projet en cours'] },
    { value: 'information', label: "Demande d'information / Consultation", matches: ["Demande d'information / Consultation"] },
    { value: 'idea', label: "Amélioration / Demande d'idée", matches: ["Amélioration / Demande d'idée"] },
    { value: 'event', label: 'Event', matches: ['Event'], requiresEvent: true },
    { value: 'stage', label: 'Stage', matches: ['Stage'] },
    { value: 'other', label: 'Other', matches: ['Other'] }
  ],
  formateur: [
    { value: 'all', label: 'Tous', matches: [] },
    { value: 'visit_objective', label: 'Objectif de visite', matches: ['Objectif de visite'] },
    { value: 'project', label: 'Project', matches: ['Project'] },
    { value: 'event', label: 'Event', matches: ['Event'], requiresEvent: true }
  ],
  administrateur: [
    { value: 'all', label: 'Tous', matches: [] },
    { value: 'visit_objective', label: 'Objectif de visite', matches: ['Objectif de visite'] },
    { value: 'project', label: 'Project', matches: ['Project'] },
    { value: 'event', label: 'Event', matches: ['Event'], requiresEvent: true }
  ],
  visiteur: [
    { value: 'all', label: 'Tous', matches: [] },
    { value: 'visit_objective', label: 'Objectif de visite', matches: ['Objectif de visite'] },
    { value: 'event', label: 'Event', matches: ['Event'], requiresEvent: true }
  ]
};

function isWeekend(dateStr) {
  // 'T00:00:00' forces local-time parsing: bare 'YYYY-MM-DD' parses as UTC
  // midnight and getDay() could land on the previous day on some devices.
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr) {
  return MOROCCAN_HOLIDAYS_2026.some((holiday) => holiday.date === dateStr);
}

function eachDateInRange(dateFrom, dateTo) {
  const start = safeDate(`${dateFrom}T00:00:00`);
  const end = safeDate(`${dateTo}T00:00:00`);
  if (!start || !end || start > end) return [];

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function roleValue(role) {
  return String(role || 'Stagiaire').trim().toLowerCase();
}

function roleLabel(role) {
  const value = roleValue(role);
  if (value === 'stagiaire') return 'Stagiaire';
  if (value === 'formateur') return 'Formateur';
  if (value === 'administrateur') return 'Administrateur';
  if (value === 'visiteur') return 'Visiteur';
  return role || '—';
}

function presenceOptionByValue(value, role = 'all') {
  const roleOption = (PRESENCE_TYPES_BY_ROLE[role] || []).find((option) => option.value === value);
  if (roleOption) return roleOption;

  return Object.values(PRESENCE_TYPES_BY_ROLE)
    .flat()
    .find((option) => option.value === value) || PRESENCE_TYPES_BY_ROLE.all[0];
}

function isProjectPresence(item) {
  return item?.presenceType === 'Projet en cours' || item?.presenceType === 'Project';
}

function isOtherPresence(item) {
  return item?.presenceType === 'Other';
}

function presenceTypeLabel(item, showDetail = false) {
  if (item?.presenceType === 'Event') return item.eventTitle || 'Event';
  if (isProjectPresence(item) && showDetail) return item.projectTitle || item.projectName || item.detail || item.presenceType;
  if (isOtherPresence(item) && showDetail) return item.detail || item.comment || item.presenceType;
  return item?.presenceType || '—';
}

// Local-clock date parts: for dates parsed from plain 'YYYY-MM-DD' strings
// this round-trips exactly, on any machine timezone (toISOString would shift).
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLabISODate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LAB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const partByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${partByType.year}-${partByType.month}-${partByType.day}`;
}

function currentLabISODate() {
  return toLabISODate(new Date());
}

// Lab events always display in lab time, whatever the viewer's device is set to.
function formatTime(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: LAB_TIME_ZONE, hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function safeDate(dateValue) {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePresenceType(entry) {
  return entry.presenceType || entry.objective || entry.typePresence || '—';
}

function normalizeDashboardJournalRow(entry, index) {
  const timestampIn = entry.timestamp || (entry.date && entry.timeIn ? `${entry.date}T${entry.timeIn}:00` : null);
  const timestampOut = entry.timestampOut || (entry.date && entry.timeOut ? `${entry.date}T${entry.timeOut}:00` : null);
  const fullName = entry.userName || entry.name || 'Utilisateur';
  const nameParts = fullName.trim().split(/\s+/);

  return {
    id: entry.id || `${entry.userId || entry.name || 'row'}-${index}`,
    userId: entry.userId || '',
    name: fullName,
    nom: entry.nom || nameParts.slice(1).join(' ') || fullName,
    prenom: entry.prenom || nameParts[0] || '',
    role: roleLabel(entry.role),
    cin: entry.cin || '',
    tel: entry.tel || entry.num || entry.phone || '',
    email: entry.email || '',
    presenceType: normalizePresenceType(entry),
    detail: entry.detail || entry.comment || '',
    eventId: entry.eventId || '',
    eventTitle: entry.eventTitle || '',
    eventSpace: entry.eventSpace || '',
    projectId: entry.projectId || '',
    projectTitle: entry.projectTitle || '',
    timestampIn,
    timestampOut,
    date: entry.date || (timestampIn ? toLabISODate(timestampIn) : ''),
    timeIn: entry.timeIn || formatTime(timestampIn),
    timeOut: entry.timeOut || formatTime(timestampOut),
    rating: Number(entry.rating || entry.feedbackRating || 0)
  };
}

function rowMatchesPeriod(row, dateMode, singleDate, dateFrom, dateTo, timeFrom, timeTo) {
  // Compare lab wall-clock strings ('YYYY-MM-DDTHH:MM') so filter boundaries
  // mean lab time regardless of the viewer's device timezone.
  const wall = row.timestampIn
    ? `${toLabISODate(row.timestampIn)}T${formatTime(row.timestampIn)}`
    : (row.date && row.timeIn ? `${row.date}T${row.timeIn}` : null);
  const startDate = dateMode === 'single' ? singleDate : dateFrom;
  const endDate = dateMode === 'single' ? singleDate : dateTo;
  const startTime = dateMode === 'single' ? timeFrom : '00:00';
  const endTime = dateMode === 'single' ? timeTo : '23:59';
  if (!wall || !startDate || !endDate) return false;
  const start = `${startDate}T${startTime}`;
  const end = `${endDate}T${endTime}`;
  if (start > end) return false;
  return wall >= start && wall <= end;
}

function readCurrentPresenceRows(attendanceRows) {
  const now = new Date();
  const today = toLabISODate(now);
  return attendanceRows
    .map(normalizeDashboardJournalRow)
    .filter((row) => {
      const timestampIn = safeDate(row.timestampIn || `${row.date}T${row.timeIn}:00`);
      const timestampOut = safeDate(row.timestampOut || (row.date && row.timeOut ? `${row.date}T${row.timeOut}:00` : ''));
      return timestampIn && toLabISODate(timestampIn) === today && timestampIn <= now && !timestampOut;
    });
}

export default function AdminOverviewView({ onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(currentLabISODate);
  const [workingHoursStart, setWorkingHoursStart] = useState('08:30');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:30');
  // Custom-period analysis filter times: independent from the enforcement
  // hours above (which follow the server and drive the open/closed badge).
  const [periodTimeStart, setPeriodTimeStart] = useState('08:30');
  const [periodTimeEnd, setPeriodTimeEnd] = useState('18:30');
  // Minute ticker so the Ouvert/Fermé badge flips at closing time without a reload
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);
  const [periodMode, setPeriodMode] = useState('now');
  const [customDateMode, setCustomDateMode] = useState('single');
  const [dateFrom, setDateFrom] = useState(currentLabISODate);
  const [dateTo, setDateTo] = useState(currentLabISODate);
  const [revealedProjects, setRevealedProjects] = useState({});
  const [dashboardRoleFilter, setDashboardRoleFilter] = useState('all');
  const [dashboardPresenceFilter, setDashboardPresenceFilter] = useState('all');
  const [dashboardEventFilter, setDashboardEventFilter] = useState('');
  const [openPresenceMenu, setOpenPresenceMenu] = useState(null);
  const [presenceMenuPosition, setPresenceMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceStale, setAttendanceStale] = useState(false);
  const attendanceStaleRef = useRef(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [customExceptions, setCustomExceptions] = useState([]);
  const [labOpenOverrideDates, setLabOpenOverrideDates] = useState([]);
  const [newExceptionLabel, setNewExceptionLabel] = useState('');
  const [newExceptionFrom, setNewExceptionFrom] = useState('');
  const [newExceptionTo, setNewExceptionTo] = useState('');

  // Toast state for validation errors
  const [toast, setToast] = useState({ show: false, message: '' });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 4000);
  }, []);

  const loadAttendance = useCallback((cancelledRef = { current: false }) => {
    api.getAttendance()
      .then((rows) => {
        if (!cancelledRef.current) {
          attendanceStaleRef.current = false;
          setAttendanceStale(false);
          setAttendanceRows(rows);
        }
      })
      .catch(() => {
        if (!cancelledRef.current) {
          if (!attendanceStaleRef.current) {
            showToast("Connexion API interrompue — affichage des dernières données.");
          }
          attendanceStaleRef.current = true;
          setAttendanceStale(true);
        }
      });
  }, [showToast]);

  const loadLabClosures = useCallback((cancelledRef = { current: false }) => {
    api.getLabClosures()
      .then((data) => {
        if (!cancelledRef.current) {
          setCustomExceptions(data.closures || []);
          setLabOpenOverrideDates(data.openOverrideDates || []);
          if (data.openTime) setWorkingHoursStart(data.openTime);
          if (data.closeTime) setWorkingHoursEnd(data.closeTime);
        }
      })
      .catch(() => {
        if (!cancelledRef.current) {
          showToast("Fermetures indisponibles — vérifiez la connexion API.");
        }
      });
  }, [showToast]);

  const isOpenOverrideDate = useCallback((date) => (
    labOpenOverrideDates.includes(date)
  ), [labOpenOverrideDates]);

  useEffect(() => {
    const cancelledRef = { current: false };

    loadAttendance(cancelledRef);
    loadLabClosures(cancelledRef);
    const intervalId = periodMode === 'now' ? setInterval(() => loadAttendance(cancelledRef), 10000) : null;

    return () => {
      cancelledRef.current = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [loadAttendance, loadLabClosures, periodMode]);

  useEffect(() => subscribeRealtime((change) => {
    if (change.entity === 'sync' || (periodMode === 'now' && change.entity === 'attendance')) {
      loadAttendance();
    }
    if (change.entity === 'sync' || change.entity === 'lab-closures') {
      loadLabClosures();
    }
  }), [loadAttendance, loadLabClosures, periodMode]);

  const handleTimeChange = (value, setter, previousValue, defaultValue) => {
    if (!value) {
      setter('');
      return;
    }
    if (value < '08:30' || value > '18:30') {
      showToast("Please that time is out of range, which is from 8:30 to 18:30");
      setter(previousValue || defaultValue);
    } else {
      setter(value);
    }
  };

  const handleSelectedDateChange = (value) => {
    if (!isOpenOverrideDate(value) && isWeekend(value)) {
      showToast("Please don't select Saturday or Sunday, they are days off.");
      return;
    }
    if (!isOpenOverrideDate(value) && isHoliday(value)) {
      showToast("Please don't select a holiday, the FabLab is closed.");
      return;
    }
    setSelectedDate(value);
  };

  const handleDateChange = (value, setter) => {
    if (!isOpenOverrideDate(value) && isWeekend(value)) {
      showToast("Please don't select Saturday or Sunday, they are days off.");
      return;
    }
    if (!isOpenOverrideDate(value) && isHoliday(value)) {
      showToast("Please don't select a holiday, the FabLab is closed.");
      return;
    }
    setter(value);
  };

  const handleApplyPeriod = () => {
    if (periodMode === 'now') {
      setShowPeriodModal(false);
      return;
    }

    if (customDateMode === 'single') {
      if (!isOpenOverrideDate(selectedDate) && isWeekend(selectedDate)) {
        showToast("Please don't select Saturday or Sunday, they are days off.");
        return;
      }
      if (!isOpenOverrideDate(selectedDate) && isHoliday(selectedDate)) {
        showToast("Please don't select a holiday, the FabLab is closed.");
        return;
      }
      if (periodTimeStart < '08:30' || periodTimeEnd > '18:30') {
        showToast("Please that time is out of range, which is from 8:30 to 18:30");
        return;
      }
      if (periodTimeStart >= periodTimeEnd) {
        showToast("Please choose an end time after the start time.");
        return;
      }
    } else {
      const dates = eachDateInRange(dateFrom, dateTo);
      if (dates.length === 0) {
        showToast("Please choose a valid date range.");
        return;
      }
      if (dates.some((date) => !isOpenOverrideDate(date) && isWeekend(date))) {
        showToast("Please don't include Saturday or Sunday, they are days off.");
        return;
      }
      if (dates.some((date) => !isOpenOverrideDate(date) && isHoliday(date))) {
        showToast("Please don't include a holiday, the FabLab is closed.");
        return;
      }
    }

    setShowPeriodModal(false);
  };

  const openUserProfile = (user) => {
    onNavigate?.('users', user);
  };

  const togglePresenceMenu = (menu, event, width = 160) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPresenceMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width
    });
    setOpenPresenceMenu((current) => current === menu ? null : menu);
  };

  // Outlook sync simulation state (Commented out for later work)
  /*
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleOutlookSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsOutlookConnected(true);
    }, 1200);
  };
  */
  const isOutlookConnected = false;

  const handleAddException = async () => {
    if (!newExceptionLabel.trim()) {
      alert("Veuillez saisir un motif pour la fermeture.");
      return;
    }
    if (Boolean(newExceptionFrom) !== Boolean(newExceptionTo)) {
      alert("Veuillez saisir l'heure de début et l'heure de fin, ou laisser les deux vides.");
      return;
    }
    if (newExceptionFrom && newExceptionTo && newExceptionFrom >= newExceptionTo) {
      alert("L'heure de début doit être antérieure à l'heure de fin.");
      return;
    }
    try {
      const newExc = await api.createLabClosure({
        label: newExceptionLabel.trim(),
        date: selectedDate,
        timeFrom: newExceptionFrom || null,
        timeTo: newExceptionTo || null
      });
      setCustomExceptions((current) => [newExc, ...current]);
      setNewExceptionLabel('');
      setNewExceptionFrom('');
      setNewExceptionTo('');
    } catch {
      showToast("Fermeture impossible à enregistrer.");
    }
  };

  const handleDeleteException = async (id) => {
    try {
      await api.deleteLabClosure(id);
      setCustomExceptions((current) => current.filter(exc => exc.id !== id));
    } catch {
      showToast("Suppression de la fermeture impossible.");
    }
  };

  // Get active exceptions list for selectedDate (holidays and manual exceptions)
  const selectedDateHoliday = MOROCCAN_HOLIDAYS_2026.find(h => h.date === selectedDate);
  const selectedDateExceptions = customExceptions.filter(exc => exc.date === selectedDate);

  let labStatusText = 'Ouvert';
  let labStatusColor = 'text-accent-green bg-accent-green/10 border border-accent-green/20';
  let isLabOpen = true;

  if (selectedDateExceptions.length > 0) {
    const wholeDayException = selectedDateExceptions.find(e => !e.timeFrom || (e.timeFrom === workingHoursStart && e.timeTo === workingHoursEnd));
    if (wholeDayException) {
      labStatusText = `Fermé (${wholeDayException.label})`;
      labStatusColor = 'text-accent-red bg-accent-red/10 border border-accent-red/20';
      isLabOpen = false;
    } else {
      const labels = selectedDateExceptions.map(e => `${e.label} (${e.timeFrom}-${e.timeTo})`).join(', ');
      labStatusText = `Indisponible temporairement: ${labels}`;
      labStatusColor = 'text-accent-amber bg-accent-amber/10 border border-accent-amber/20';
      isLabOpen = false; // Flag as closed/restricted during active slots
    }
  } else if (!isOpenOverrideDate(selectedDate) && isWeekend(selectedDate)) {
    labStatusText = 'Fermé (Weekend)';
    labStatusColor = 'text-accent-red bg-accent-red/10 border border-accent-red/20';
    isLabOpen = false;
  } else if (!isOpenOverrideDate(selectedDate) && selectedDateHoliday) {
    labStatusText = `Fermé (Férié: ${selectedDateHoliday.name})`;
    labStatusColor = 'text-accent-red bg-accent-red/10 border border-accent-red/20';
    isLabOpen = false;
  } else if (periodMode === 'now' || selectedDate === toLabISODate(now)) {
    // Outside working hours today: the calendar says open, the clock says closed
    const nowHHMM = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(now);
    if (nowHHMM < workingHoursStart || nowHHMM >= workingHoursEnd) {
      labStatusText = `Fermé (Hors horaires ${workingHoursStart} - ${workingHoursEnd})`;
      labStatusColor = 'text-accent-red bg-accent-red/10 border border-accent-red/20';
      isLabOpen = false;
    }
  }

  // Combine exceptions list for rendering
  const allExceptions = [
    ...customExceptions,
    ...(isOutlookConnected ? MOROCCAN_HOLIDAYS_2026.map(h => ({
      id: h.id,
      label: `Jour Férié: ${h.name}`,
      date: h.date,
      timeFrom: '',
      timeTo: '',
      isCustom: false
    })) : [])
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Determine dynamic stats and logs based on the selected dashboard period mode.
  const getDynamicData = () => {
    if (periodMode === 'now') {
      const liveRows = readCurrentPresenceRows(attendanceRows);
      const today = toLabISODate(new Date());
      const todayRows = attendanceRows
        .map(normalizeDashboardJournalRow)
        .filter((row) => {
          const timestampIn = safeDate(row.timestampIn || `${row.date}T${row.timeIn}:00`);
          return timestampIn && toLabISODate(timestampIn) === today;
        });
      const ratedTodayRows = attendanceRows
        .map(normalizeDashboardJournalRow)
        .filter((row) => {
          const timestampOut = safeDate(row.timestampOut);
          return timestampOut && toLabISODate(timestampOut) === today && row.rating > 0;
        });
      const avgRating = ratedTodayRows.length
        ? (ratedTodayRows.reduce((sum, row) => sum + row.rating, 0) / ratedTodayRows.length).toFixed(1)
        : 0;
      return {
        metrics: { present: liveRows.length, total: todayRows.length, exits: todayRows.filter(row => row.timestampOut).length, avgRating },
        presents: liveRows
      };
    }

    const rows = attendanceRows
      .map(normalizeDashboardJournalRow)
      .filter((row) => rowMatchesPeriod(row, customDateMode, selectedDate, dateFrom, dateTo, periodTimeStart, periodTimeEnd));

    const total = rows.length;
    const exits = rows.filter(h => h.timeOut).length;
    const rated = rows.filter(h => h.timeOut && h.rating);
    const avgRating = rated.length
      ? (rated.reduce((sum, h) => sum + h.rating, 0) / rated.length).toFixed(1)
      : 0;

    return {
      metrics: { present: rows.filter(row => !row.timeOut).length, total, exits, avgRating },
      presents: rows
    };
  };

  const { metrics, presents } = getDynamicData();
  const selectedPresenceOption = presenceOptionByValue(dashboardPresenceFilter, dashboardRoleFilter);
  const dashboardTypeOptions = PRESENCE_TYPES_BY_ROLE[dashboardRoleFilter] || PRESENCE_TYPES_BY_ROLE.all;
  const dashboardEventOptions = Array.from(
    new Map(
      presents
        .filter((item) => item.presenceType === 'Event' && (item.eventId || item.eventTitle))
        .map((item) => [item.eventId || item.eventTitle, { id: item.eventId || item.eventTitle, title: item.eventTitle || item.eventId }])
    ).values()
  );
  const filteredPresents = presents.filter((item) => {
    if (dashboardRoleFilter !== 'all' && roleValue(item.role) !== dashboardRoleFilter) return false;
    if (selectedPresenceOption.value !== 'all' && !selectedPresenceOption.matches.includes(item.presenceType)) return false;
    if (selectedPresenceOption.requiresEvent && !dashboardEventFilter) return false;
    if (selectedPresenceOption.requiresEvent && String(item.eventId || item.eventTitle) !== String(dashboardEventFilter)) return false;
    return true;
  });

  useEffect(() => {
    const projectRows = presents.filter((item) => isProjectPresence(item) && (item.projectTitle || item.projectName || item.detail));
    if (projectRows.length === 0) return undefined;

    const intervalId = setInterval(() => {
      setRevealedProjects((current) => {
        const next = { ...current };
        projectRows.forEach((item) => {
          next[item.id || item.name] = Math.random() > 0.45;
        });
        return next;
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [presents]);

  const formatDateString = (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const periodButtonLabel = periodMode === 'now'
    ? 'Maintenant'
    : customDateMode === 'single'
      ? `${formatDateString(selectedDate)} (${periodTimeStart} - ${periodTimeEnd})`
      : `${formatDateString(dateFrom)} - ${formatDateString(dateTo)}`;
  const tableTitle = periodMode === 'now' ? 'Utilisateurs Présents' : 'journal';
  const tableEmptyMessage = periodMode === 'now'
    ? 'Aucun utilisateur présent pour le moment'
    : 'Aucune entrée pour cette période';

  return (
    <section>
      {/* Header with rounded configuration buttons in the top right */}
      <div className="flex items-center justify-between mb-7 mt-2">
        <div>
          <p className="text-[12px] font-medium text-white/50 mb-1">Pages / Dashboard</p>
          <h1 className="text-[32px] font-bold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          {attendanceStale && (
            <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-amber-300/80">
              Données en cache
            </span>
          )}
          {/* Button 1: Period Selection */}
          <button
            onClick={() => setShowPeriodModal(true)}
            className="flex items-center space-x-2.5 px-4 py-2.5 bg-card hover:bg-card-hover border border-white/[0.08] rounded-xl text-[12px] font-bold text-white transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>{periodButtonLabel}</span>
          </button>

          {/* Button 2: Availability */}
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-card hover:bg-card-hover border border-white/[0.08] rounded-xl text-[12px] font-bold text-white transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          >
            <span className={`w-2 h-2 rounded-full ${isLabOpen ? 'bg-accent-green live-dot' : 'bg-accent-red'}`} />
            <span>{isLabOpen ? 'Lab Ouvert' : 'Lab Restreint'}</span>
          </button>

          {/* Button 3: Analyse */}
          <button
            onClick={() => onNavigate && onNavigate('analyse')}
            className="flex items-center space-x-2 px-4 py-2.5 bg-card hover:bg-card-hover border border-white/[0.08] rounded-xl text-[12px] font-bold text-white transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          >
            <span>Analyse</span>
          </button>
        </div>
      </div>

      {/* Modal 1: Period Configuration */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#060B28]/80 backdrop-blur-md"
            onClick={() => setShowPeriodModal(false)}
          />
          <div className="relative bg-[#111C44] border border-white/[0.08] rounded-3xl p-7 max-w-md w-full shadow-2xl animate-fade-in text-left">
            <button
              onClick={() => setShowPeriodModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white text-lg cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-[18px] font-bold text-white mb-5 flex items-center space-x-2.5">
               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
               </svg>
              <span>Configuration de la Période</span>
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#060B28] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setPeriodMode('now')}
                  className={`rounded-xl px-3 py-2.5 text-[12px] font-bold transition-colors ${periodMode === 'now' ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'}`}
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('custom')}
                  className={`rounded-xl px-3 py-2.5 text-[12px] font-bold transition-colors ${periodMode === 'custom' ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'}`}
                >
                  Custom Period
                </button>
              </div>
              {periodMode === 'custom' && (
                <>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#060B28] p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setCustomDateMode('single')}
                      className={`rounded-xl px-3 py-2.5 text-[12px] font-bold transition-colors ${customDateMode === 'single' ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'}`}
                    >
                      Un jour
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDateMode('range')}
                      className={`rounded-xl px-3 py-2.5 text-[12px] font-bold transition-colors ${customDateMode === 'range' ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'}`}
                    >
                      Du - Au
                    </button>
                  </div>
                  {customDateMode === 'single' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Date</label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => handleSelectedDateChange(e.target.value)}
                          className="w-full bg-[#060B28] border border-white/10 text-white text-[13px] font-medium rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Heure début</label>
                          <input
                            type="time"
                            value={periodTimeStart}
                            onChange={(e) => handleTimeChange(e.target.value, setPeriodTimeStart, periodTimeStart, '08:30')}
                            className="w-full bg-[#060B28] border border-white/10 text-white text-[13px] font-medium rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Heure fin</label>
                          <input
                            type="time"
                            value={periodTimeEnd}
                            onChange={(e) => handleTimeChange(e.target.value, setPeriodTimeEnd, periodTimeEnd, '18:30')}
                            className="w-full bg-[#060B28] border border-white/10 text-white text-[13px] font-medium rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Date début</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => handleDateChange(e.target.value, setDateFrom)}
                          className="w-full bg-[#060B28] border border-white/10 text-white text-[13px] font-medium rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Date fin</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => handleDateChange(e.target.value, setDateTo)}
                          className="w-full bg-[#060B28] border border-white/10 text-white text-[13px] font-medium rounded-xl px-4 py-3 outline-none focus:border-accent-blue/50 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.04] flex justify-between items-center">
              <span className="text-[10px] text-white/30">
                {periodMode === 'now' ? 'Aucune configuration manuelle' : customDateMode === 'single' ? '* Par défaut: 8:30 - 18:30' : 'Plage complète de jours'}
              </span>
              <button
                onClick={handleApplyPeriod}
                className="px-5 py-2.5 bg-accent-blue text-white rounded-xl text-[12px] font-bold cursor-pointer hover:bg-accent-blue/80 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: FabLab Availability */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#060B28]/80 backdrop-blur-md"
            onClick={() => setShowAvailabilityModal(false)}
          />
          <div className="relative bg-[#111C44] border border-white/[0.08] rounded-3xl p-7 max-w-lg w-full shadow-2xl animate-fade-in text-left">
            <button
              onClick={() => setShowAvailabilityModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white text-lg cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center justify-between mb-5 pr-6">
              <h3 className="text-[18px] font-bold text-white flex items-center space-x-2.5">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Disponibilité du FabLab</span>
              </h3>
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${labStatusColor}`}>
                {labStatusText}
              </div>
            </div>

            {/* List of custom exceptions and Outlook synced holidays */}
            <div className="space-y-2.5 max-h-[160px] overflow-y-auto mb-5 pr-1">
              {/* Outlook Sync Button (Commented out for later work)
              {!isOutlookConnected ? (
                <button
                  onClick={handleOutlookSync}
                  className="w-full py-3 bg-gradient-to-r from-[#0078d4] to-[#005a9e] text-white rounded-xl text-[11px] font-bold flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] shadow-[0_4px_12px_rgba(0,120,212,0.25)] cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Synchronisation Outlook...</span>
                    </>
                  ) : (
                    <>
                      <span>📅</span>
                      <span>Lier Outlook Calendar</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-between bg-[#0078d4]/10 border border-[#0078d4]/20 rounded-xl px-3 py-2.5 text-[11.5px] text-white/90">
                  <span className="flex items-center space-x-1.5 font-bold text-[#0078d4]">
                    <span className="w-1.5 h-1.5 bg-[#0078d4] rounded-full animate-ping" />
                    <span>Outlook Connecté</span>
                  </span>
                  <button
                    onClick={() => setIsOutlookConnected(false)}
                    className="text-white/40 hover:text-white text-[9px] uppercase tracking-wider font-bold cursor-pointer"
                  >
                    Déconnecter
                  </button>
                </div>
              )}
              */}

              {/* Display custom closed slots & holidays */}
              {allExceptions.length === 0 ? (
                <p className="text-[11px] text-white/30 italic text-center py-3">Aucune restriction d'accès active</p>
              ) : (
                allExceptions.map((exc) => (
                  <div key={exc.id} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-xl px-3 py-2 text-[11px] transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-medium truncate">{exc.label}</span>
                      <span className="text-white/40 text-[9px] mt-0.5">
                        {exc.date} {exc.timeFrom ? `(${exc.timeFrom} - ${exc.timeTo})` : '(Journée)'}
                      </span>
                    </div>
                    {exc.isCustom && (
                      <button
                        onClick={() => handleDeleteException(exc.id)}
                        className="text-accent-red/60 hover:text-accent-red font-bold text-[13px] px-1.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick add exception form */}
            <div className="pt-4 border-t border-white/[0.04]">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Ajouter une fermeture exceptionnelle</p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Motif (ex: Pause)"
                  value={newExceptionLabel}
                  onChange={(e) => setNewExceptionLabel(e.target.value)}
                  className="flex-1 bg-[#060B28] border border-white/10 text-white text-[11.5px] font-medium rounded-lg px-2.5 py-2.5 outline-none focus:border-accent-blue/50 placeholder:text-white/20"
                />
                <input
                  type="time"
                  value={newExceptionFrom}
                  onChange={(e) => handleTimeChange(e.target.value, setNewExceptionFrom, newExceptionFrom, '')}
                  className="w-[66px] bg-[#060B28] border border-white/10 text-white text-[11.5px] font-medium rounded-lg px-1 py-2.5 outline-none focus:border-accent-blue/50"
                />
                <span className="text-white/30 self-center text-[10px]">-</span>
                <input
                  type="time"
                  value={newExceptionTo}
                  onChange={(e) => handleTimeChange(e.target.value, setNewExceptionTo, newExceptionTo, '')}
                  className="w-[66px] bg-[#060B28] border border-white/10 text-white text-[11.5px] font-medium rounded-lg px-1 py-2.5 outline-none focus:border-accent-blue/50"
                />
                <button
                  onClick={handleAddException}
                  className="px-4.5 bg-accent-green hover:bg-accent-green/80 text-white rounded-lg text-[12px] font-bold cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="metric-card glow-green animate-fade-in delay-1" style={{ opacity: 1 }}>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-3">PRÉSENTS MAINTENANT</p>
          <p className="text-[36px] font-extrabold text-accent-green leading-none mb-1.5">{metrics.present}</p>
          <p className="text-[12px] text-white/30 font-normal">utilisateurs actifs dans le lab</p>
        </div>

        <div className="metric-card glow-white animate-fade-in delay-2" style={{ opacity: 1 }}>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-3">TOTAL AUJOURD'HUI</p>
          <p className="text-[36px] font-extrabold text-white leading-none mb-1.5">{metrics.total}</p>
          <p className="text-[12px] text-white/30 font-normal">entrées enregistrées</p>
        </div>

        <div className="metric-card glow-red animate-fade-in delay-4" style={{ opacity: 1 }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-3">SORTIES TERMINÉES</p>
              <p className="text-[36px] font-extrabold text-accent-red leading-none mb-1.5">{metrics.exits}</p>
              <p className="text-[12px] text-white/30 font-normal">check-outs avec feedback</p>
            </div>
            <div className="text-right pt-0.5 shrink-0">
              <p className="text-[9px] font-bold text-white/35 uppercase tracking-[1.5px] mb-2">SATISFACTION MOY.</p>
              <p className="text-[18px] font-extrabold text-accent-amber leading-none">{metrics.avgRating || '0.0'}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Column 1: Period-aware presence table */}
        <div className="section-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.04]">
              <h3 className="text-[16px] font-bold text-white">{tableTitle}</h3>
              <div className="flex items-center space-x-2">
                {periodMode === 'now' && <div className="w-2 h-2 bg-accent-green rounded-full live-dot" />}
                <span className="text-[10px] font-bold text-accent-green uppercase tracking-[2px]">
                  {periodMode === 'now' ? 'EN DIRECT' : `${periodTimeStart} - ${periodTimeEnd}`}
                </span>
              </div>
            </div>
            <div className="min-h-[100px] max-h-[350px] overflow-auto">
              {presents.length === 0 ? (
                <div className="px-7 py-10 text-center">
                  <p className="text-[13px] text-white/30 italic font-normal">{tableEmptyMessage}</p>
                </div>
              ) : (
                <table className="w-full min-w-[1080px] table-fixed text-left">
                  <colgroup>
                    <col className="w-[9%]" />
                    <col className="w-[10%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[15%]" />
                    <col className="w-[27%]" />
                    <col className="w-[7%]" />
                    <col className="w-[6%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="pl-5 pr-2 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px]">Prénom</th>
                      <th className="px-2 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px]">Nom</th>
                      <th className="relative px-2 py-3">
                        <button
                          type="button"
                          onClick={(event) => togglePresenceMenu('role', event, 160)}
                          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[1.5px] transition-colors ${dashboardRoleFilter === 'all' ? 'text-white/30 hover:text-white/60' : 'text-accent-green'}`}
                        >
                          <span>Role</span>
                          <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {openPresenceMenu === 'role' && (
                          <div
                            className="fixed z-[9999] overflow-hidden rounded-xl border border-white/10 bg-[#0B102B] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                            style={{ top: presenceMenuPosition.top, left: presenceMenuPosition.left, width: presenceMenuPosition.width }}
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setDashboardRoleFilter(option.value);
                                  setDashboardPresenceFilter('all');
                                  setDashboardEventFilter('');
                                  setOpenPresenceMenu(null);
                                }}
                                className={`block w-full px-3 py-2 text-left text-[11px] font-bold transition-colors ${dashboardRoleFilter === option.value ? 'bg-accent-blue/15 text-accent-blue' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </th>
                      <th className="px-2 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px]">CIN</th>
                      <th className="px-2 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px]">Num</th>
                      <th className="px-2 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px]">Email</th>
                      <th className="relative px-3 py-3">
                        <button
                          type="button"
                          onClick={(event) => togglePresenceMenu('type', event, 256)}
                          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[1.5px] transition-colors ${dashboardPresenceFilter === 'all' ? 'text-white/30 hover:text-white/60' : 'text-accent-amber'}`}
                        >
                          <span>Type de présence</span>
                          <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {openPresenceMenu === 'type' && (
                          <div
                            className="fixed z-[9999] overflow-hidden rounded-xl border border-white/10 bg-[#0B102B] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                            style={{ top: presenceMenuPosition.top, left: presenceMenuPosition.left, width: presenceMenuPosition.width }}
                          >
                            {dashboardTypeOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setDashboardPresenceFilter(option.value);
                                  setDashboardEventFilter('');
                                  setOpenPresenceMenu(option.value === 'event' ? 'event' : null);
                                }}
                                className={`block w-full px-3 py-2 text-left text-[11px] font-bold transition-colors ${dashboardPresenceFilter === option.value ? 'bg-accent-blue/15 text-accent-blue' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {openPresenceMenu === 'event' && (
                          <div
                            className="fixed z-[9999] overflow-hidden rounded-xl border border-white/10 bg-[#0B102B] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                            style={{ top: presenceMenuPosition.top, left: presenceMenuPosition.left, width: presenceMenuPosition.width }}
                          >
                            <div className="px-3 py-2 text-left text-[11px] font-bold text-white/35">
                              Choisir un event
                            </div>
                            {dashboardEventOptions.map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                onClick={() => {
                                  setDashboardEventFilter(event.id);
                                  setOpenPresenceMenu(null);
                                }}
                                className={`block w-full px-3 py-2 text-left text-[11px] font-bold transition-colors ${dashboardEventFilter === event.id ? 'bg-accent-blue/15 text-accent-blue' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}
                              >
                                {event.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </th>
                      <th className="px-2 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px]">Entrée</th>
                      <th className="pl-2 pr-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[1.5px] text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPresents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-7 py-10 text-center text-[13px] text-white/30 italic font-normal">
                          Aucun utilisateur ne correspond au filtre
                        </td>
                      </tr>
                    ) : filteredPresents.map((s) => {
                      const rowKey = s.id || s.name;
                      const hasRevealText = (isProjectPresence(s) && (s.projectTitle || s.projectName || s.detail)) || (isOtherPresence(s) && s.detail);
                      const detailRevealed = !!revealedProjects[rowKey];
                      const isCompleted = periodMode === 'custom' && !!s.timeOut;

                      return (
                      <tr key={rowKey} className="trow border-b border-white/[0.03]">
                        <td className="pl-5 pr-2 py-3.5">
                          <button
                            type="button"
                            onClick={() => openUserProfile(s)}
                            className="block max-w-full truncate text-left text-[12px] font-semibold text-white transition-colors hover:text-accent-blue"
                          >
                            {s.prenom || s.name?.split(' ')[0] || '—'}
                          </button>
                        </td>
                        <td className="px-2 py-3.5">
                          <button
                            type="button"
                            onClick={() => openUserProfile(s)}
                            className="block max-w-full truncate text-left text-[12px] text-white/60 font-medium transition-colors hover:text-accent-blue"
                          >
                            {s.nom || s.name?.split(' ').slice(1).join(' ') || '—'}
                          </button>
                        </td>
                        <td className="px-2 py-3.5 text-[12px] text-white/50 font-medium truncate">{s.role || 'Stagiaire'}</td>
                        <td className="px-2 py-3.5 text-[12px] text-white/50 font-medium truncate">{s.cin || '—'}</td>
                        <td className="px-2 py-3.5 text-[12px] text-white/50 font-medium truncate">{s.tel || '—'}</td>
                        <td className="px-2 py-3.5 text-[12px] text-white/50 font-medium truncate">{s.email || '—'}</td>
                        <td className="px-3 py-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasRevealText) return;
                              setRevealedProjects((current) => ({ ...current, [rowKey]: !current[rowKey] }));
                            }}
                            title={hasRevealText ? (s.projectTitle || s.projectName || s.detail) : undefined}
                            className={`block max-w-full truncate text-[11px] font-bold text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${hasRevealText ? 'cursor-pointer hover:bg-accent-blue/20' : 'cursor-default'}`}
                          >
                            {presenceTypeLabel(s, detailRevealed)}
                          </button>
                        </td>
                        <td className="px-2 py-3.5">
                          <span className="text-[11px] font-bold text-accent-green bg-accent-green/10 px-2.5 py-1 rounded-lg">{s.timeIn}</span>
                        </td>
                        <td className="pl-2 pr-5 py-3.5">
                          <div className="flex items-center space-x-1 justify-end">
                            <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-accent-red' : 'bg-accent-green live-dot'}`} />
                            <span className={`text-[9px] font-bold uppercase ${isCompleted ? 'text-accent-red' : 'text-accent-green'}`}>
                              {isCompleted ? `Terminé${s.timeOut ? ` (${s.timeOut})` : ''}` : 'Actif'}
                            </span>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Red Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-9999 animate-fade-in pointer-events-none">
          <div className="bg-[#E53E3E] text-white font-semibold backdrop-blur-md px-6 py-4 rounded-2xl shadow-[0_10px_30px_rgba(229,62,62,0.3)] flex items-center space-x-3 border border-white/10 text-[13px] tracking-wide max-w-md text-center">
            <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </section>
  );
}
