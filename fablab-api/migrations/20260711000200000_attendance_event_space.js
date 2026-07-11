export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumns('attendance', {
    event_space: { type: 'text' }
  });
}

export async function down(pgm) {
  pgm.dropColumns('attendance', ['event_space']);
}
