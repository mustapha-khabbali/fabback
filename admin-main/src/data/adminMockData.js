// Static placeholder data for the admin dashboard UI.
// Will be replaced by real Firebase-backed data once the backend is wired up.

export const mockPresentStagiaires = [
  { id: 'u1', userId: 'user-1', prenom: 'Ahmed', nom: 'El Mansouri', name: 'Ahmed El Mansouri', role: 'Stagiaire', cin: 'AB123456', tel: '0612345678', email: 'ahmed@example.com', presenceType: 'Projet en cours', projectId: 'proj-1', projectTitle: 'Robot Solaire Autonome', timeIn: '09:15' },
  { id: 'u2', userId: 'user-2', prenom: 'Laila', nom: 'Bennani', name: 'Laila Bennani', role: 'Stagiaire', cin: 'CD778899', tel: '0600112233', email: 'laila@example.com', presenceType: 'Event', eventTitle: 'Hackathon Innovation', timeIn: '10:05' },
];

export const mockMetrics = {
  present: mockPresentStagiaires.length,
  total: 12,
  exits: 4,
  avgRating: 4.3,
};

export const mockHistory = [
  { name: 'Ahmed El Mansouri', role: 'stagiaire', objective: 'Projet en cours', projectId: 'proj-1', projectTitle: 'Robot Solaire Autonome', date: '2026-07-03', timeIn: '09:15', timeOut: '12:30', rating: 5, comment: 'Super séance de prototypage !' },
  { name: 'Laila Bennani', role: 'stagiaire', objective: 'Event', eventId: 'evt-demo-1', eventTitle: 'Hackathon Innovation', date: '2026-07-03', timeIn: '10:05', timeOut: '11:45', rating: 4, comment: 'Très bon événement.' },
  { name: 'Yassine Tazi', role: 'visiteur', objective: 'Objectif de visite', date: '2026-07-03', timeIn: '14:20', timeOut: '17:10', rating: 5, comment: 'Découverte du FabLab.' },
  { name: 'Siham Alaoui', role: 'formateur', objective: 'Project', projectId: 'proj-2', projectTitle: 'Drone Agricole', date: '2026-07-02', timeIn: '09:30', timeOut: '16:00', rating: 3, comment: "Un peu d'attente pour la CNC." },
];

export const mockOuvrages = [
  { name: 'Ultimaker S5', category: 'Impression 3D', status: 'Disponible', icon: '🖨️' },
  { name: 'Trotec Speedy 400', category: 'Découpe Laser', status: 'En usage', icon: '⚡' },
  { name: 'Roland SRM-20', category: 'Fraiseuse CNC', status: 'Maintenance', icon: '⚙️' },
  { name: 'Creality Ender 3', category: 'Impression 3D', status: 'Disponible', icon: '🖨️' },
  { name: 'Station de Soudure', category: 'Électronique', status: 'Disponible', icon: '🔌' },
  { name: 'Oscilloscope Rigol', category: 'Électronique', status: 'Disponible', icon: '📉' },
];
