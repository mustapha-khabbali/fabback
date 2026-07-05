export class InteractionService {
  /**
   * Converts camelCase keys into capitalized space-separated strings.
   * e.g. "technicalExecution" -> "Technical Execution"
   */
  static formatCriteriaKey(key) {
    if (!key) return '';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Returns the dictionary of known criteria definitions.
   */
  static getCriteriaLabels() {
    return {
      problemSolving: { label: 'Résolution de Problème', desc: 'Le prototype résout-il le problème cible ?' },
      technicalExecution: { label: 'Exécution Technique', desc: 'Qualité de fabrication (découpe laser, 3D, soudure).' },
      functionality: { label: 'Fonctionnalité', desc: 'Performance globale du prototype.' },
      innovation: { label: 'Innovation', desc: 'Caractère novateur du projet.' },
      feasibility: { label: 'Faisabilité', desc: 'Potentiel de production à coût durable.' },
      safetyCompliance: { label: 'Sécurité & Conformité', desc: 'Absence de fils exposés, bords coupants ou risques.' },
      sdgAlignment: { label: 'Alignement ODD', desc: 'Correspondance avec les Objectifs de Développement Durable.' },
      intuitionUsability: { label: 'Intuition & Ergonomie', desc: 'Facilité de prise en main sans manuel.' }
    };
  }

  /**
   * Safely retrieves the label and description for a criteria key.
   * Provides a fallback formatted string if the key is unknown.
   */
  static getCriteriaInfo(key) {
    const labels = this.getCriteriaLabels();
    return labels[key] || { label: this.formatCriteriaKey(key), desc: 'Critère additionnel d\'évaluation' };
  }
}
