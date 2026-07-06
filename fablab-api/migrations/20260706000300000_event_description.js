export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumn('events', {
    description: { type: 'text', notNull: true, default: '' }
  });
}

export async function down(pgm) {
  pgm.dropColumn('events', 'description');
}
