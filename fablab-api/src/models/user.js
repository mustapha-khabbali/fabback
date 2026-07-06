export function toPublicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    role: user.role,
    prenom: user.prenom,
    nom: user.nom,
    cin: user.cin,
    cef: user.cef,
    pole: user.pole,
    niveau: user.niveau,
    filiere: user.filiere,
    annee: user.annee,
    year: user.annee,
    option: user.option,
    tel: user.tel,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    points: user.points,
    comportementRating: Number(user.comportement_rating || 0),
    isDeactivated: user.is_deactivated,
    charteAccepted: user.charte_accepted,
    reproductionAccepted: user.reproduction_accepted,
    projects: [],
    recycleBin: [],
    interactions: {
      reviewedOthers: [],
      helpedOthers: [],
      helpedBy: [],
      reviewedByOthers: []
    },
    createdAt: user.created_at
  };
}

export function isProfileComplete(user) {
  return Boolean(
    user
    && user.prenom
    && user.nom
    && user.role
    && user.charte_accepted
    && user.reproduction_accepted
  );
}
