export const shorthands = undefined;

export async function up(pgm) {
  // Contact-sharing privacy, persisted server-side so it is visible to other
  // users and to their devices (previously localStorage-only, so approvals
  // never reached the requester).
  pgm.addColumns('users', {
    privacy_mode: { type: 'text', notNull: true, default: 'private' },
    allowed_contact_users: { type: 'jsonb', notNull: true, default: '[]' }
  });
  pgm.addConstraint('users', 'users_privacy_mode_check', {
    check: "privacy_mode in ('public', 'personalised', 'private')"
  });

  // Allow the new "your coordinates were shared" notification type.
  pgm.dropConstraint('notifications', 'notifications_type_check');
  pgm.addConstraint('notifications', 'notifications_type_check', {
    check: "type in ('contribution_request', 'help_request', 'help_feedback_request', 'review_request', 'CONTACT_REQUEST', 'project_invite', 'system', 'interaction_offer', 'interaction_approved', 'contact_approved')"
  });
}

export async function down(pgm) {
  pgm.dropConstraint('notifications', 'notifications_type_check');
  pgm.addConstraint('notifications', 'notifications_type_check', {
    check: "type in ('contribution_request', 'help_request', 'help_feedback_request', 'review_request', 'CONTACT_REQUEST', 'project_invite', 'system', 'interaction_offer', 'interaction_approved')"
  });
  pgm.dropConstraint('users', 'users_privacy_mode_check');
  pgm.dropColumns('users', ['privacy_mode', 'allowed_contact_users']);
}
