const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });

async function migrateCreatedAt() {
  const scanParams = {
    TableName: "security-incident-reporting-dev-incidents",
  };

  const { Items } = await client.send(new ScanCommand(scanParams));
  const items = Items.map(unmarshall);

  for (const item of items) {
    if (typeof item.createdAt === "number") {
      const createdAtString = new Date(item.createdAt * 1000).toISOString();
      const updateParams = {
        TableName: "security-incident-reporting-dev-incidents",
        Key: marshall({ incidentId: item.incidentId }),
        UpdateExpression: "SET #createdAt = :createdAt, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#createdAt": "createdAt",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: marshall({
          ":createdAt": createdAtString,
          ":updatedAt": Math.floor(Date.now() / 1000),
        }),
      };
      await client.send(new UpdateItemCommand(updateParams));
      console.log(`Updated incident ${item.incidentId}: createdAt to ${createdAtString}`);
    }
  }
}

migrateCreatedAt().catch(console.error);