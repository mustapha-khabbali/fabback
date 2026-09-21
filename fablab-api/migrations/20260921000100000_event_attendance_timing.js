export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumns('events', {
    start_time: { type: 'time' },
    end_time: { type: 'time' }
  });
  pgm.addColumn('attendance', {
    scheduled_exit_at: { type: 'timestamptz' }
  });
  pgm.createIndex('attendance', ['scheduled_exit_at'], {
    name: 'attendance_scheduled_exit_at_idx',
    where: 'scheduled_exit_at is not null'
  });
}

export async function down(pgm) {
  pgm.dropIndex('attendance', ['scheduled_exit_at'], { name: 'attendance_scheduled_exit_at_idx' });
  pgm.dropColumn('attendance', 'scheduled_exit_at');
  pgm.dropColumns('events', ['start_time', 'end_time']);
}
