const fs = require("fs");
const path = require("path");
const config = require('./config')[process.env.NODE_ENV || 'development'];
const { createTable, createCounterTable, addItemToTable, configureAWS, listTables, waitForTableToExist } = require("./dynamodb");

const loadMintedTokenIdsFromCSV = () => {
	if (!process.env.MINTED_CSV_PATH) {
		console.log("No MINTED_CSV_PATH provided. Including all token IDs.");
		return new Set();
	}

	const csvPath = path.resolve(process.env.MINTED_CSV_PATH);
	console.log("Loading minted tokenIds from:", csvPath);

	const file = fs.readFileSync(csvPath, "utf8");
	const lines = file.trim().split("\n");

	// Expect header: tokenId,wallet,categoryId
	const mintedSet = new Set();

	for (let i = 1; i < lines.length; i++) {
		const [tokenId] = lines[i].split(",");
		mintedSet.add(Number(tokenId));
	}

	console.log(`Loaded ${mintedSet.size} minted tokenIds from CSV.`);
	return mintedSet;
};

const populateTokenIDTable = async () => {

	console.log("Listing tables...");
	await listTables();

	const mintedTokenIds = loadMintedTokenIdsFromCSV();

	const addCategoryToTable = async (startIndex, shuffledIds) => {
		console.log(`Adding category starting at index ${startIndex}`);

		let insertedCount = 0;

		for (let i = 0; i < shuffledIds.length; i++) {

			const tokenId = shuffledIds[i];

			// 🔥 EXCLUDE already minted IDs
			if (mintedTokenIds.has(tokenId)) {
				console.log(`Skipping already minted tokenId ${tokenId}`);
				continue;
			}

			const item = {
				Index: (startIndex + insertedCount),
				Value: tokenId
			};

			try {
				await addItemToTable(tokenIDTableName, item);
				insertedCount++;
			} catch (err) {
				console.error(`Failed to add index ${startIndex + insertedCount}:`, err);
			}
		}

		console.log(`Inserted ${insertedCount} remaining tokens for this category.`);
	};

	// Table names
	const tokenIDTableName = config.tokenIDTableName;

	// Create tables fresh
	await createTable(tokenIDTableName, [
		{ name: "Index", type: "N", keyType: "HASH" }
	], null, null, 'PAY_PER_REQUEST');
	await waitForTableToExist(tokenIDTableName);

	await createCounterTable(config.tokenIDCountersTableName);

	const categoryTokenCounts = [
		Number(config.category0TokenCount),
		Number(config.category1TokenCount),
		Number(config.category2TokenCount)
	];

	for (let i = 0; i < categoryTokenCounts.length; i++) {

		const startIndex = categoryTokenCounts
			.slice(0, i)
			.reduce((acc, val) => acc + val, 0) + 1;

		const endIndex = startIndex + categoryTokenCounts[i] - 1;

		console.log(`Category ${i} range: ${startIndex} → ${endIndex}`);

		const shuffledTokenIdsForCategory = Array
			.from({ length: categoryTokenCounts[i] }, (_, idx) => idx + startIndex)
			.sort(() => Math.random() - 0.5);

		await addCategoryToTable(startIndex, shuffledTokenIdsForCategory);
	}
};

(async () => {
	await configureAWS(config);

	populateTokenIDTable()
		.then(() => console.log('Token ID table populated successfully.'))
		.catch(console.error);
})();