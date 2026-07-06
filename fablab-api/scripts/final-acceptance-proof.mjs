import jwt from 'jsonwebtoken';
import pg from 'pg';

const baseUrl = process.env.PROOF_API_URL || 'http://localhost:4000/api';
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const adminEmail = process.env.ADMIN_SEED_EMAIL || 'sara.admin@fablab.local';
const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'change-me-now';

if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (!jwtSecret) throw new Error('JWT_SECRET is required');

const pool = new pg.Pool({ connectionString: databaseUrl });

function print(title, data) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(data, null, 2));
}

async function request(method, path, { token, body, expectedStatus } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (expectedStatus && response.status === expectedStatus) {
    return { status: response.status, data };
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }
  return { status: response.status, data };
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);

  const health = await request('GET', '/health');
  print('health through API', health);

  const adminLogin = await request('POST', '/auth/admin', {
    body: { email: adminEmail, password: adminPassword }
  });
  const adminToken = adminLogin.data.token;
  print('1 admin logs in', {
    status: adminLogin.status,
    user: adminLogin.data.user,
    tokenIssued: Boolean(adminToken)
  });

  const event = await request('POST', '/events', {
    token: adminToken,
    body: {
      title: 'Final Acceptance Event',
      description: 'Step 9 proof event',
      dateMode: 'single',
      date,
      spaces: ['FabLab'],
      intervenants: ['Sara Ladouy']
    }
  });
  print('1 admin creates event', event);

  const gateConfigPayload = {
    config: {
      stagiaire: [
        { id: 'project', label: 'Projet en cours', requiresProject: true },
        { id: 'event', label: 'Event', requiresEvent: true },
        { id: 'other', label: 'Other', requiresText: true }
      ],
      staff: [
        { id: 'visit_objective', label: 'Objectif de visite', requiresText: true },
        { id: 'project', label: 'Project', requiresProject: true }
      ],
      visitor: [
        { id: 'visit_objective', label: 'Objectif de visite', requiresText: true }
      ]
    }
  };
  const gatePublish = await request('PUT', '/gate/config', {
    token: adminToken,
    body: gateConfigPayload
  });
  print('1 admin publishes gate config', gatePublish);

  const formateur = await request('POST', '/users', {
    token: adminToken,
    body: {
      role: 'formateur',
      prenom: 'Nora',
      nom: 'Supervisor',
      email: 'nora.supervisor@step9.local',
      charteAccepted: true,
      reproductionAccepted: true
    }
  });
  const formateurToken = jwt.sign(
    { sub: formateur.data.user.id, role: formateur.data.user.role, email: formateur.data.user.email },
    jwtSecret,
    { expiresIn: '7d' }
  );
  const user = await request('POST', '/users', {
    token: adminToken,
    body: {
      role: 'visiteur',
      prenom: 'Adam',
      nom: 'Proof',
      email: 'adam.proof@step9.local',
      charteAccepted: true,
      reproductionAccepted: true
    }
  });
  const userToken = jwt.sign(
    { sub: user.data.user.id, role: user.data.user.role, email: user.data.user.email },
    jwtSecret,
    { expiresIn: '7d' }
  );
  const userMe = await request('GET', '/auth/me', { token: userToken });
  print('2 user authenticates with accepted bearer token', {
    createdUser: user.data.user,
    authMe: userMe.data
  });

  const register = await request('POST', '/auth/register', {
    token: userToken,
    body: {
      role: 'stagiaire',
      prenom: 'Adam',
      nom: 'Proof',
      cin: 'AA111111',
      cef: 'CEF111111',
      pole: 'Digital',
      niveau: 'TS',
      filiere: 'Developpement Digital',
      annee: '2026',
      option: 'Full Stack',
      tel: '0612345678',
      email: 'adam.proof@step9.local',
      charteAccepted: true,
      reproductionAccepted: true
    }
  });
  print('2 user registers as stagiaire', register);

  const gateFetch = await request('GET', '/gate/config', { token: userToken });
  print('2 user fetches gate config', {
    status: gateFetch.status,
    configKeys: Object.keys(gateFetch.data.config),
    events: gateFetch.data.events.map((item) => ({ id: item.id, title: item.title }))
  });

  const checkIn = await request('POST', '/attendance/check-in', {
    token: userToken,
    body: {
      objective: 'Projet en cours',
      comment: 'Final acceptance check-in',
      supervisorId: formateur.data.user.id,
      supervisorName: `${formateur.data.user.prenom} ${formateur.data.user.nom}`
    }
  });
  print("2 user checks in with 'Projet en cours' + encadrant", checkIn);

  const attendanceDashboard = await request('GET', '/attendance', { token: adminToken });
  const dashboardEntry = attendanceDashboard.data.attendance.find((entry) => entry.id === checkIn.data.attendance.id);
  print('3 attendance appears in dashboard query', {
    found: Boolean(dashboardEntry),
    entry: dashboardEntry
  });

  const attendancePv = await request('GET', `/attendance?date_from=${date}&date_to=${date}&role=stagiaire`, { token: adminToken });
  const pvEntry = attendancePv.data.attendance.find((entry) => entry.id === checkIn.data.attendance.id);
  print('3 attendance appears in PV range query', {
    found: Boolean(pvEntry),
    count: attendancePv.data.attendance.length,
    entry: pvEntry
  });

  const project = await request('POST', '/projects', {
    token: userToken,
    body: {
      title: 'Final Acceptance Project',
      description: 'Project created by the final proof',
      phase: 'POC',
      supervisorIds: [formateur.data.user.id],
      sdgIds: ['sdg-4'],
      journals: [
        {
          date,
          title: 'Final proof journal',
          content: 'Journal persisted with a server-generated id',
          phase: 'POC',
          version: 1
        }
      ]
    }
  });
  print('4 user creates project + journal', {
    project: project.data.project,
    journalIdsAreUuid: project.data.project.journals.map((journal) => /^[0-9a-f-]{36}$/.test(journal.id))
  });

  const helpRequest = await request('POST', '/notifications', {
    token: userToken,
    body: {
      type: 'help_request',
      projectId: project.data.project.id,
      projectTitle: project.data.project.title,
      machineName: 'Assemblage',
      message: 'Need help for final proof',
      status: 'pending'
    }
  });
  const reviewRequest = await request('POST', '/notifications', {
    token: userToken,
    body: {
      type: 'review_request',
      projectId: project.data.project.id,
      projectTitle: project.data.project.title,
      description: 'Ready for final review',
      message: 'Please review final proof project',
      status: 'pending'
    }
  });
  print('4 user sends help + review requests', {
    helpRecipients: helpRequest.data.notifications.map((item) => item.recipientId),
    reviewRecipients: reviewRequest.data.notifications.map((item) => item.recipientId),
    helpIdsAreUuid: helpRequest.data.notifications.every((item) => /^[0-9a-f-]{36}$/.test(item.id)),
    reviewIdsAreUuid: reviewRequest.data.notifications.every((item) => /^[0-9a-f-]{36}$/.test(item.id))
  });

  const adminNotifications = await request('GET', '/notifications', { token: adminToken });
  const formateurNotifications = await request('GET', '/notifications', { token: formateurToken });
  print('4 supervisors receive notifications', {
    adminNotificationTypes: adminNotifications.data.notifications.map((item) => item.type),
    formateurNotificationTypes: formateurNotifications.data.notifications.map((item) => item.type),
    hasHelp: adminNotifications.data.notifications.some((item) => item.type === 'help_request'),
    hasReview: adminNotifications.data.notifications.some((item) => item.type === 'review_request'),
    formateurHasHelp: formateurNotifications.data.notifications.some((item) => item.type === 'help_request'),
    formateurHasReview: formateurNotifications.data.notifications.some((item) => item.type === 'review_request')
  });

  const review = await request('POST', '/reviews', {
    token: adminToken,
    body: {
      projectId: project.data.project.id,
      problemSolving: 5,
      technicalExecution: 4,
      functionality: 5,
      innovation: 4,
      feasibility: 4,
      safetyCompliance: 5,
      sdgAlignment: 5,
      intuitionUsability: 4,
      feedback: 'Final acceptance review'
    }
  });
  print('4 review submitted with 8 criteria', review);

  const checkOut = await request('POST', '/attendance/check-out', {
    token: userToken,
    body: {
      rating: 5,
      feedbackComment: 'Great session'
    }
  });
  print('5 user checks out with rating and entry closes', {
    status: checkOut.status,
    attendance: checkOut.data.attendance,
    closed: Boolean(checkOut.data.attendance.timestampOut)
  });

  const editedUser = await request('PATCH', `/users/${user.data.user.id}`, {
    token: adminToken,
    body: { bio: 'Edited during final acceptance proof', points: 7 }
  });
  const deactivatedUser = await request('PATCH', `/users/${user.data.user.id}/deactivate`, {
    token: adminToken,
    body: {}
  });
  const rejectedAfterDeactivate = await request('GET', '/gate/config', {
    token: userToken,
    expectedStatus: 403
  });
  print("6 admin edits then deactivates user; user's next API call is rejected", {
    editedUser: editedUser.data.user,
    deactivatedUser: deactivatedUser.data.user,
    rejectedCall: rejectedAfterDeactivate
  });

  const dbReview = await pool.query(
    `
      select project_id, reviewer_id, problem_solving, technical_execution, functionality,
             innovation, feasibility, safety_compliance, sdg_alignment, intuition_usability
      from reviews
      where id = $1
    `,
    [review.data.review.id]
  );
  print('database confirmation', {
    review: dbReview.rows[0],
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
