const fs = require("fs");
const path = require("path");
const Web3 = require("web3");

require('dotenv').config({ path: '../../server/.env' });

async function main() {
	const config = require("../../server/config")[process.env.NODE_ENV || "development"];

	console.log("NODE_ENV:", process.env.NODE_ENV);
	console.log("config:", config);
	console.log("config.providerUrl:", config.providerUrl);
	console.log("config.contractAddress:", config.contractAddress);
	console.log("config.contractArtifactPath:", config.contractArtifactPath);
	if (!config.providerUrl) throw new Error("Missing providerUrl");
	if (!config.contractAddress) throw new Error("Missing contractAddress");
	if (!config.contractArtifactPath) throw new Error("Missing contractArtifactPath");

	console.log("Using contract:", config.contractAddress);
	console.log("Using provider:", config.providerUrl);

	// Read-only provider (no private key needed)
	const web3 = new Web3(config.providerUrl);

	// Load Truffle artifact
	const artifactPath = path.resolve('../../server', config.contractArtifactPath);
	const artifact = JSON.parse(fs.readFileSync(artifactPath));
	const abi = artifact.abi;

	const contract = new web3.eth.Contract(
		abi,
		config.contractAddress
	);

	console.log("Fetching NFTMinted events...");

	const events = await contract.getPastEvents("NFTMinted", {
		fromBlock: 0,
		toBlock: "latest"
	});

	console.log(`Found ${events.length} mint events`);

	const mints = events.map((e) => ({
		tokenId: Number(e.returnValues.tokenId),
		wallet: e.returnValues.recipient
	}));

	console.log("Fetching categories...");

	const categoriesCount = Number(
		await contract.methods.categoriesCount().call()
	);

	const categories = [];

	for (let i = 0; i < categoriesCount; i++) {
		const categoryStruct = await contract.methods.categories(i).call();
		const ranges = await contract.methods.getCategoryRanges(i).call();

		categories.push({
			id: i,
			directory: categoryStruct.directory,
			ranges: ranges.map((r) => ({
				start: Number(r.start),
				end: Number(r.end)
			}))
		});
	}

	console.log(`Loaded ${categories.length} categories`);

	function getCategoryForToken(tokenId) {
		for (const cat of categories) {
			for (const range of cat.ranges) {
				if (tokenId >= range.start && tokenId <= range.end) {
					return cat.id;
				}
			}
		}
		throw new Error(`No category found for tokenId ${tokenId}`);
	}

	console.log("Computing categories...");

	const results = mints.map((m) => ({
		tokenId: m.tokenId,
		wallet: m.wallet,
		categoryId: getCategoryForToken(m.tokenId)
	}));

	results.sort((a, b) => a.tokenId - b.tokenId);

	const header = "tokenId,wallet,categoryId\n";
	const rows = results
		.map((r) => `${r.tokenId},${r.wallet},${r.categoryId}`)
		.join("\n");

	const csv = header + rows;

	const outputPath = path.resolve("mint_export.csv");
	fs.writeFileSync(outputPath, csv);

	console.log("✅ CSV saved to:", outputPath);
}

main().catch((err) => {
	console.error("❌ Error:", err);
	process.exit(1);
});