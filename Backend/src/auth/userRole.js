const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { AWS_REGION } = require("../config/aws-config");
const { TABLES, USER_ROLES } = require("../config/config");

const client = new DynamoDBClient({ region: AWS_REGION });

/**
 * Fetch role from the server-owned application user record.
 * The public registration endpoint always creates REGULAR_USER records.
 * Elevated roles must be assigned through a trusted administrative process.
 */
async function getUserRoleById(userId) {
  if (!userId) return null;
  const result = await client.send(new GetItemCommand({
    TableName: TABLES.USERS,
    Key: { id: { S: userId } },
    ConsistentRead: true,
  }));
  if (!result.Item) return null;

  const record = unmarshall(result.Item);
  if (!Object.values(USER_ROLES).includes(record.role)) return USER_ROLES.REGULAR_USER;
  return record.role;
}

module.exports = { getUserRoleById };
