// Comportement score engine.
//
//   score = clamp( bayesian(recognitions) - sum(decayed penalties), 0, 5 )
//
// Bayesian side: every user carries PRIOR_VOTES virtual votes at PRIOR_MEAN,
// so a single 5-star recognition nudges the score instead of crowning it.
// Penalty side: each VALIDATED report subtracts its category penalty, halved
// every HALF_LIFE_DAYS — the score describes who the person is now.
// The score is a pure function of the ledger; nothing else may write it.

export const BEHAVIOR_PARAMS = {
  PRIOR_MEAN: 3.5,
  PRIOR_VOTES: 5,
  HALF_LIFE_DAYS: 180,
  PENALTIES: {
    disrespect: 0.5,
    cooperation: 0.5,
    copy: 1.0
  },
  // A sender→target recognition only counts once per rolling week.
  RECOGNITION_CAP_WINDOW_DAYS: 7
};

export function computeScore({ recognitionRatings, validatedReports, now = new Date() }) {
  const hasEvents = recognitionRatings.length > 0 || validatedReports.length > 0;
  if (!hasEvents) return null;

  const { PRIOR_MEAN, PRIOR_VOTES, HALF_LIFE_DAYS, PENALTIES } = BEHAVIOR_PARAMS;

  const sumStars = recognitionRatings.reduce((sum, rating) => sum + rating, 0);
  const bayesian = (PRIOR_VOTES * PRIOR_MEAN + sumStars) / (PRIOR_VOTES + recognitionRatings.length);

  const msPerDay = 24 * 60 * 60 * 1000;
  const penalty = validatedReports.reduce((sum, report) => {
    const ageDays = Math.max(0, (now - new Date(report.createdAt)) / msPerDay);
    const base = PENALTIES[report.category] ?? 0;
    return sum + base * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
  }, 0);

  return Math.min(5, Math.max(0, bayesian - penalty));
}

export async function loadLedger(client, userId) {
  const recognitions = await client.query(
    'select rating from recognitions where target_id = $1 and counted = true',
    [userId]
  );
  const reports = await client.query(
    "select category, created_at from reports where target_id = $1 and status = 'valide'",
    [userId]
  );
  return {
    recognitionRatings: recognitions.rows.map((row) => row.rating),
    validatedReports: reports.rows.map((row) => ({ category: row.category, createdAt: row.created_at }))
  };
}

// Recomputes from the ledger and persists the snapshot on users so existing
// list/profile payloads keep working. Returns the fresh score (or null).
export async function recomputeAndPersist(client, userId) {
  const ledger = await loadLedger(client, userId);
  const score = computeScore(ledger);
  await client.query(
    'update users set comportement_rating = $1, updated_at = now() where id = $2',
    [score === null ? null : Math.round(score * 100) / 100, userId]
  );
  return score;
}
