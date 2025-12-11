import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

/**
 * Get item by primary key
 */
export async function getItem(tableName, key) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });
  const response = await docClient.send(command);
  return response.Item;
}

/**
 * Put item (create or replace)
 */
export async function putItem(tableName, item) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
  await docClient.send(command);
  return item;
}

/**
 * Update item with expression
 */
export async function updateItem(tableName, key, updateExpression, expressionValues, expressionNames = null) {
  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: 'ALL_NEW',
  };
  if (expressionNames) {
    params.ExpressionAttributeNames = expressionNames;
  }
  const command = new UpdateCommand(params);
  const response = await docClient.send(command);
  return response.Attributes;
}

/**
 * Delete item
 */
export async function deleteItem(tableName, key) {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });
  await docClient.send(command);
  return true;
}

/**
 * Query with optional index
 * @param {string} tableName - Table name
 * @param {string} keyCondition - Key condition expression
 * @param {object} expressionValues - Expression attribute values
 * @param {string|null} indexName - Optional GSI name
 * @param {object|string|null} options - ExpressionAttributeNames object, or FilterExpression string (legacy)
 */
export async function query(tableName, keyCondition, expressionValues, indexName = null, options = null) {
  const params = {
    TableName: tableName,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionValues,
  };
  if (indexName) {
    params.IndexName = indexName;
  }
  // Support both legacy (string = filterExpression) and new (object with names/filter)
  if (options) {
    if (typeof options === 'string') {
      // Legacy: options is FilterExpression
      params.FilterExpression = options;
    } else if (typeof options === 'object') {
      // New: options contains ExpressionAttributeNames and/or FilterExpression
      if (options.FilterExpression) {
        params.FilterExpression = options.FilterExpression;
      }
      // Check if it's ExpressionAttributeNames (keys start with #)
      const keys = Object.keys(options);
      if (keys.some(k => k.startsWith('#'))) {
        params.ExpressionAttributeNames = options;
      }
    }
  }
  const command = new QueryCommand(params);
  const response = await docClient.send(command);
  return response.Items;
}

/**
 * Scan table (use sparingly)
 */
export async function scan(tableName, filterExpression = null, expressionValues = null) {
  const params = { TableName: tableName };
  if (filterExpression) {
    params.FilterExpression = filterExpression;
    params.ExpressionAttributeValues = expressionValues;
  }
  const command = new ScanCommand(params);
  const response = await docClient.send(command);
  return response.Items;
}

export default { getItem, putItem, updateItem, deleteItem, query, scan };
