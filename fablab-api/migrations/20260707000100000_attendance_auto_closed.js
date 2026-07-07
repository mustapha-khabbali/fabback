export async function up(pgm) {
  pgm.addColumns('attendance', {
    auto_closed: { type: 'boolean', notNull: true, default: false }
  });
}

export async function down(pgm) {
  pgm.dropColumns('attendance', ['auto_closed']);
}
