const fs = require('fs');
const path = require('path');
const config = require('./config')[process.env.NODE_ENV || 'development'];
const { createTable, addItemToTable, configureAWS } = require("./dynamodb");

const getJSONWhitelist = async () => {
	console.log('config.whitelistPath: ', config.whitelistPath);
	const whitelistPath = path.resolve(__dirname, config.whitelistPath);
	const whitelistData = fs.readFileSync(whitelistPath, 'utf8');
	return JSON.parse(whitelistData);
};

const getTokenCategoryFromYear = (year) => {
	switch (year) {
	case '2022':
		return 0;
	case '2023':
		return 1;
	}
	console.log('Invalid token category');
	throw new Error('Invalid token category');
}

const populateWhitelistTableFromJSON = async (whitelistData) => {
	const tableName = config.whitelistTableName;
	console.log('tableName: ', tableName);

	// Define the keys configuration for the table
	const keys = [
		{ name: "Address", type: "S", keyType: "HASH" }, // Partition key
		{ name: "Category", type: "N", keyType: "RANGE" }    // Sort key
	];

	// Ensure the table exists with the correct configuration
	console.log(`Ensuring table '${tableName}' exists.`);
	await createTable(tableName, keys).catch(console.error);

	const data = await getJSONWhitelist();

	// Iterate over each whitelist entry and add it to DynamoDB
	for (const entry of data.whitelists) {
		const category = getTokenCategoryFromYear(entry.year);

		for (const address of entry.addresses) {
			console.log('address: ', address);
			console.log('category: ', category);
			// Log type of address and category
			console.log('address type: ', typeof address);
			console.log('category type: ', typeof category);
			const item = {
				Address: address,
				Category: category,
			};

			try {
				await addItemToTable(tableName, item);
				console.log(`Successfully added address ${address} for category ${category} to '${tableName}'.`);
			} catch (err) {
				console.error(`Error adding address ${address} for category ${category}:`, err);
			}
		}
	}
};

(async () => {
	await configureAWS(config);
	const whitelistData = await getJSONWhitelist();
	populateWhitelistTableFromJSON(whitelistData)
		.then(() => console.log('Whitelist import completed.'))
		.catch(console.error);
})();
