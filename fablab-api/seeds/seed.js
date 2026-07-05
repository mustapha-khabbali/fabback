import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString: databaseUrl });

const defaultGateConfig = {
  stagiaire: [
    { id: 'project', label: 'Projet en cours', requiresProject: true },
    { id: 'information', label: "Demande d'information / Consultation" },
    { id: 'idea', label: "Amélioration / Demande d'idée" },
    { id: 'event', label: 'Event', requiresEvent: true },
    { id: 'internship', label: 'Stage' },
    { id: 'other', label: 'Other', requiresText: true }
  ],
  staff: [
    { id: 'visit_objective', label: 'Objectif de visite', requiresText: true },
    { id: 'project', label: 'Project', requiresProject: true },
    { id: 'event', label: 'Event', requiresEvent: true }
  ],
  visitor: [
    { id: 'visit_objective', label: 'Objectif de visite', requiresText: true },
    { id: 'event', label: 'Event', requiresEvent: true }
  ]
};

async function upsertUser(client, user) {
  await client.query(
    `
      insert into users (
        id, role, prenom, nom, email, bio, password_hash,
        charte_accepted, reproduction_accepted
      )
      values ($1, $2, $3, $4, $5, $6, $7, true, true)
      on conflict (id) do update set
        role = excluded.role,
        prenom = excluded.prenom,
        nom = excluded.nom,
        email = excluded.email,
        bio = excluded.bio,
        password_hash = coalesce(excluded.password_hash, users.password_hash),
        updated_at = now()
    `,
    [
      user.id,
      user.role,
      user.prenom,
      user.nom,
      user.email || null,
      user.bio || null,
      user.passwordHash || null
    ]
  );
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const adminEmail = process.env.ADMIN_SEED_EMAIL || 'sara.admin@fablab.local';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'change-me-now';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await upsertUser(client, {
      id: 'user-sara',
      role: 'administrateur',
      prenom: 'Sara',
      nom: 'Ladouy',
      email: adminEmail,
      bio: 'Responsable Fab Lab',
      passwordHash
    });

    await upsertUser(client, {
      id: 'admin-resp-entrepreneuriat',
      role: 'administrateur',
      prenom: 'Responsable',
      nom: 'Entrepreneuriat',
      bio: 'Responsable Entrepreneuriat'
    });

    await upsertUser(client, {
      id: 'admin-resp-incubateur',
      role: 'administrateur',
      prenom: 'Responsable',
      nom: 'Incubateur',
      bio: 'Responsable Incubateur'
    });

    await client.query(
      `
        insert into gate_config (id, config)
        values (1, $1::jsonb)
        on conflict (id) do update set
          config = excluded.config,
          updated_at = now()
      `,
      [JSON.stringify(defaultGateConfig)]
    );

    await client.query('commit');
    console.log('Seed complete');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
