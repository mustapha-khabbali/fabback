export async function up(pgm) {
  pgm.addColumns('gate_config', {
    permanent_event_qr_id: { type: 'text' }
  });
}

export async function down(pgm) {
  pgm.dropColumns('gate_config', ['permanent_event_qr_id']);
}
