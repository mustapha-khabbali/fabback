export const shorthands = undefined;

export async function up(pgm) {
  pgm.alterColumn('users', 'id', {
    type: 'text',
    default: pgm.func('gen_random_uuid()::text')
  });
}

export async function down(pgm) {
  pgm.alterColumn('users', 'id', {
    type: 'text',
    default: null
  });
}
