function makeUserId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `user-${crypto.randomUUID()}`;
  }
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureUserIdentity(user) {
  if (!user || typeof user !== 'object') return user;
  // Never fabricate an identity for an empty user ({}). Doing so creates a
  // "phantom" logged-in user with no role, which bypasses the login screen
  // and hides role-gated tabs (e.g. Mon Projet). An empty user must stay empty.
  if (Object.keys(user).length === 0) return user;
  return {
    ...user,
    id: user.id || user.uid || makeUserId()
  };
}

export function getUserIdentityCandidates(user) {
  return [user?.id, user?.uid, user?.cin, user?.email]
    .filter(Boolean)
    .map(String);
}

export function getPrimaryUserId(user) {
  return getUserIdentityCandidates(user)[0] || '';
}

export function isCurrentUserId(user, value) {
  if (!value) return false;
  return getUserIdentityCandidates(user).includes(String(value));
}

export function findUserByIdentity(users, value, currentUser) {
  if (!value) return null;
  if (currentUser && isCurrentUserId(currentUser, value)) return currentUser;
  return (users || []).find((user) => getUserIdentityCandidates(user).includes(String(value))) || null;
}

export function mergeUserByIdentity(users, user) {
  const normalized = ensureUserIdentity(user);
  if (!normalized?.id) return users || [];

  const candidates = getUserIdentityCandidates(normalized);
  let found = false;
  const merged = (users || []).map((existing) => {
    const sameUser = getUserIdentityCandidates(existing).some((candidate) => candidates.includes(candidate));
    if (!sameUser) return existing;
    found = true;
    return { ...existing, ...normalized };
  });

  return found ? merged : [...merged, normalized];
}
