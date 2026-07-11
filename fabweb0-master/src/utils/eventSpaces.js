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
