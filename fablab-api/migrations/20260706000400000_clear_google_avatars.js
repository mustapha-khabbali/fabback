export async function up(pgm) {
  pgm.sql(`
    update users
    set avatar = null
    where avatar ilike '%googleusercontent.com%'
  `);
}

export async function down() {}
