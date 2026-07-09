export async function up(pgm) {
  pgm.dropConstraint('notifications', 'notifications_type_check');
  pgm.addConstraint('notifications', 'notifications_type_check', {
    check: "type in ('contribution_request', 'help_request', 'help_feedback_request', 'review_request', 'CONTACT_REQUEST', 'project_invite', 'system', 'interaction_offer', 'interaction_approved')"
  });

  pgm.createTable('interaction_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type: {
      type: 'text',
      notNull: true,
      check: "type in ('help', 'review')"
    },
    requester_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    project_id: { type: 'uuid', references: 'projects(id)', onDelete: 'set null' },
    project_title: { type: 'text' },
    machine_name: { type: 'text' },
    description: { type: 'text' },
    status: {
      type: 'text',
      notNull: true,
      default: 'open',
      check: "status in ('open', 'approved', 'completed', 'rated', 'cancelled')"
    },
    approved_offer_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('interaction_requests', ['requester_id']);
  pgm.createIndex('interaction_requests', ['project_id']);

  pgm.createTable('interaction_offers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    request_id: { type: 'uuid', notNull: true, references: 'interaction_requests(id)', onDelete: 'cascade' },
    responder_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    status: {
      type: 'text',
      notNull: true,
      default: 'offered',
      check: "status in ('offered', 'approved', 'rejected', 'completed', 'rated', 'cancelled')"
    },
    review_id: { type: 'uuid', references: 'reviews(id)', onDelete: 'set null' },
    review_ratings: { type: 'jsonb', notNull: true, default: '{}' },
    review_feedback: { type: 'text' },
    requester_rating: { type: 'integer' },
    requester_comment: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    approved_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    rated_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.addConstraint('interaction_offers', 'interaction_offers_request_responder_unique', {
    unique: ['request_id', 'responder_id']
  });
  pgm.createIndex('interaction_offers', ['request_id']);
  pgm.createIndex('interaction_offers', ['responder_id']);
  pgm.createIndex('interaction_offers', ['status']);
}

export async function down(pgm) {
  pgm.dropTable('interaction_offers');
  pgm.dropTable('interaction_requests');

  pgm.dropConstraint('notifications', 'notifications_type_check');
  pgm.addConstraint('notifications', 'notifications_type_check', {
    check: "type in ('contribution_request', 'help_request', 'help_feedback_request', 'review_request', 'CONTACT_REQUEST', 'project_invite', 'system')"
  });
}
