// const { createItem, getItemById, updateItem, deleteItem } = require('./dynamodbclient');
// const { User } = require('./models/users');
// const { Incident } = require('./models/incidents');

// // Replace with your actual DynamoDB table names
// const USERS_TABLE = 'UsersTable';
// const INCIDENTS_TABLE = 'IncidentsTable';

// async function testUser() {
//   // Create a new user
//   const user = new User({
//     email: 'testuser@example.com',
//     cognitoId: 'cognito-test-id',
//     firstName: 'Test',
//     lastName: 'User',
//     role: 'ADMIN'
//   });

//   // Create in DynamoDB
//   const created = await createItem(USERS_TABLE, user.toDynamoItem());
//   console.log('Created user:', created);

//   // Get from DynamoDB
//   const fetched = await getItemById(USERS_TABLE, created.id);
//   console.log('Fetched user:', fetched);

//   // Update user
//   const updated = await updateItem(USERS_TABLE, created.id, { firstName: 'Updated' });
//   console.log('Updated user:', updated);

//   // Delete user
//   const deleted = await deleteItem(USERS_TABLE, created.id);
//   console.log('Deleted user:', deleted);
// }

// async function testIncident() {
//   // Create a new incident
//   const incident = new Incident({
//     reporterId: 'test-reporter-id',
//     description: 'Test incident',
//     severityLevel: 3,
//     incidentType: 'PHYSICAL_SECURITY',
//     location: { latitude: 1.23, longitude: 4.56 }
//   });

//   // Create in DynamoDB
//   const created = await createItem(INCIDENTS_TABLE, incident.toDynamoItem());
//   console.log('Created incident:', created);

//   // Get from DynamoDB
//   const fetched = await getItemById(INCIDENTS_TABLE, created.id);
//   console.log('Fetched incident:', fetched);

//   // Update incident
//   const updated = await updateItem(INCIDENTS_TABLE, created.id, { description: 'Updated incident' });
//   console.log('Updated incident:', updated);

//   // Delete incident
//   const deleted = await deleteItem(INCIDENTS_TABLE, created.id);
//   console.log('Deleted incident:', deleted);
// }

// (async () => {
//   try {
//     await testUser();
//     await testIncident();
//   } catch (err) {
//     console.error('Test failed:', err);
//   }
// })();