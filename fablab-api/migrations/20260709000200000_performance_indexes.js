export const shorthands = undefined;

// Performance indexes (ENGINEERING_CLEANUP.md Phase 1.4).
// Most single-column indexes already exist in the initial schema; this adds
// only the two that match real query shapes:
// - open-attendance lookups (findLatestOpenAttendance + the auto-close sweep)
//   both filter on `timestamp_out is null` — a partial index keeps it tiny
//   no matter how many months of closed rows accumulate.
// - notifications are always read as `where recipient_id order by created_at
//   desc` — the composite replaces a sort on top of the single-column index.
// Deliberately NOT added from the original plan:
// - project_contributors(project_id, user_id): already the primary key.
// - interaction_* created_at composites: single-column indexes exist and
//   volumes are small; revisit only if listing queries show up in slow logs.

export async function up(pgm) {
  pgm.createIndex('attendance', ['user_id', { name: 'timestamp_in', sort: 'DESC' }], {
    name: 'attendance_open_user_timestamp_idx',
    where: 'timestamp_out is null'
  });

  pgm.createIndex('notifications', ['recipient_id', { name: 'created_at', sort: 'DESC' }], {
    name: 'notifications_recipient_created_idx'
  });
}

export async function down(pgm) {
  pgm.dropIndex('attendance', [], { name: 'attendance_open_user_timestamp_idx' });
  pgm.dropIndex('notifications', [], { name: 'notifications_recipient_created_idx' });
}
