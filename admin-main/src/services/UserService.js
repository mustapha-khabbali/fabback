export class UserService {
  /**
   * Retrieves a user by their ID from the provided users list.
   * @param {Array} usersList - The list of all users.
   * @param {string} id - The ID of the user to find.
   * @returns {Object|null} The user object, or null if not found.
   */
  static getUserById(usersList, id) {
    if (!id || !usersList || !Array.isArray(usersList)) return null;
    return usersList.find(u => u.id === id) || null;
  }

  /**
   * Dynamically formats and returns the user's full name.
   * If the user is not found, returns a fallback string.
   * @param {Array} usersList - The list of all users.
   * @param {string} id - The ID of the user.
   * @returns {string} The full name of the user.
   */
  static getUserName(usersList, id) {
    const u = this.getUserById(usersList, id);
    if (u) return `${u.prenom} ${u.nom}`;
    return 'Utilisateur Inconnu';
  }
}
