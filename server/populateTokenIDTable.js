const config = require('./config')[process.env.NODE_ENV || 'development'];
const {createTable, createCounterTable, addItemToTable, configureAWS, listTables} = require("./dynamodb");

const populateTokenIDTable = async () => {

	console.log("listing tables");
	await listTables();

	const addCategoryToTable = async (startIndex, shuffledIds) => {
		console.log(`Adding category with start index ${startIndex} to table.`);
		for (i = 0; i < shuffledIds.length; i++) {
			const item = {
				Index: (startIndex + i),
				Value: shuffledIds[i]
			};

			try {
				await addItemToTable(tokenIDTableName, item);
				console.log(`Item with index ${startIndex + i} and value ${shuffledIds[i]} added successfully.`);
			} catch (err) {
				console.error(`Failed to add item with index ${startIndex + i}:`, err);
			}
		}
	}

	//table for shuffled token IDs
	const tokenIDTableName = config.tokenIDTableName;
	const keys = [
		{ name: "Index", type: "N", keyType: "HASH" }, // 'N' for number type
	];
	await createTable(tokenIDTableName, keys, null);

	//table for indices counters
	console.log("config.tokenIDCountersTableName: ", config.tokenIDCountersTableName); // "TokenIDCounters
	await createCounterTable(config.tokenIDCountersTableName);


	const categoryTokenCounts = [Number(config.category0TokenCount), Number(config.category1TokenCount), Number(config.category2TokenCount)];
	const shuffledTokenIds = [];
	for (let i = 0; i < categoryTokenCounts.length; i++) {
		//category 0 should start at 1 and end at category_0_token_count
		//category 1 should start at category_0_token_count + 1 and end at category_0_token_count + category_1_token_count
		//etc
		const startIndex = categoryTokenCounts.slice(0, i).reduce((acc, val) => acc + val, 0) + 1;
		const endIndex = startIndex + +categoryTokenCounts[i];
		console.log(`startIndex: ${startIndex}, endIndex: ${endIndex}`);
		const shuffledTokenIdsForCategory = Array.from({length: categoryTokenCounts[i]}, (_, i) => i + startIndex).sort(() => Math.random() - 0.5);
		shuffledTokenIds.push(shuffledTokenIdsForCategory);
		console.log(`shuffledTokenIdsForCategory ${i}:`, shuffledTokenIdsForCategory);

		//add values to tokenIDTableName
		await addCategoryToTable(startIndex, shuffledTokenIdsForCategory);
	}
}

(async () => {
	await configureAWS(config);
	populateTokenIDTable()
		.then(() => console.log('Token ID table populated successfully.'))
		.catch(console.error);
})();
