export const shorthands = undefined;

export async function up(pgm) {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('users', {
    id: { type: 'text', primaryKey: true },
    google_uid: { type: 'text', unique: true },
    role: {
      type: 'text',
      notNull: true,
      check: "role in ('stagiaire', 'formateur', 'administrateur', 'visiteur')"
    },
    prenom: { type: 'text', notNull: true, default: '' },
    nom: { type: 'text', notNull: true, default: '' },
    cin: { type: 'text' },
    cef: { type: 'text' },
    pole: { type: 'text' },
    niveau: { type: 'text' },
    filiere: { type: 'text' },
    annee: { type: 'text' },
    option: { type: 'text' },
    tel: { type: 'text' },
    email: { type: 'text', unique: true },
    bio: { type: 'text' },
    avatar: { type: 'text' },
    points: { type: 'integer', notNull: true, default: 0 },
    comportement_rating: { type: 'numeric(3,2)', notNull: true, default: 0 },
    is_deactivated: { type: 'boolean', notNull: true, default: false },
    charte_accepted: { type: 'boolean', notNull: true, default: false },
    reproduction_accepted: { type: 'boolean', notNull: true, default: false },
    password_hash: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('users', ['role']);
  pgm.createIndex('users', ['cin']);

  pgm.createTable('attendance', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    objective: { type: 'text' },
    comment: { type: 'text' },
    project_id: { type: 'uuid' },
    project_title: { type: 'text' },
    supervisor_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    supervisor_name: { type: 'text' },
    event_id: { type: 'uuid' },
    event_title: { type: 'text' },
    timestamp_in: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    timestamp_out: { type: 'timestamptz' },
    rating: { type: 'integer' },
    feedback_comment: { type: 'text' }
  });
  pgm.createIndex('attendance', ['user_id']);
  pgm.createIndex('attendance', ['timestamp_in']);
  pgm.createIndex('attendance', ['event_id']);

  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    owner_id: { type: 'text', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true, default: '' },
    phase: {
      type: 'text',
      notNull: true,
      default: 'MOC',
      check: "phase in ('MOC', 'POC', 'MVP', 'READY_TO_MARKET')"
    },
    image: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('projects', ['owner_id']);

  pgm.createTable('project_contributors', {
    project_id: { type: 'uuid', notNull: true, references: 'projects(id)', onDelete: 'cascade' },
    user_id: { type: 'text', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    role: { type: 'text', notNull: true, default: 'Tuteur' },
    access_level: {
      type: 'text',
      notNull: true,
      default: 'MEMBER',
      check: "access_level in ('CO_FOUNDER', 'MEMBER')"
    },
    is_admin: { type: 'boolean', notNull: true, default: false },
    status: {
      type: 'text',
      notNull: true,
      default: 'PENDING',
      check: "status in ('PENDING', 'ACCEPTED')"
    },
    pending_role: { type: 'text' },
    pending_access_level: { type: 'text' },
    pending_is_admin: { type: 'boolean' },
    pending_remove: { type: 'boolean' },
    approvals: { type: 'jsonb' },
    member_accepted: { type: 'boolean' },
    added_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.addConstraint('project_contributors', 'project_contributors_pkey', {
    primaryKey: ['project_id', 'user_id']
  });
  pgm.createIndex('project_contributors', ['user_id']);

  pgm.createTable('project_supervisors', {
    project_id: { type: 'uuid', notNull: true, references: 'projects(id)', onDelete: 'cascade' },
    user_id: { type: 'text', notNull: true, references: 'users(id)', onDelete: 'cascade' }
  });
  pgm.addConstraint('project_supervisors', 'project_supervisors_pkey', {
    primaryKey: ['project_id', 'user_id']
  });

  pgm.createTable('project_sdgs', {
    project_id: { type: 'uuid', notNull: true, references: 'projects(id)', onDelete: 'cascade' },
    sdg_id: { type: 'text', notNull: true }
  });
  pgm.addConstraint('project_sdgs', 'project_sdgs_pkey', {
    primaryKey: ['project_id', 'sdg_id']
  });

  pgm.createTable('journals', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects(id)', onDelete: 'cascade' },
    date: { type: 'date', notNull: true },
    title: { type: 'text' },
    content: { type: 'text', notNull: true, default: '' },
    image: { type: 'text' },
    phase: { type: 'text' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('journals', ['project_id']);

  pgm.createTable('events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'text', notNull: true },
    date_mode: { type: 'text', notNull: true, default: 'single' },
    date: { type: 'date' },
    date_from: { type: 'date' },
    date_to: { type: 'date' },
    spaces: { type: 'jsonb', notNull: true, default: '[]' },
    intervenants: { type: 'jsonb', notNull: true, default: '[]' },
    archived: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('events', ['archived']);

  pgm.createTable('gate_config', {
    id: { type: 'integer', primaryKey: true },
    config: { type: 'jsonb', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });

  pgm.createTable('recycle_bin', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    owner_id: { type: 'text', references: 'users(id)', onDelete: 'cascade' },
    type: {
      type: 'text',
      notNull: true,
      check: "type in ('project', 'journal', 'member')"
    },
    payload: { type: 'jsonb', notNull: true },
    deleted_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('recycle_bin', ['owner_id']);

  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    recipient_id: { type: 'text', references: 'users(id)', onDelete: 'cascade' },
    sender_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    type: {
      type: 'text',
      notNull: true,
      check: "type in ('contribution_request', 'help_request', 'help_feedback_request', 'review_request', 'CONTACT_REQUEST', 'project_invite', 'system')"
    },
    payload: { type: 'jsonb', notNull: true, default: '{}' },
    status: { type: 'text', notNull: true, default: 'unread' },
    handled: { type: 'boolean', notNull: true, default: false },
    approved: { type: 'boolean' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('notifications', ['recipient_id']);

  pgm.createTable('reviews', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects(id)', onDelete: 'cascade' },
    reviewer_id: { type: 'text', references: 'users(id)', onDelete: 'set null' },
    problem_solving: { type: 'integer' },
    technical_execution: { type: 'integer' },
    functionality: { type: 'integer' },
    innovation: { type: 'integer' },
    feasibility: { type: 'integer' },
    safety_compliance: { type: 'integer' },
    sdg_alignment: { type: 'integer' },
    intuition_usability: { type: 'integer' },
    feedback: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  });
  pgm.createIndex('reviews', ['project_id']);
}

export async function down(pgm) {
  pgm.dropTable('reviews');
  pgm.dropTable('notifications');
  pgm.dropTable('recycle_bin');
  pgm.dropTable('gate_config');
  pgm.dropTable('events');
  pgm.dropTable('journals');
  pgm.dropTable('project_sdgs');
  pgm.dropTable('project_supervisors');
  pgm.dropTable('project_contributors');
  pgm.dropTable('projects');
  pgm.dropTable('attendance');
  pgm.dropTable('users');
}
