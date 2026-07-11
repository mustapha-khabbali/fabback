export const shorthands = undefined;

export async function up(pgm) {
  pgm.createTable('lab_closures', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    label: { type: 'text', notNull: true },
    date: { type: 'date', notNull: true },
    time_from: { type: 'time' },
    time_to: { type: 'time' },
    created_by: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('lab_closures', ['date']);
}

export async function down(pgm) {
  pgm.dropTable('lab_closures');
}
