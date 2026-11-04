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
  console.log("Creating DynamoDB item", { tableName });
  await client.send(new PutItemCommand({
    TableName: tableName,
    Item: marshall(itemWithDefaults),
  }));
  return itemWithDefaults;
};

const getItemById = async (tableName, incidentId) => {
  if (!incidentId) {
    console.error("Invalid incidentId provided:", incidentId);
    return null;
  }

  const params = {
    TableName: tableName,
    Key: marshall({ incidentId }),
  };
  console.log("Getting DynamoDB item", { tableName });
  try {
    const result = await client.send(new GetItemCommand(params));
    return result.Item ? unmarshall(result.Item) : null;
  } catch (error) {
    console.error("Error getting item:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      statusCode: error.$metadata?.httpStatusCode,
      tableName,
    });
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
  console.log("Updating DynamoDB item", { tableName });
  const result = await client.send(new UpdateItemCommand(params));
  return result.Attributes ? unmarshall(result.Attributes) : null;
};

const deleteItem = async (tableName, incidentId) => {
  const params = {
    TableName: tableName,
    Key: marshall({ incidentId }),
  };
  console.log("Deleting DynamoDB item", { tableName });
  await client.send(new DeleteItemCommand(params));
};

const scanTable = async (params) => {
  console.log("Scanning DynamoDB table", { tableName: params.TableName });
  console.log("DynamoDBClient config:", JSON.stringify({
    region: client.config.region,
    endpoint: client.config.endpoint ? client.config.endpoint.toString() : "undefined",
    credentials: client.config.credentials ? "set" : "unset",
  }, null, 2));
  try {
    const command = new ScanCommand(params);
    const result = await client.send(command);
    console.log("DynamoDB scan completed", { itemCount: result.Items?.length || 0 });
    return result.Items ? result.Items.map(item => unmarshall(item)) : [];
  } catch (error) {
    console.error("Scan error:", JSON.stringify({
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      statusCode: error.$metadata?.httpStatusCode,
    }, null, 2));
    throw error;
  }
};

const queryTable = async (params) => {
  console.log("Querying DynamoDB table", { tableName: params.TableName });
  console.log("DynamoDBClient config:", JSON.stringify({
    region: client.config.region,
    endpoint: client.config.endpoint ? client.config.endpoint.toString() : "undefined",
    credentials: client.config.credentials ? "set" : "unset",
  }, null, 2));
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
    console.log("DynamoDB query completed", { itemCount: allItems.length });
    return allItems;
  } catch (error) {
    console.error("Query error:", JSON.stringify({
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      statusCode: error.$metadata?.httpStatusCode,
    }, null, 2));
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