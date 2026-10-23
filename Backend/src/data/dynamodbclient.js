const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  requestTimeout: 5000, // 5 seconds timeout
  maxAttempts: 3, // Retry up to 3 times
});

const createItem = async (tableName, item) => {
  const itemWithDefaults = {
    ...item,
    status: item.status || "NEW",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  console.info("Creating DynamoDB item", { tableName });
  await client.send(new PutItemCommand({
    TableName: tableName,
    Item: marshall(itemWithDefaults),
  }));
  return itemWithDefaults;
};

const getItemById = async (tableName, incidentId) => {
  if (!incidentId) {
    console.warn("DynamoDB lookup rejected: missing identifier");
    return null;
  }

  const params = {
    TableName: tableName,
    Key: marshall({ incidentId }),
  };
  console.debug("Reading DynamoDB item", { tableName });
  try {
    const result = await client.send(new GetItemCommand(params));
    return result.Item ? unmarshall(result.Item) : null;
  } catch (error) {
    console.error("DynamoDB read failed", { tableName, name: error.name || "Error", code: error.code, statusCode: error.$metadata?.httpStatusCode });
    throw error; // Propagate error to caller
  }
};

const updateItem = async (tableName, incidentId, updates) => {
  let UpdateExpression = "SET";
  const ExpressionAttributeValues = {};
  const ExpressionAttributeNames = {};
  let prefix = " ";
  for (const key in updates) {
    if (updates[key] !== undefined) {
      UpdateExpression += `${prefix}#${key} = :${key}`;
      ExpressionAttributeValues[`:${key}`] = updates[key];
      ExpressionAttributeNames[`#${key}`] = key;
      prefix = ", ";
    }
  }
  UpdateExpression += ", #updatedAt = :updatedAt";
  ExpressionAttributeValues[":updatedAt"] = new Date().toISOString();
  ExpressionAttributeNames["#updatedAt"] = "updatedAt";

  const params = {
    TableName: tableName,
    Key: marshall({ incidentId }),
    UpdateExpression,
    ExpressionAttributeValues: marshall(ExpressionAttributeValues),
    ExpressionAttributeNames,
    ReturnValues: "ALL_NEW",
  };
  console.info("Updating DynamoDB item", { tableName });
  const result = await client.send(new UpdateItemCommand(params));
  return result.Attributes ? unmarshall(result.Attributes) : null;
};

const deleteItem = async (tableName, incidentId) => {
  const params = {
    TableName: tableName,
    Key: marshall({ incidentId }),
  };
  console.info("Deleting DynamoDB item", { tableName });
  await client.send(new DeleteItemCommand(params));
};

const scanTable = async (params) => {
  console.debug("Executing DynamoDB scan", { tableName: params.TableName });

  try {
    const command = new ScanCommand(params);
    const result = await client.send(command);
    console.debug("DynamoDB scan completed", { tableName: params.TableName, count: result.Items?.length || 0 });
    return result.Items ? result.Items.map(item => unmarshall(item)) : [];
  } catch (error) {
    console.error("DynamoDB scan failed", { tableName: params.TableName, name: error.name || "Error", code: error.code, statusCode: error.$metadata?.httpStatusCode });
    throw error;
  }
};

const queryTable = async (params) => {
  console.debug("Executing DynamoDB query", { tableName: params.TableName });

  try {
    let allItems = [];
    let lastEvaluatedKey = null;
    do {
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      const result = await client.send(new QueryCommand(params));
      allItems = allItems.concat(result.Items ? result.Items.map(item => unmarshall(item)) : []);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    console.debug("DynamoDB query completed", { tableName: params.TableName, count: allItems.length });
    return allItems;
  } catch (error) {
    console.error("DynamoDB query failed", { tableName: params.TableName, name: error.name || "Error", code: error.code, statusCode: error.$metadata?.httpStatusCode });
    throw error;
  }
};

module.exports = {
  createItem,
  getItemById,
  updateItem,
  deleteItem,
  scanTable,
  queryTable, // Corrected export name to match function
};