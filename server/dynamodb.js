const AWS = require("aws-sdk");

var dynamodb, docClient;

/**
 * Configures the AWS SDK with the specified configuration.
 * @param config
 * @returns {Promise<void>}
 */
const configureAWS = async (config) => {
	let options = {}
	if (config.awsRegion)
		options.region = config.awsRegion;
	if (config.awsEndpoint)
		options.endpoint = config.awsEndpoint;
	if (config.accessKeyId && config.secretAccessKey) {
		options.accessKeyId = config.accessKeyId;
		options.secretAccessKey = config.secretAccessKey;
	}
	if (config.awsRegion || config.awsEndpoint || (config.accessKeyId && config.secretAccessKey))
		await AWS.config.update(options);
	dynamodb = new AWS.DynamoDB();
	docClient = new AWS.DynamoDB.DocumentClient();
}

/**
 * Lists all tables in the current AWS account.
 * @returns {Promise<void>}
 */
const listTables = async () => {
	try {
		const data = await dynamodb.listTables({}).promise();
		console.log("Tables:", data.TableNames);
	} catch (err) {
		console.error("Error listing tables:", err);
	}
}

/**
 * Checks if a DynamoDB table with the specified name exists.
 * @param tableName
 * @returns {Promise<boolean>}
 */
const tableExists = async (tableName) => {
	const params = {
		TableName: tableName
	};

	try {
		await dynamodb.describeTable(params).promise();
		return true;
	} catch (err) {
		if (err.code === 'ResourceNotFoundException') {
			return false;
		}
		throw err;
	}
};

/**
 * Creates a DynamoDB table with specified configurations.
 * @param tableName The name of the DynamoDB table to create.
 * @param keys An array of objects defining the keys for the table, including name, type, and key type (HASH or RANGE).
 * @param provisionedThroughput Optional. An object specifying the read and write capacity units for the table.
 * @param gsiConfig Optional. Configuration for global secondary indexes (if needed).
 * @returns {Promise<void>}
 *
 * Example usage:
 * const tableName = 'WhitelistAddresses';
 * const keys = [
 *   { name: "id", type: "S", keyType: "HASH" },		// Partition key
 *   { name: "type", type: "S", keyType: "RANGE" }		// Sort key
 * ];
 *
 * // Calling createTable without specifying provisionedThroughput, using defaults
 * createTable(tableName, keys)
 */
const createTable = async (tableName, keys, gsiConfig = null, provisionedThroughput = null) => {
	console.log(`Checking if '${tableName}' table exists...`);

	const exists = await tableExists(tableName);
	if (exists) {
		console.log(`Table '${tableName}' already exists.`);
		return;
	}

	console.log(`Creating table '${tableName}'...`);

	// Set default values for provisionedThroughput if not provided
	if (!provisionedThroughput) {
		provisionedThroughput = {
			ReadCapacityUnits: 10, // Default read capacity units
			WriteCapacityUnits: 10 // Default write capacity units
		};
		console.log(`Using default provisioned throughput: ${JSON.stringify(provisionedThroughput)}`);
	}

	// Transform the keys parameter into KeySchema and AttributeDefinitions
	const keySchema = keys.map(key => ({ AttributeName: key.name, KeyType: key.keyType }));
	const attributeDefinitions = keys.map(key => ({ AttributeName: key.name, AttributeType: key.type }));

	let params = {
		TableName: tableName,
		KeySchema: keySchema,
		AttributeDefinitions: attributeDefinitions,
		ProvisionedThroughput: provisionedThroughput
	};

	// Add GSI configuration to the table creation parameters if provided
	if (gsiConfig && gsiConfig.attributeName && gsiConfig.attributeType) {
		params.AttributeDefinitions.push({
			AttributeName: gsiConfig.attributeName,
			AttributeType: gsiConfig.attributeType
		});

		params.GlobalSecondaryIndexes = [{
			IndexName: `${gsiConfig.attributeName}Index`,
			KeySchema: [{ AttributeName: gsiConfig.attributeName, KeyType: "HASH" }],
			Projection: { ProjectionType: "ALL" },
			ProvisionedThroughput: provisionedThroughput
		}];
	}

	try {
		const data = await dynamodb.createTable(params).promise();
		console.log(`Created table '${tableName}'.`, JSON.stringify(data, null, 2));
	} catch (err) {
		console.error(`Error creating table '${tableName}':`, err);
		throw err;
	}
};

/**
 * Creates a DynamoDB table intended for use as a counter store. This table
 * will have a primary key named "CounterName" of type String.
 *
 * @param {string} tableName The name of the DynamoDB table to be created.
 * @returns {Promise<void>} A promise that resolves when the table is successfully created
 *                          or rejects with an error if the creation fails.
 */
const createCounterTable = async (tableName) => {
	const keys = [
		{ name: "CounterName", type: "S", keyType: "HASH" }  // Primary key
	];

	await createTable(tableName, keys)
		.then(() => console.log(`Table ${tableName} created successfully.`))
		.catch(err => console.error(`Error creating table ${tableName}:`, err));
};

/**
 * Increments a numeric counter in a specified DynamoDB table by 1, or initializes it and returns 1 if it doesn't exist.
 *
 * @param {string} tableName The name of the DynamoDB table containing the counter.
 * @param {string} counterName The name of the counter to increment, which corresponds
 *                             to the primary key value of the counter item.
 * @returns {Promise<number>} A promise that resolves with the new value of the counter
 *                            after the increment, or rejects with an error if the update fails.
 */
async function incrementCounter(tableName, counterName) {
	const params = {
		TableName: tableName,
		Key: {
			'CounterName': counterName
		},
		UpdateExpression: 'SET #val = if_not_exists(#val, :start) + :inc',
		ExpressionAttributeNames: {
			'#val': 'Value'
		},
		ExpressionAttributeValues: {
			':inc': 1,
			':start': 0 // Starting value, ensuring the first increment sets it to 1
		},
		ReturnValues: 'UPDATED_NEW'
	};

	try {
		const result = await docClient.update(params).promise();
		return result.Attributes.Value;
	} catch (error) {
		console.error(`Error updating counter: ${error}`);
		throw error;
	}
}


/**
 * Adds an item to a DynamoDB table.
 * @param tableName
 * @param item
 * @returns {Promise<void>}
 */
const addItemToTable = async (tableName, item) => {
	const params = {
		TableName: tableName,
		Item: item
	};

	try {
		await docClient.put(params).promise();
	} catch (err) {
		console.error(`Failed to add item to table '${tableName}':`, err);
	}
};

/**
 * Adds or updates an item in a DynamoDB table with the given attributes.
 * @param tableName The name of the DynamoDB table.
 * @param key An object representing the primary key of the item to add or update.
 * @param attributes An object containing the attributes to add or update.
 * @returns {Promise<void>}
 */
const updateItem = async (tableName, key, attributes) => {
	// Check if primary key attributes are included in the attributes object
	Object.keys(key).forEach(keyAttr => {
		if (attributes.hasOwnProperty(keyAttr)) {
			throw new Error(`Cannot update primary key attribute: ${keyAttr}`);
		}
	});

	// Generate the update expression and attribute values
	let updateExpression = 'SET';
	const expressionAttributeValues = {};
	const attributeNames = {};
	let prefix = '';

	Object.keys(attributes).forEach((attr, idx) => {
		const placeholder = `:val${idx}`;
		updateExpression += `${prefix}#${attr} = ${placeholder}`;
		attributeNames[`#${attr}`] = attr;
		expressionAttributeValues[placeholder] = attributes[attr];
		prefix = ', ';
	});

	console.log('updateExpression:', updateExpression);

	const params = {
		TableName: tableName,
		Key: key,
		UpdateExpression: updateExpression,
		ExpressionAttributeNames: attributeNames, // Needed if attributes contain reserved words
		ExpressionAttributeValues: expressionAttributeValues,
		ReturnValues: "UPDATED_NEW",
	};

	try {
		const result = await docClient.update(params).promise();
		console.log(`Item added/updated successfully:`, result);
	} catch (err) {
		console.error(`Failed to add/update item:`, err);
		throw err; // Rethrow the error to handle it in the calling function
	}
};

/**
 * Deletes an item from a DynamoDB table.
 * @param {string} tableName The name of the DynamoDB table.
 * @param {object} key The primary key of the item to delete.
 * @returns {Promise<void>}
 */
const deleteItem = async (tableName, key) => {
	const params = {
		TableName: tableName,
		Key: key
	};

	try {
		await docClient.delete(params).promise();
		// console.log(`Item deleted successfully from table '${tableName}'.`);
	} catch (err) {
		console.error(`Failed to delete item from table '${tableName}':`, err);
		throw err;
	}
};


/**
 * Checks if an item with a specific key and value exists in a DynamoDB table.
 *
 * @param {string} tableName - The name of the DynamoDB table.
 * @param {string} indexName - The name of the index to query on (optional).
 * @param {string} key - The key (attribute name) to check for in the table or index.
 * @param {string} value - The value to check for the specified key.
 * @returns {Promise<boolean>} - True if an item with the specified key and value exists, false otherwise.
 */
const checkItemExists = async (tableName, indexName, key, value) => {
	const params = {
		TableName: tableName,
		// Conditional index name usage
		...(indexName && { IndexName: indexName }),
		KeyConditionExpression: '#key = :value',
		ExpressionAttributeNames: {
			'#key': key,
		},
		ExpressionAttributeValues: {
			':value': value,
		},
		Limit: 1, // We only need to check if at least one item exists
	};

	try {
		const data = await docClient.query(params).promise();
		const exists = data.Items && data.Items.length > 0;
		console.log(`${key} with value ${value} ${exists ? 'exists' : 'does not exist'}.`);
		return exists;
	} catch (err) {
		console.error(`Error querying for ${key} with value ${value}:`, err);
		throw err;
	}
};

/**
 * Fetches an item from a DynamoDB table by a specific key and value.
 * @param {string} tableName The name of the DynamoDB table to query.
 * @param {string|null} indexName The name of the Global Secondary Index (GSI) to query, if applicable. Pass `null` to query the main table.
 * @param {string} key The name of the attribute (key) to query on. This could be a primary key attribute or any attribute indexed by a specified GSI.
 * @param {*} value The value of the `key` attribute to match for in the query.
 * @returns {Promise<*>}
 */
const getItem = async (tableName, indexName, key, value) => {
	const params = {
		TableName: tableName,
		// Conditional index name usage
		...(indexName && { IndexName: indexName }),
		KeyConditionExpression: '#key = :value',
		ExpressionAttributeNames: {
			'#key': key,
		},
		ExpressionAttributeValues: {
			':value': value,
		},
		Limit: 1, // We only need to fetch the first matching item
	};

	try {
		const data = await docClient.query(params).promise();
		// If an item exists, return the first item, otherwise return null
		return data.Items && data.Items.length > 0 ? data.Items[0] : null;
	} catch (err) {
		console.error(`Error querying for ${key} with value ${value}:`, err);
		throw err;
	}
};

/**
 * Fetches an item from a DynamoDB table by its primary key.
 * @param tableName The name of the DynamoDB table.
 * @param primaryKey An object representing the primary key of the item to fetch.
 * @returns {Promise<*>} The item if found, otherwise null.
 */
const getItemByPK = async (tableName, primaryKey) => {
	const params = {
		TableName: tableName,
		Key: primaryKey
	};

	try {
		const data = await docClient.get(params).promise();
		// If an item exists, return the item, otherwise return null
		return data.Item ? data.Item : null;
	} catch (err) {
		console.error(`Error fetching item by primary key:`, err);
		throw err;
	}
};


/**
 * Fetches all items from a DynamoDB table by a specific key and value.
 * @param tableName
 * @param indexName
 * @param key
 * @param value
 * @returns {Promise<*[]>}
 */
const getItems = async (tableName, indexName, key, value) => {
	const params = {
		TableName: tableName,
		...(indexName && { IndexName: indexName }),
		KeyConditionExpression: '#key = :value',
		ExpressionAttributeNames: {
			'#key': key,
		},
		ExpressionAttributeValues: {
			':value': value,
		},
	};

	try {
		const data = await docClient.query(params).promise();
		return  data.Items || [];
	} catch (err) {
		console.error(`Error querying for ${key} with value ${value}:`, err);
		throw err;
	}
};

const getAllItems = async (tableName, limit=1000) => {
	let items = [];
	let params = {
		TableName: tableName,
		Limit: limit
	};

	do {
		const data = await docClient.scan(params).promise();
		items = items.concat(data.Items);
		params.ExclusiveStartKey = data.LastEvaluatedKey;
		console.log(`Scanned ${items.length} items`)
	} while (typeof params.ExclusiveStartKey !== "undefined");

	return items;
};

module.exports = {configureAWS, listTables, createTable, createCounterTable, incrementCounter, addItemToTable, checkItemExists, getItemByPK, getItem, getItems, getAllItems, updateItem, deleteItem};
