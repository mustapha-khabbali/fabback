// Full OFPPT Pole → Niveau → Filière → Options mapping
export const trainingData = {
  "digital et intelligence artificiel": {
    "Technicien Spécialisé": [
      { name: "Infrastructure Digitale", options: ["Systèmes et Réseaux", "Cloud Computing", "Cybersécurité"] },
      { name: "Développement Digital", options: ["Mobile", "Web Fullstack"] },
      { name: "Marketing Digital Et Communication", options: ["Web Marketer"] }
    ],
    "Technicien": [{ name: "N", options: [] }],
    "Qualification": [{ name: "N", options: [] }]
  },
  "Agriculture": {
    "Technicien Spécialisé": [
      { name: "Agriculture De Précision", options: ["N"] },
      { name: "Management Des Exploitations Agricoles", options: ["Commercialisation des Produits Agricoles (Agrobusiness)", "Gestion des entreprises et Coopératives Agricoles"] },
      { name: "Techniques Agricoles", options: ["Agriculture Biologique", "Gestion des Sols et systèmes d'Irrigation", "Production végétale"] }
    ],
    "Technicien": [{ name: "N", options: [] }],
    "Qualification": [{ name: "Opérateur Agricole", options: ["N"] }]
  },
  "Agro-Industrie": {
    "Technicien Spécialisé": [{ name: "Transformation et valorisation des plantes Aromatiques et médicinales", options: ["N"] }],
    "Technicien": [{ name: "N", options: [] }],
    "Qualification": [{ name: "N", options: [] }]
  },
  "BTP": {
    "Technicien Spécialisé": [
      { name: "Géomètre Topographe", options: ["N"] },
      { name: "Génie Civil", options: ["Génie Civil option Travaux Publics", "Génie Civil option Laboratoire BTP"] }
    ],
    "Technicien": [{ name: "Dessinateur Projeteur En Bâtiment", options: ["Bâtiment option Métreur", "Bâtiment option Projeteur"] }],
    "Qualification": [{ name: "N", options: [] }]
  },
  "Industrie": {
    "Technicien Spécialisé": [
      { name: "Diagnostic Et Électronique Embarquée Automobile", options: ["N"] },
      { name: "Qualité Hygiène Sécurité Et Environnement (Qhse)", options: ["N"] }
    ],
    "Technicien": [{ name: "Electromécanique des engins motorisés", options: ["Electromécanique des engins motorisés option Machinisme agricole", "Electromécanique des engins motorisés option Automobile"] }],
    "Qualification": [{ name: "N", options: [] }]
  },
  "Tourisme Hôtellerie Restauration": {
    "Technicien Spécialisé": [
      { name: "Management Touristique", options: ["E-Travel Agency", "Management des destinations durables"] },
      { name: "Management hôtelier", options: ["Hébergement et Réception"] }
    ],
    "Technicien": [
      { name: "Arts culinaires", options: ["Cuisine Gastronomique", "Pâtisserie-Chocolaterie"] },
      { name: "Service de Restauration ''Arts de table''", options: ["N"] }
    ],
    "Qualification": [{ name: "N", options: [] }]
  },
  "Logistique et Transport": {
    "Technicien Spécialisé": [{ name: "Exploitation", options: ["Logistique", "Transport"] }],
    "Technicien": [
      { name: "Moniteur Auto-Ecole", options: ["N"] },
      { name: "Logistique", options: ["N"] }
    ],
    "Qualification": [{ name: "N", options: [] }]
  },
  "Gestion et Commerce": {
    "Technicien Spécialisé": [{ name: "Gestion des Entreprises", options: ["Comptabilité et Finance", "Commerce et Marketing", "Ressources Humaines"] }],
    "Technicien": [{ name: "Assistant Administratif", options: ["Comptabilité", "Commerce", "Gestion"] }],
    "Qualification": [{ name: "N", options: [] }]
  },
  "Artisanat": {
    "Technicien Spécialisé": [{ name: "N", options: [] }],
    "Technicien": [
      { name: "Menuiserie D'Art", options: ["N"] },
      { name: "Tapisserie", options: ["N"] }
    ],
    "Qualification": [
      { name: "Couture traditionnelle", options: ["N"] },
      { name: "Tissage Traditionnel", options: ["N"] }
    ]
  },
  "AIG": {
    "Technicien Spécialisé": [{ name: "infographie prépresse", options: ["N"] }],
    "Technicien": [{ name: "N", options: [] }],
    "Qualification": [{ name: "N", options: [] }]
  }
};

export const poleOptions = [
  "digital et intelligence artificiel",
  "Agriculture",
  "Agro-Industrie",
  "BTP",
  "Industrie",
  "Tourisme Hôtellerie Restauration",
  "Logistique et Transport",
  "Gestion et Commerce",
  "Artisanat",
  "AIG"
];

export const niveauOptions = [
  { value: "Technicien Spécialisé", label: "Technicien Spécialisé (TS)" },
  { value: "Technicien", label: "Technicien (T)" },
  { value: "Qualification", label: "Qualification (Q)" }
];

export const yearOptions = [
  { value: "1ère année", label: "1ère année" },
  { value: "2ème année", label: "2ème année" }
];

// Compute filière options from pole + niveau
export function getFiliereOptions(pole, niveau) {
  if (!pole || !niveau || !trainingData[pole] || !trainingData[pole][niveau]) return [];
  return trainingData[pole][niveau];
}

// Compute option list from pole + niveau + filiere + year
export function getOptionChoices(pole, niveau, filiereName, year) {
  if (year !== "2ème année" || !pole || !niveau || !filiereName || filiereName === "N") return [];
  const filieres = trainingData[pole]?.[niveau] || [];
  const filiere = filieres.find(f => f.name === filiereName);
  if (!filiere || !filiere.options || filiere.options.length === 0 || filiere.options.includes("N")) return [];
  return filiere.options;
}
