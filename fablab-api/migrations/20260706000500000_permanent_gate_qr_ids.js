export async function up(pgm) {
  pgm.addColumns('gate_config', {
    permanent_gate_in_qr_id: { type: 'text' },
    permanent_gate_out_qr_id: { type: 'text' }
  });
}

export async function down(pgm) {
  pgm.dropColumns('gate_config', ['permanent_gate_in_qr_id', 'permanent_gate_out_qr_id']);
}
