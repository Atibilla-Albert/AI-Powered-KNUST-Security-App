const { User } = require('../data/models/users');
const { TABLES } = require('../config/config');
const { createItem, getItemById, updateItem, deleteItem } = require('../data/dynamodbclient');
const { generateApiResponse } = require('../utils/api-response');

/**
 * Create a new user
 */
exports.createUser = async (event) => {
  try {
    const userData = JSON.parse(event.body);
    const user = new User(userData);
    user.validate?.();

    const savedUser = await createItem(TABLES.USERS, user.toDynamoItem());
    return generateApiResponse(201, User.fromDynamoItem(savedUser).toPublicJSON());
  } catch (error) {
    console.error('Error creating user:', error);
    return generateApiResponse(500, { error: 'Failed to create user' });
  }
};

/**
 * Get user by ID
 */
exports.getUser = async (event) => {
  try {
    const userId = event.pathParameters.id;
    const userItem = await getItemById(TABLES.USERS, userId);

    if (!userItem) {
      return generateApiResponse(404, { error: 'User not found' });
    }

    return generateApiResponse(200, User.fromDynamoItem(userItem).toPublicJSON());
  } catch (error) {
    console.error('Error getting user:', error);
    return generateApiResponse(500, { error: 'Failed to get user' });
  }
};

/**
 * Update a user
 */
exports.updateUser = async (event) => {
  try {
    const userId = event.pathParameters.id;
    const updates = JSON.parse(event.body);
    const updatedUser = await updateItem(TABLES.USERS, userId, updates);

    return generateApiResponse(200, User.fromDynamoItem(updatedUser).toPublicJSON());
  } catch (error) {
    console.error('Error updating user:', error);
    return generateApiResponse(500, { error: 'Failed to update user' });
  }
};

/**
 * Delete a user
 */
exports.deleteUser = async (event) => {
  try {
    const userId = event.pathParameters.id;
    await deleteItem(TABLES.USERS, userId);

    return generateApiResponse(204, {});
  } catch (error) {
    console.error('Error deleting user:', error);
    return generateApiResponse(500, { error: 'Failed to delete user' });
  }
};

/**
 * List all users
 */
exports.listUsers = async () => {
  // Implement your scan/query logic here if needed
  return generateApiResponse(501, { error: 'Not implemented' });
};
