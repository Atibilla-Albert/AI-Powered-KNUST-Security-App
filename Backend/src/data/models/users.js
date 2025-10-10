const { v4: uuidv4 } = require('uuid');
const { USER_ROLES } = require('../../config/config');

class User {
  /**
   * Create a new User instance
   * @param {Object} data
   */
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.cognitoId = data.cognitoId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role;
    this.organizationId = data.organizationId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || this.createdAt;
    this.credibilityScore = data.credibilityScore !== undefined ? data.credibilityScore : 70;
    this.phoneNumber = data.phoneNumber || null;

    this.validate();
  }

  /**
   * Validate user fields
   */
  validate() {
    if (!this.email) throw new Error('Email is required.');
    if (!this.cognitoId) throw new Error('Cognito ID is required.');
    if (!this.firstName) throw new Error('First name is required.');
    if (!this.lastName) throw new Error('Last name is required.');
    if (!Object.values(USER_ROLES).includes(this.role)) {
      throw new Error(`Invalid user role: ${this.role}`);
    }
    if (this.credibilityScore < 0 || this.credibilityScore > 100) {
      throw new Error(`Invalid credibility score: ${this.credibilityScore}`);
    }
  }

  /**
   * Full name getter
   * @returns {string}
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Convert to a DynamoDB-compatible item
   * @returns {Object}
   */
  toDynamoItem() {
    return {
      id: this.id,
      email: this.email,
      cognitoId: this.cognitoId,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      organizationId: this.organizationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      credibilityScore: this.credibilityScore,
      phoneNumber: this.phoneNumber
    };
  }

  /**
   * Build from a DynamoDB item
   * @param {Object} item
   * @returns {User}
   */
  static fromDynamoItem(item) {
    return new User(item);
  }

  /**
   * Output public-safe version of user
   * @returns {Object}
   */
  toPublicJSON() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      phoneNumber: this.phoneNumber,
      credibilityScore: this.credibilityScore,
      createdAt: this.createdAt
    };
  }

  /**
   * Update user credibility score
   * @param {number} newScore
   */
  updateCredibilityScore(newScore) {
    if (typeof newScore !== 'number' || newScore < 0 || newScore > 100) {
      throw new Error(`Invalid credibility score: ${newScore}`);
    }
    this.credibilityScore = newScore;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Check role match
   * @param {string} role
   * @returns {boolean}
   */
  hasRole(role) {
    return this.role === role;
  }

  /**
   * Admin check
   * @returns {boolean}
   */
  isAdmin() {
    return this.role === USER_ROLES.ADMIN;
  }

  /**
   * Security personnel check
   * @returns {boolean}
   */
  isSecurityPersonnel() {
    return this.role === USER_ROLES.SECURITY_PERSONNEL;
  }

  /**
   * Update from object (PATCH-like)
   * @param {Object} updates
   */
  updateFromObject(updates) {
    const fields = [
      'firstName',
      'lastName',
      'phoneNumber',
      'organizationId',
      'credibilityScore',
      'role'
    ];

    for (const key of fields) {
      if (updates[key] !== undefined) {
        this[key] = updates[key];
      }
    }

    this.updatedAt = new Date().toISOString();
    this.validate(); // Ensure integrity after update
  }
}

module.exports = {
  User,
  USER_ROLES
};
