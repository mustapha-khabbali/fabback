export const mockUsers = [
  {
    id: 'user-1',
    prenom: 'John',
    nom: 'Doe',
    role: 'stagiaire',
    email: 'john.doe@example.com',
    tel: '0612345678',
    cin: 'AB123456',
    cef: 'CEF-001',
    pole: 'digital et intelligence artificiel',
    niveau: 'Technicien Spécialisé',
    filiere: 'Développement Digital',
    year: '1ère année',
    bio: 'Passionné par la robotique et le prototypage.',
    behaviorRating: 4.5,
    competitions: [
      { id: 'c1', name: 'Hackathon FabLab', date: '2024-03-15', won: true, validated: true }
    ],
    machineUsage: [
      { id: 'm1', machine: '3D Print', date: '2024-05-01' },
      { id: 'm2', machine: 'Laser', date: '2024-05-02' }
    ],
    checkins: 45,
    journalSubmissions: 12,
    completedProjectsCount: 4,
    points: 450,
    avatar: null
  },
  {
    id: 'user-2',
    prenom: 'Verification',
    nom: 'Test',
    role: 'stagiaire',
    email: 'test@fabweb.com',
    tel: '0600112233',
    cin: 'VV998877',
    cef: 'CEF-TEST',
    pole: 'digital et intelligence artificiel',
    niveau: 'Technicien Spécialisé',
    filiere: 'Développement Digital',
    year: '2ème année',
    option: 'Web Fullstack',
    bio: 'Utilisateur de test pour la vérification des fonctionnalités.',
    behaviorRating: 5.0,
    competitions: [],
    machineUsage: [],
    checkins: 20,
    journalSubmissions: 5,
    completedProjectsCount: 1,
    points: 120,
    avatar: null
  },
  {
    id: 'user-3',
    prenom: 'Ahmed',
    nom: 'Mansouri',
    role: 'administrateur',
    email: 'admin@fabweb.com',
    tel: '0655443322',
    cin: 'EF998877',
    cef: 'N/A',
    pole: 'Direction',
    year: 'N/A',
    bio: 'Gestionnaire principal du Fab Lab.',
    points: 0,
    avatar: null
  },
  {
    id: 'user-4',
    prenom: 'Siham',
    nom: 'Alaoui',
    role: 'formateur',
    email: 'siham@fabweb.com',
    tel: '0611223344',
    cin: 'CD112233',
    cef: 'N/A',
    pole: 'Industrie',
    bio: 'Formatrice en conception assistée par ordinateur.',
    points: 0,
    avatar: null
  }
];

export const mockProjects = [
  {
    id: 'proj-1',
    userId: 'user-2',
    supervisorIds: ['user-sara', 'user-4', 'user-3'],
    sdgIds: ['sdg-4', 'sdg-9', 'sdg-12'],
    contributors: [
      { userId: 'user-1', role: 'Co-Founder', status: 'ACCEPTED', accessLevel: 'CO_FOUNDER', isAdmin: true },
      { userId: 'user-4', role: 'Tutor', status: 'ACCEPTED', accessLevel: 'MEMBER' }
    ],
    title: "🚀 Projet Robotique : Bras Articulé CMC",
    description: "Conception et fabrication d'un bras robotisé à 4 degrés de liberté utilisant l'impression 3D et une carte Arduino Mega.",
    timestamp: Date.now() / 1000,
    journals: [
      {
        id: 'j1',
        date: "2026-04-10",
        title: "Conception de la structure",
        content: "Sélection des servomoteurs et impression des premières articulations en ABS.",
        image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400"
      },
      {
        id: 'j2',
        date: "2026-05-01",
        title: "Programmation Arduino",
        content: "Écriture du code de contrôle et étalonnage des angles de rotation."
      }
    ]
  },
  {
    id: 'proj-3',
    userId: 'user-1',
    supervisorIds: ['user-sara', 'user-4'],
    sdgIds: ['sdg-7', 'sdg-9', 'sdg-13'],
    contributors: [
      { userId: 'user-2', role: 'Prototype Tester', status: 'ACCEPTED', accessLevel: 'MEMBER' },
      { userId: 'user-4', role: 'Energy Mentor', status: 'ACCEPTED', accessLevel: 'MEMBER' }
    ],
    title: "🔋 Système d'Énergie Solaire Intelligent",
    description: "Optimisation de la consommation d'énergie pour une station météo autonome via un panneau solaire et une batterie Li-ion.",
    timestamp: (Date.now() / 1000) - 172800,
    journals: [
      {
        id: 'j3',
        date: "2026-04-25",
        title: "Analyse Énergétique",
        content: "Calcul de la capacité de la batterie et choix du régulateur de charge."
      }
    ]
  },
  {
    id: 'proj-4',
    userId: 'user-1',
    supervisorIds: ['user-sara', 'user-3'],
    sdgIds: ['sdg-2', 'sdg-9', 'sdg-15'],
    contributors: [
      { userId: 'user-2', role: 'Flight Test Lead', status: 'ACCEPTED', accessLevel: 'MEMBER' },
      { userId: 'user-4', role: 'Fabrication Coach', status: 'ACCEPTED', accessLevel: 'MEMBER' }
    ],
    title: "🛸 Dronix : Drone de Surveillance",
    description: "Développement d'un quadricoptère autonome pour la surveillance des zones agricoles, équipé d'une caméra thermique.",
    timestamp: (Date.now() / 1000) - 432000,
    journals: [
      {
        id: 'j4',
        timestamp: "2026-04-15",
        title: "Sélection des Composants",
        content: "Pour ce projet, nous avons opté pour un châssis en <b>carbone</b> ultra-léger. <br/><br/>Les moteurs sont des <i>Brushless 2300KV</i> pour une réactivité maximale. L'objectif est d'atteindre 20 minutes d'autonomie."
      },
      {
        id: 'j5',
        timestamp: "2026-04-20",
        title: "Configuration Betaflight",
        content: "Flashage du firmware sur la carte de vol F4. <ul class='list-disc ml-4 mt-2'><li>Réglage des PIDs</li><li>Calibration de l'accéléromètre</li><li>Test des moteurs via USB</li></ul>"
      },
      {
        id: 'j6',
        timestamp: "2026-05-02",
        title: "Premier Vol d'Essai",
        content: "Le drone est stable. La transmission vidéo (FPV) est claire jusqu'à 500m. <br/><b>Succès total !</b>"
      }
    ]
  },
  {
    id: 'proj-5',
    userId: 'user-1',
    supervisorIds: ['user-sara', 'user-4'],
    sdgIds: ['sdg-2', 'sdg-6', 'sdg-12'],
    contributors: [
      { userId: 'user-2', role: 'IoT Dashboard', status: 'ACCEPTED', accessLevel: 'MEMBER' }
    ],
    title: "🌱 Smart Hydroponics System",
    description: "Système de culture hydroponique automatisé avec monitoring via ESP32 et capteurs d'humidité/nutriments.",
    timestamp: (Date.now() / 1000) - 864000,
    journals: [
      {
        id: 'j7',
        timestamp: "2026-03-20",
        title: "Setup de la structure",
        content: "Installation des tuyaux PVC et du réservoir d'eau. Test de la pompe submersibles."
      },
      {
        id: 'j8',
        timestamp: "2026-04-05",
        title: "Capteurs pH et EC",
        content: "Calibration des capteurs de pH et de conductivité électrique. Intégration avec l'ESP32."
      }
    ]
  },
  {
    id: 'proj-2',
    userId: 'user-2',
    supervisorIds: ['user-sara', 'user-4'],
    sdgIds: ['sdg-7', 'sdg-9'],
    contributors: [
      { userId: 'user-1', role: 'Mechanical Design', status: 'ACCEPTED', accessLevel: 'MEMBER' }
    ],
    title: "☀️ Robot Solaire Autonome",
    description: "Un petit robot capable de suivre la lumière du soleil pour optimiser sa charge, conçu avec une structure découpée au laser.",
    timestamp: Date.now() / 1000,
    journals: [
      {
        id: 'j9',
        date: "2026-05-01",
        title: "Découpe Laser",
        content: "Découpe des pièces du châssis dans du bois de 5mm."
      }
    ]
  }
];
