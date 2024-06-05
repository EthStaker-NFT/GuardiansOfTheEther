const config = require('./config')[process.env.NODE_ENV || 'development'];
const { getAllItems, addItemToTable, configureAWS, deleteItem } = require("./dynamodb");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
	const startTime = performance.now();
	console.log(`Start time: ${startTime}`);
	await configureAWS(config);

	const tableName = config.whitelistTableName;

	// Get all items from the table
	const items = await getAllItems(tableName);

	// Update each item
	let count = 0;

	console.log(`Updating ${items.length} items`);

	for (const item of items) {
		// console.log('item: ', item);
		if (item.Address) {
			const originalAddress = item.Address;
			const newAddress = originalAddress.toLowerCase();

			// Delete the original item
			await deleteItem(tableName, { Address: originalAddress, Category: item.Category });

			// Add the new item with the lowercase address
			item.Address = newAddress;
			await addItemToTable(tableName, item);
		}
		count++;
		if (count % 500 === 0) {
			console.log(`Processed ${count} items`);
			await sleep(1000);
		}
	}

	const endTime = performance.now();
	console.log(`End time: ${endTime}`);
	console.log(`Total time taken: ${endTime - startTime} ms`);
})();
