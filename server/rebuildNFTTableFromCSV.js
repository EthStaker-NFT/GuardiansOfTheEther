const fs = require("fs");
const path = require("path");
const config = require("./config")[process.env.NODE_ENV || "development"];
const { configureAWS, addItemToTable } = require("./dynamodb");

if (!process.env.MINTED_CSV_PATH) {
	throw new Error("Please provide MINTED_CSV_PATH");
}

const loadCSV = () => {
	const csvPath = path.resolve(process.env.MINTED_CSV_PATH);
	const file = fs.readFileSync(csvPath, "utf8");
	const lines = file.trim().split("\n");

	const rows = [];

	for (let i = 1; i < lines.length; i++) {
		const [tokenId, wallet, categoryId] = lines[i].split(",");
		rows.push({
			tokenId: Number(tokenId),
			wallet: wallet.toLowerCase(),
			categoryId: Number(categoryId)
		});
	}

	console.log(`Loaded ${rows.length} minted records from CSV`);
	return rows;
};

const main = async () => {
	await configureAWS(config);

	const rows = loadCSV();

	for (const row of rows) {
		const { tokenId, wallet, categoryId } = row;

		console.log(`Inserting tokenId ${tokenId}`);

		await addItemToTable(config.NFTTableName, {
			id: tokenId,
			category: categoryId,
			ownerAddress: wallet,
			mintInitTime: Math.floor(Date.now() / 1000), // placeholder
			tokenURI: `recovered-${tokenId}` // only needs to be non-null
		});
	}

	console.log("NFTTable rebuild complete");
};

main().catch(console.error);