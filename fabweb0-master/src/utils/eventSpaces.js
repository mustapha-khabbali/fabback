export function eventSpaceLabel(space) {
  if (typeof space === 'string') return space;
  if (!space || typeof space !== 'object') return '';
  return String(space.label || space.name || space.title || space.value || '');
}

export function getEventSpaces(event) {
  return (Array.isArray(event?.spaces) ? event.spaces : [])
    .map(eventSpaceLabel)
    .map((space) => space.trim())
    .filter(Boolean);
}

// Mirrors the API's isFabLabSpace matcher (routes/attendance.js): accents
// stripped, lowercased, non-alphanumerics removed, then substring match.
export function isFabLabSpace(space) {
  return eventSpaceLabel(space)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .includes('fablab');
}
