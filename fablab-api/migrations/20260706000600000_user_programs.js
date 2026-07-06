export async function up(pgm) {
  pgm.addColumns('users', {
    programs: { type: 'jsonb', notNull: true, default: '[]' }
  });
}

export async function down(pgm) {
  pgm.dropColumns('users', ['programs']);
}
