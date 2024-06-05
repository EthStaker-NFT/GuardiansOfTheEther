const config = require('./config')[process.env.NODE_ENV || 'development'];
const fs = require("fs");
const csv = require("csv-parser");
const {createTable, addItemToTable, configureAWS} = require("./dynamodb");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
	const startTime = performance.now();
	console.log(`Start time: ${startTime}`);
	await configureAWS(config);

	const tableName = config.whitelistTableName;
	const keys = [
		{ name: "Address", type: "S", keyType: "HASH" },
		{ name: "Category", type: "N", keyType: "RANGE" }
	];
	await createTable(tableName, keys);

	let count = 0;
	const delayBetweenWrites = 1000 / 1000; // 1000 writes per second
	const rows = [];

	// Process CSV file and add items to the
	const whitelistPath = config.whitelistPath;
	console.log(`Reading CSV file from ${whitelistPath}`);
	fs.createReadStream(whitelistPath)
		.pipe(csv({ headers: ['Address', 'Category0', 'Category1'] }))
		.on('data', async (row) => {
			rows.push(row);
		})
		.on('end', async () => {
			console.log('CSV file successfully loaded.');
			for (const row of rows) {
				const address = row.Address;
				const category0 = parseInt(row.Category0);
				const category1 = parseInt(row.Category1);

				if (category0 > 0) {
					const item0 = {
						Address: address,
						Category: 0,
					};
					await addItemToTable(tableName, item0);
					await sleep(delayBetweenWrites);
				}

				if (category1 > 0) {
					const item1 = {
						Address: address,
						Category: 1,
					};
					await addItemToTable(tableName, item1);
					await sleep(delayBetweenWrites);
				}
				count++;
				if (count % 500 === 0) {
					console.log(`Added ${count} items`);
				}
			}
			console.log('All rows processed');
			const endTime = performance.now();
			const secondsTaken = (endTime - startTime) / 1000;
			console.log(`Time taken: ${secondsTaken.toFixed(2)} seconds.`);
		})
		.on('error', (err) => {
			console.error('Error processing CSV file:', err);
		});

})();
