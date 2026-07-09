import { query } from '../db/pool.js';

const EMPTY_INTERACTIONS = {
  reviewedOthers: [],
  helpedOthers: [],
  helpedBy: [],
  reviewedByOthers: []
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(11, 16);
}

function cloneEmptyInteractions() {
  return {
    reviewedOthers: [],
    helpedOthers: [],
    helpedBy: [],
    reviewedByOthers: []
  };
}

function averageCriteria(criteriaRatings) {
  const values = Object.values(criteriaRatings || {}).map(Number).filter((value) => value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildItem(row, peerId) {
  const criteriaRatings = row.review_ratings || {};
  const rating = Number(row.requester_rating || 0) || averageCriteria(criteriaRatings);
  const completedAt = row.rated_at || row.completed_at || row.approved_at || row.created_at;

  return {
    id: row.offer_id,
    userId: peerId,
    projectTitle: row.project_title || '',
    machine: row.machine_name || '',
    task: row.description || row.review_feedback || '',
    rating,
    comment: row.requester_comment || row.review_feedback || '',
    criteriaRatings,
    date: formatDate(completedAt),
    time: formatTime(completedAt)
  };
}

export async function attachInteractionsToUsers(users) {
  if (!users.length) return users;

  const userIds = users.map((user) => user.id).filter(Boolean);
  if (!userIds.length) {
    return users.map((user) => ({ ...user, interactions: cloneEmptyInteractions() }));
  }

  const result = await query(
    `
      select
        offers.id as offer_id,
        offers.responder_id,
        offers.review_ratings,
        offers.review_feedback,
        offers.requester_rating,
        offers.requester_comment,
        offers.created_at,
        offers.approved_at,
        offers.completed_at,
        offers.rated_at,
        requests.type,
        requests.requester_id,
        requests.project_title,
        requests.machine_name,
        requests.description
      from interaction_offers offers
      join interaction_requests requests on requests.id = offers.request_id
      where offers.status in ('completed', 'rated')
        and (requests.requester_id = any($1::text[]) or offers.responder_id = any($1::text[]))
      order by coalesce(offers.rated_at, offers.completed_at, offers.created_at) desc
    `,
    [userIds]
  );

  const interactionsByUser = new Map(userIds.map((id) => [id, cloneEmptyInteractions()]));

  result.rows.forEach((row) => {
    if (row.type === 'review') {
      if (interactionsByUser.has(row.responder_id)) {
        interactionsByUser.get(row.responder_id).reviewedOthers.push(buildItem(row, row.requester_id));
      }
      if (interactionsByUser.has(row.requester_id)) {
        interactionsByUser.get(row.requester_id).reviewedByOthers.push(buildItem(row, row.responder_id));
      }
      return;
    }

    if (interactionsByUser.has(row.responder_id)) {
      interactionsByUser.get(row.responder_id).helpedOthers.push(buildItem(row, row.requester_id));
    }
    if (interactionsByUser.has(row.requester_id)) {
      interactionsByUser.get(row.requester_id).helpedBy.push(buildItem(row, row.responder_id));
    }
  });

  return users.map((user) => ({
    ...user,
    interactions: interactionsByUser.get(user.id) || EMPTY_INTERACTIONS
  }));
}
