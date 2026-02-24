const fs = require("fs");
const path = require("path");

// Usage:
// node convertStakerTabletoWhitelist.js input.csv output.csv

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
	console.error("Usage: node convertStakerTabletoWhitelist.js <input.csv> <output.csv>");
	process.exit(1);
}

const inAbs = path.resolve(inputPath);
const outAbs = path.resolve(outputPath);

const input = fs.readFileSync(inAbs, "utf8");
const lines = input.trim().split("\n");

const outLines = [];

for (const line of lines) {
	if (!line.trim()) continue;

	const cols = line.split(",");

	if (cols.length < 9) {
		console.warn("Skipping malformed row:", line);
		continue;
	}

	const address = cols[0].toLowerCase();

	const total2022 = parseInt(cols[4], 10);
	const total2023 = parseInt(cols[8], 10);

	const category0 = total2022 > 0 ? 1 : 0;
	const category1 = total2023 > 0 ? 1 : 0;

	if (category0 === 0 && category1 === 0) continue;

	outLines.push(`${address},${category0},${category1}`);
}

fs.writeFileSync(outAbs, outLines.join("\n") + "\n");

console.log("Conversion complete.");
console.log("Rows written:", outLines.length);