export const shorthands = undefined;

// Behavior ledger: recognitions (reconnaissance) and reports (signalement).
// comportement_rating becomes a value COMPUTED from this ledger — never set
// by hand. Null rating = "not yet rated" (displayed as "—"); legacy manual
// values are reset because they no longer have a defensible source.
export async function up(pgm) {
  pgm.createTable('recognitions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    sender_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    target_id: { type: 'text', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    rating: { type: 'integer', notNull: true, check: 'rating between 1 and 5' },
    machine_name: { type: 'text' },
    project_id: { type: 'uuid' },
    project_title: { type: 'text' },
    comment: { type: 'text', notNull: true },
    // counted=false: over the weekly sender→target cap, or revoked by admin.
    counted: { type: 'boolean', notNull: true, default: true },
    revoked_by: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    revoked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('recognitions', ['target_id', 'created_at']);
  pgm.createIndex('recognitions', ['sender_id', 'target_id', 'created_at']);

  pgm.createTable('reports', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    sender_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    target_id: { type: 'text', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    category: {
      type: 'text',
      notNull: true,
      check: "category in ('disrespect', 'cooperation', 'copy')"
    },
    details: { type: 'text', notNull: true },
    status: {
      type: 'text',
      notNull: true,
      default: 'nouveau',
      check: "status in ('nouveau', 'valide', 'rejete')"
    },
    reviewed_by: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('reports', ['target_id', 'created_at']);
  pgm.createIndex('reports', ['status', 'created_at']);

  pgm.alterColumn('users', 'comportement_rating', { notNull: false, default: null });
  pgm.sql('update users set comportement_rating = null');
}

export async function down(pgm) {
  pgm.alterColumn('users', 'comportement_rating', { notNull: true, default: 0 });
  pgm.sql('update users set comportement_rating = 0 where comportement_rating is null');
  pgm.dropTable('reports');
  pgm.dropTable('recognitions');
}
