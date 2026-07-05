export const JOURNAL_COLORS = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84', '#EE5253', '#5F27CD', '#222F3E'];
export const PHASE_ORDER = ['MOC', 'POC', 'MVP', 'READY_TO_MARKET'];

export const ALL_SDGS = Array.from({ length: 17 }, (_, i) => ({
  id: `sdg-${i + 1}`,
  number: i + 1,
  image: `/sdg/${i + 1}_result.webp`
}));

export function normalizePhase(phase) {
  if (phase === 'IDEA' || !phase) return 'MOC';
  if (phase === 'PROTOTYPING') return 'POC';
  return phase;
}

export function groupJournalsByPhase(journals) {
  const grouped = {};
  (journals || []).forEach((j) => {
    const p = normalizePhase(j.phase);
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(j);
  });
  return grouped;
}
