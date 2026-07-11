import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'stagiaire', label: 'Stagiaire' },
  { value: 'formateur', label: 'Formateur' },
  { value: 'administrateur', label: 'Administrateur' },
  { value: 'visiteur', label: 'Visiteur' }
];

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

const DEFAULT_TIME_FROM = '08:30';
const DEFAULT_TIME_TO = '18:30';

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

const LAB_TIME_ZONE = 'Africa/Casablanca';

// Local-clock date parts: for dates parsed from plain 'YYYY-MM-DD' strings
// this round-trips exactly, on any machine timezone (toISOString would shift).
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Lab-timezone date of a real timestamp — attendance rows group by lab day.
function toLabISODate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LAB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const partByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${partByType.year}-${partByType.month}-${partByType.day}`;
}

function safeDate(dateValue) {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWeekend(dateStr) {
  // 'T00:00:00' forces local-time parsing (bare dates parse as UTC midnight)
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(dateStr) {
  return MOROCCAN_HOLIDAYS_2026.some((holiday) => holiday.date === dateStr);
}

function eachDateInRange(dateFrom, dateTo) {
  const dates = [];
  const start = safeDate(`${dateFrom}T00:00:00`);
  const end = safeDate(`${dateTo}T00:00:00`);
  if (!start || !end || start > end) return dates;

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// Lab events always display in lab time, whatever the viewer's device is set to.
function formatTime(dateValue, fallback = '') {
  const date = safeDate(dateValue);
  if (!date) return fallback || '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: LAB_TIME_ZONE, hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function normalizeRole(role) {
  return (role || 'stagiaire').toLowerCase();
}

function roleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === normalizeRole(role))?.label || role || '—';
}

function presenceTypeLabel(row) {
  if (row?.presenceType === 'Event') return row.eventTitle || row.detail || 'Event';
  return row?.presenceType || '—';
}

function normalizePresenceType(entry) {
  return entry.presenceType || entry.objective || entry.typePresence || '—';
}

function normalizeDetail(entry) {
  if (entry.eventTitle) return entry.eventTitle;
  if (entry.projectTitle) return entry.projectTitle;
  if (entry.objective === 'Objectif de visite' || entry.objective === 'Other') return entry.comment || '—';
  return entry.detail || '—';
}

function normalizeAttendanceRow(entry, index) {
  const timestampIn = entry.timestamp || (entry.date && entry.timeIn ? `${entry.date}T${entry.timeIn}:00` : null);
  const timestampOut = entry.timestampOut || (entry.date && entry.timeOut ? `${entry.date}T${entry.timeOut}:00` : null);
  const presenceType = normalizePresenceType(entry);
  const fullName = entry.userName || entry.name || 'Utilisateur';
  const nameParts = fullName.trim().split(/\s+/);

  return {
    id: entry.id || `${entry.userId || entry.name || 'row'}-${index}`,
    userId: entry.userId || '',
    userName: fullName,
    nom: entry.nom || nameParts.slice(1).join(' ') || fullName,
    prenom: entry.prenom || nameParts[0] || '',
    role: normalizeRole(entry.role),
    cin: entry.cin || '',
    tel: entry.tel || entry.num || entry.phone || '',
    email: entry.email || '',
    presenceType,
    detail: normalizeDetail(entry),
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
    rating: Number(entry.rating || entry.feedbackRating || 0),
    feedbackComment: entry.feedbackComment || entry.note || entry.comment || ''
  };
}

function buildRange(dateMode, singleDate, dateFrom, dateTo, timeFrom, timeTo) {
  const startDate = dateMode === 'single' ? singleDate : dateFrom;
  const endDate = dateMode === 'single' ? singleDate : dateTo;
  const startTime = dateMode === 'single' ? (timeFrom || DEFAULT_TIME_FROM) : '00:00';
  const endTime = dateMode === 'single' ? (timeTo || DEFAULT_TIME_TO) : '23:59';
  // Lab wall-clock strings ('YYYY-MM-DDTHH:MM') — filter boundaries mean lab
  // time regardless of the viewer's device timezone.
  return { start: `${startDate}T${startTime}`, end: `${endDate}T${endTime}` };
}

function rowMatchesRange(row, start, end) {
  const wall = row.timestampIn
    ? `${toLabISODate(row.timestampIn)}T${formatTime(row.timestampIn, '00:00')}`
    : (row.date && row.timeIn ? `${row.date}T${row.timeIn}` : null);
  if (!wall || !start || !end || start > end) return false;
  return wall >= start && wall <= end;
}

function readAdminEvents(rows) {
  const fromRows = rows
    .filter((row) => row.eventId || row.eventTitle)
    .map((row) => ({ id: row.eventId || row.eventTitle, title: row.eventTitle || row.eventId }));

  const seen = new Set();
  return fromRows
    .filter((event) => event?.id || event?.title)
    .map((event) => ({ id: event.id || event.title, title: event.title || event.id }))
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
}

function getPresenceOptions(roleFilter) {
  return PRESENCE_TYPES_BY_ROLE[roleFilter] || PRESENCE_TYPES_BY_ROLE.all;
}

export default function PVView() {
  const today = toISODate(new Date());
  const [dateMode, setDateMode] = useState('single');
  const [singleDate, setSingleDate] = useState(today);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [timeFrom, setTimeFrom] = useState(DEFAULT_TIME_FROM);
  const [timeTo, setTimeTo] = useState(DEFAULT_TIME_TO);
  const [roleFilter, setRoleFilter] = useState('all');
  const [presenceType, setPresenceType] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [report, setReport] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [toastTimeoutId, setToastTimeoutId] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.getAttendance()
      .then((rows) => {
        if (!cancelled) setAttendanceRows(rows);
      })
      .catch(() => {
        if (!cancelled) setAttendanceRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allRows = useMemo(() => attendanceRows.map(normalizeAttendanceRow), [attendanceRows]);
  const presenceOptions = useMemo(() => getPresenceOptions(roleFilter), [roleFilter]);
  const selectedPresenceOption = useMemo(() => (
    presenceOptions.find((option) => option.value === presenceType) || presenceOptions[0]
  ), [presenceOptions, presenceType]);
  const eventOptions = useMemo(() => readAdminEvents(allRows), [allRows]);

  useEffect(() => {
    setPresenceType('all');
    setEventFilter('all');
  }, [roleFilter]);

  useEffect(() => {
    if (!selectedPresenceOption?.requiresEvent) setEventFilter('');
  }, [selectedPresenceOption]);

  const showToast = (message) => {
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    setToast({ show: true, message });
    const id = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 4000);
    setToastTimeoutId(id);
  };

  const validateDate = (value) => {
    if (isWeekend(value)) {
      showToast("Please don't select Saturday or Sunday, they are days off.");
      return false;
    }
    if (isHoliday(value)) {
      showToast("Please don't select a holiday, the FabLab is closed.");
      return false;
    }
    return true;
  };

  const handleDateChange = (value, setter) => {
    if (!validateDate(value)) return;
    setter(value);
  };

  const handleTimeChange = (value, setter) => {
    if (!value) {
      setter('');
      return;
    }
    setter(value);
  };

  const validatePvFilters = () => {
    if (dateMode === 'single') {
      if (!validateDate(singleDate)) return false;
      const startTime = timeFrom || DEFAULT_TIME_FROM;
      const endTime = timeTo || DEFAULT_TIME_TO;
      if (startTime >= endTime) {
        showToast("Please choose an end time after the start time.");
        return false;
      }
    } else {
      const dates = eachDateInRange(dateFrom, dateTo);
      if (dates.length === 0) {
        showToast("Please choose a valid date range.");
        return false;
      }
      if (dates.some(isWeekend)) {
        showToast("Please don't include Saturday or Sunday, they are days off.");
        return false;
      }
      if (dates.some(isHoliday)) {
        showToast("Please don't include a holiday, the FabLab is closed.");
        return false;
      }
    }

    if (selectedPresenceOption?.requiresEvent && !eventFilter) return false;
    return true;
  };

  const filteredRows = useMemo(() => {
    const { start, end } = buildRange(dateMode, singleDate, dateFrom, dateTo, timeFrom, timeTo);
    return allRows.filter((row) => {
      if (!rowMatchesRange(row, start, end)) return false;
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (selectedPresenceOption.value !== 'all' && !selectedPresenceOption.matches.includes(row.presenceType)) return false;
      if (selectedPresenceOption.requiresEvent && String(row.eventId || row.eventTitle) !== String(eventFilter)) return false;
      return true;
    });
  }, [allRows, dateMode, singleDate, dateFrom, dateTo, timeFrom, timeTo, roleFilter, selectedPresenceOption, eventFilter]);

  // The PV attests who was present, not each coming-and-going: within the
  // selected period one row per person per type of presence (lab objective,
  // or event+espace), keeping the earliest. Movement history stays intact in
  // the database; only this report collapses repeats.
  const reportRows = useMemo(() => {
    const earliestIds = new Map();
    const byTimeAsc = [...filteredRows].sort(
      (a, b) => new Date(a.timestampIn || 0) - new Date(b.timestampIn || 0)
    );
    for (const row of byTimeAsc) {
      const typeKey = row.presenceType === 'Event'
        ? `event:${row.eventId || row.eventTitle}|${row.eventSpace}`
        : `type:${row.presenceType}`;
      const key = `${row.userId || row.userName}|${typeKey}`;
      if (!earliestIds.has(key)) earliestIds.set(key, row.id);
    }
    const keep = new Set(earliestIds.values());
    return filteredRows.filter((row) => keep.has(row.id));
  }, [filteredRows]);

  const handleGenerate = () => {
    if (!validatePvFilters()) return;
    const rows = reportRows;
    const days = new Set(rows.map((row) => row.date)).size;
    const ratedRows = rows.filter((row) => row.rating > 0);
    const avgRating = ratedRows.length
      ? (ratedRows.reduce((sum, row) => sum + row.rating, 0) / ratedRows.length).toFixed(1)
      : '0.0';

    setReport({ entries: rows.length, days, avgRating, rows });
  };

  const handleExportExcel = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const rows = report?.rows || reportRows;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FabLab Admin';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Historique présence', {
      views: [{ state: 'frozen', ySplit: 4 }]
    });

    const headers = ['Prénom', 'Nom', 'Role', 'CIN', 'Num', 'Email', 'Type de présence'];
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
    const panelFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1220' } };
    const accentFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    const border = { style: 'thin', color: { argb: 'FFE5E7EB' } };

    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = 'Historique de présence';
    worksheet.getCell('A1').fill = panelFill;
    worksheet.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `${rows.length} enregistrement(s) - Généré le ${new Date().toLocaleDateString('fr-FR')}`;
    worksheet.getCell('A2').fill = panelFill;
    worksheet.getCell('A2').font = { name: 'Arial', size: 10, color: { argb: 'FFCBD5E1' } };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(2).height = 22;

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: border, right: border, bottom: border, left: border };
    });

    rows.forEach((row, index) => {
      const excelRow = worksheet.addRow([
        row.prenom || '—',
        row.nom || '—',
        roleLabel(row.role),
        row.cin || '—',
        row.tel || '—',
        row.email || '—',
        presenceTypeLabel(row)
      ]);

      excelRow.height = 23;
      excelRow.eachCell((cell, colNumber) => {
        cell.fill = colNumber === 7 ? accentFill : {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' }
        };
        cell.font = {
          name: 'Arial',
          size: 10,
          color: { argb: colNumber === 7 ? 'FF1D4ED8' : 'FF111827' },
          bold: colNumber === 1 || colNumber === 7
        };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 7 ? 'center' : 'left' };
        cell.border = { top: border, right: border, bottom: border, left: border };
      });
    });

    worksheet.columns = [
      { width: 18 },
      { width: 20 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 30 },
      { width: 28 }
    ];

    worksheet.autoFilter = {
      from: 'A4',
      to: 'G4'
    };

    worksheet.getColumn(4).numFmt = '@';
    worksheet.getColumn(5).numFmt = '@';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fablab_pv_${toISODate(new Date())}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const rowsToRender = report?.rows || [];
  const isInvalidRange = (() => {
    const { start, end } = buildRange(dateMode, singleDate, dateFrom, dateTo, timeFrom, timeTo);
    return !start || !end || start > end;
  })();
  const isEventRequiredMissing = selectedPresenceOption?.requiresEvent && !eventFilter;
  const fieldClass = 'w-full h-10 bg-body border border-white/10 text-white text-[12px] font-medium rounded-lg px-3 outline-none focus:border-accent-blue/50 transition-colors';
  const labelClass = 'text-[9px] font-bold text-white/30 uppercase tracking-[1.5px] block mb-1.5';

  return (
    <section>
      <div className="mb-7 mt-2">
        <p className="text-[12px] font-medium text-white/50 mb-1">Pages / PV</p>
        <h1 className="text-[32px] font-bold text-white tracking-tight">PV</h1>
      </div>

      <div className="relative mb-6 pt-7">
        <div className="absolute right-5 top-0 h-9 min-w-[150px] rounded-t-2xl border border-white/10 border-b-0 bg-card px-4 shadow-[0_-8px_24px_rgba(0,0,0,0.18)] flex items-center justify-center">
          <button onClick={handleExportExcel} className="h-8 px-3 rounded-lg font-bold text-[11px] flex items-center gap-2 bg-accent-green/15 text-accent-green border border-accent-green/30 hover:bg-accent-green hover:text-white transition-colors">
            <span>Export Excel</span>
          </button>
        </div>

        <div className="section-card px-5 py-4">
          <div className="flex flex-wrap xl:flex-nowrap items-end gap-3">
            <div className="w-[176px]">
              <label className={labelClass}>Période</label>
              <div className="flex h-10 bg-body border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setDateMode('single')}
                  className={`flex-1 rounded-md text-[11px] font-bold transition-colors ${dateMode === 'single' ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'}`}
                >
                  Un jour
                </button>
                <button
                  onClick={() => setDateMode('range')}
                  className={`flex-1 rounded-md text-[11px] font-bold transition-colors ${dateMode === 'range' ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'}`}
                >
                  Du - Au
                </button>
              </div>
            </div>

            {dateMode === 'single' ? (
              <div className="w-[170px]">
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => handleDateChange(e.target.value, setSingleDate)}
                  className={fieldClass}
                />
              </div>
            ) : (
              <>
                <div className="w-[145px]">
                  <label className={labelClass}>Date début</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateChange(e.target.value, setDateFrom)}
                    className={fieldClass}
                  />
                </div>
                <div className="w-[145px]">
                  <label className={labelClass}>Date fin</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => handleDateChange(e.target.value, setDateTo)}
                    className={fieldClass}
                  />
                </div>
              </>
            )}

            {dateMode === 'single' && (
              <>
                <div className="w-[118px]">
                  <label className={labelClass}>Heure début</label>
                  <input
                    type="time"
                    value={timeFrom}
                    onChange={(e) => handleTimeChange(e.target.value, setTimeFrom)}
                    className={fieldClass}
                  />
                </div>
                <div className="w-[118px]">
                  <label className={labelClass}>Heure fin</label>
                  <input
                    type="time"
                    value={timeTo}
                    onChange={(e) => handleTimeChange(e.target.value, setTimeTo)}
                    className={fieldClass}
                  />
                </div>
              </>
            )}

            <div className="w-[135px]">
              <label className={labelClass}>Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={fieldClass}
              >
                {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>

            <div className="w-[320px]">
              <label className={labelClass}>Type de présence</label>
              <select
                value={presenceType}
                onChange={(e) => setPresenceType(e.target.value)}
                className={fieldClass}
              >
                {presenceOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>

            {selectedPresenceOption?.requiresEvent && (
              <div className="w-[240px]">
                <label className={labelClass}>Event</label>
                <select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Choisir un event</option>
                  {eventOptions.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isInvalidRange || isEventRequiredMissing}
              className="btn-gate-in h-10 px-5 rounded-lg font-bold text-[12px] disabled:opacity-40 disabled:cursor-not-allowed xl:ml-auto"
            >
              Générer
            </button>
          </div>
        </div>
      </div>

      <div className="section-card overflow-hidden">
        <div className="flex items-center justify-between px-7 py-4 border-b border-white/[0.04]">
          <h3 className="text-[14px] font-bold text-white">Historique de présence</h3>
          <span className="text-[11px] text-white/25 font-semibold">
            {report ? `${report.entries} enregistrement(s)` : '0 enregistrement(s)'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-7 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">Prénom</th>
                <th className="px-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">Nom</th>
                <th className="px-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">Role</th>
                <th className="px-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">CIN</th>
                <th className="px-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">Num</th>
                <th className="px-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">Email</th>
                <th className="px-5 py-3 text-[9px] font-bold text-white/30 uppercase tracking-[2px]">Type de présence</th>
              </tr>
            </thead>
            <tbody>
              {!report ? (
                <tr>
                  <td colSpan={7} className="px-7 py-10 text-center text-white/20 italic text-[13px]">
                    Sélectionnez une période et cliquez "Générer"
                  </td>
                </tr>
              ) : rowsToRender.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-7 py-10 text-center text-white/20 italic text-[13px]">
                    Aucun enregistrement trouvé
                  </td>
                </tr>
              ) : (
                rowsToRender.map((row) => (
                  <tr key={row.id} className="trow border-b border-white/[0.03]">
                    <td className="px-7 py-3.5">
                      <p className="text-[12px] font-semibold text-white whitespace-nowrap">{row.prenom || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-white/60 font-medium whitespace-nowrap">{row.nom || '—'}</td>
                    <td className="px-5 py-3.5 text-[12px] text-white/50 font-medium whitespace-nowrap">{roleLabel(row.role)}</td>
                    <td className="px-5 py-3.5 text-[12px] text-white/50 font-medium whitespace-nowrap">{row.cin || '—'}</td>
                    <td className="px-5 py-3.5 text-[12px] text-white/50 font-medium whitespace-nowrap">{row.tel || '—'}</td>
                    <td className="px-5 py-3.5 text-[12px] text-white/50 font-medium whitespace-nowrap">{row.email || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-lg whitespace-nowrap">{presenceTypeLabel(row)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
