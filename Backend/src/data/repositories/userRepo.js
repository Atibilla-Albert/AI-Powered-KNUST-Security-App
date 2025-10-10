/**
 * User repository for DynamoDB operations
 */

const { dynamoDbClient } = require('../dynamodbclient');
const { User } = require('../models/users');
const { DYNAMO_DB } = require('../../config/aws-config');

/**
 * Create a new user
 * @async
 * @param {User} user - User to create
 * @returns {Promise<User>} Created user
 * @throws {Error} If user is invalid or creation fails
 */
const createUser = async (user) => {
  if (!user || !user.toDynamoItem) {
    throw new Error('Invalid user object provided for creation');
  }
  try {
    await dynamoDbClient.create(DYNAMO_DB.TABLES.USERS, user.toDynamoItem());
    console.log(`Successfully created user with ID: ${user.id}`);
    return user;
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

/**
 * Get user by ID
 * @async
 * @param {string} id - User ID
 * @returns {Promise<User|null>} User or null if not found
 * @throws {Error} If ID is invalid or fetch fails
 */
const getUserById = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid user ID provided');
  }
  try {
    if (!dynamoDbClient || !dynamoDbClient.getById) {
      throw new Error('DynamoDB client or getById method is not properly initialized');
    }
    const item = await dynamoDbClient.getById(DYNAMO_DB.TABLES.USERS, id);
    if (!item) {
      console.log(`User with ID ${id} not found`);
      return null;
    }
    const user = User.fromDynamoItem(item);
    console.log(`Successfully fetched user with ID: ${id}`);
    return user;
  } catch (error) {
    console.error(`Error getting user ${id}:`, error.message);
    throw new Error(`Failed to get user ${id}: ${error.message}`);
  }
};

/**
 * Get user by email
 * @async
 * @param {string} email - User email
 * @returns {Promise<User|null>} User or null if not found
 * @throws {Error} If email is invalid or fetch fails
 */
const getUserByEmail = async (email) => {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email provided');
  }
  try {
    const result = await dynamoDbClient.query(
      DYNAMO_DB.TABLES.USERS,
      'email-index',
      'email = :email',
      { ':email': email },
      1
    );
    if (result.Items.length === 0) {
      console.log(`User with email ${email} not found`);
      return null;
    }
    const user = User.fromDynamoItem(result.Items[0]);
    console.log(`Successfully fetched user with email: ${email}`);
    return user;
  } catch (error) {
    console.error(`Error getting user with email ${email}:`, error.message);
    throw new Error(`Failed to get user with email ${email}: ${error.message}`);
  }
};

/**
 * Get user by Cognito ID
 * @async
 * @param {string} cognitoId - Cognito user ID
 * @returns {Promise<User|null>} User or null if not found
 * @throws {Error} If Cognito ID is invalid or fetch fails
 */
const getUserByCognitoId = async (cognitoId) => {
  if (!cognitoId || typeof cognitoId !== 'string') {
    throw new Error('Invalid Cognito ID provided');
  }
  try {
    const result = await dynamoDbClient.query(
      DYNAMO_DB.TABLES.USERS,
      'cognitoId-index',
      'cognitoId = :cognitoId',
      { ':cognitoId': cognitoId },
      1
    );
    if (result.Items.length === 0) {
      console.log(`User with Cognito ID ${cognitoId} not found`);
      return null;
    }
    const user = User.fromDynamoItem(result.Items[0]);
    console.log(`Successfully fetched user with Cognito ID: ${cognitoId}`);
    return user;
  } catch (error) {
    console.error(`Error getting user with Cognito ID ${cognitoId}:`, error.message);
    throw new Error(`Failed to get user with Cognito ID ${cognitoId}: ${error.message}`);
  }
};

/**
 * Update user
 * @async
 * @param {User} user - Updated user
 * @returns {Promise<User>} Updated user
 * @throws {Error} If user is invalid or update fails
 */
const updateUser = async (user) => {
  if (!user || !user.toDynamoItem || !user.id) {
    throw new Error('Invalid user object provided for update');
  }
  try {
    user.updatedAt = new Date().toISOString();
    await dynamoDbClient.update(DYNAMO_DB.TABLES.USERS, user.toDynamoItem());
    console.log(`Successfully updated user with ID: ${user.id}`);
    return user;
  } catch (error) {
    console.error(`Error updating user ${user.id}:`, error.message);
    throw new Error(`Failed to update user ${user.id}: ${error.message}`);
  }
};

/**
 * Update user's credibility score
 * @async
 * @param {string} id - User ID
 * @param {number} credibilityScore - New credibility score
 * @returns {Promise<User>} Updated user
 * @throws {Error} If ID is invalid, score is invalid, or update fails
 */
const updateUserCredibilityScore = async (id, credibilityScore) => {
  if (!id || typeof id !== 'string' || typeof credibilityScore !== 'number') {
    throw new Error('Invalid ID or credibility score provided');
  }
  try {
    const user = await getUserById(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    user.updateCredibilityScore(credibilityScore);
    return await updateUser(user);
  } catch (error) {
    console.error(`Error updating credibility score for user ${id}:`, error.message);
    throw new Error(`Failed to update credibility score for user ${id}: ${error.message}`);
  }
};

/**
 * Get users by role
 * @async
 * @param {string} role - User role
 * @param {number} [limit=10] - Maximum number of items to return
 * @param {Object} [lastEvaluatedKey] - Last evaluated key for pagination
 * @returns {Promise<Object>} Users and last evaluated key
 * @throws {Error} If role is invalid or query fails
 */
const getUsersByRole = async (role, limit = 10, lastEvaluatedKey) => {
  if (!role || typeof role !== 'string' || limit <= 0) {
    throw new Error('Invalid role or limit provided');
  }
  try {
    const result = await dynamoDbClient.query(
      DYNAMO_DB.TABLES.USERS,
      'role-index',
      'role = :role',
      { ':role': role },
      limit,
      lastEvaluatedKey
    );
    const users = result.Items.map(item => User.fromDynamoItem(item));
    console.log(`Successfully fetched ${users.length} users with role ${role}`);
    return {
      items: users,
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (error) {
    console.error(`Error getting users with role ${role}:`, error.message);
    throw new Error(`Failed to get users with role ${role}: ${error.message}`);
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByCognitoId,
  updateUser,
  updateUserCredibilityScore,
  getUsersByRole
};