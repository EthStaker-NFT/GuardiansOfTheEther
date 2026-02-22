const { ethers } = require("ethers");
const USE_MAINNET = true;
const currentOwnerPrivateKey = "";
const newOwnerAddress = "0xC7f9bEf8c26A5BB502Ac08EBeAE3fDf7171c249f";

const contractAddress = USE_MAINNET ?
	"0x5775Cbc5ea4D78ACf64e4e5070061d3c77AD0a02" :
	"0x060fbF8E7476dA8E0c5ce82F571Cc13f9343908e";

async function loadContractABI() {
	const response = await fetch('https://api.etherguardians.xyz/contractABI');
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const contractJSON = await response.json();
	return  contractJSON.abi;
}

// Transfer ownership function
async function transferOwnership(contractAddress, privateKey, newOwnerAddress) {
	console.log("Transferring ownership of contract", contractAddress, "to", newOwnerAddress);

	const contractABI = await loadContractABI();

	const provider = new ethers.providers.JsonRpcProvider(USE_MAINNET ?
		"https://mainnet.infura.io/v3/3f470522c754412fa9f769f9f13cc71c" :
		"https://sepolia.infura.io/v3/3f470522c754412fa9f769f9f13cc71c");

	const wallet = new ethers.Wallet(privateKey, provider);

	const contract = new ethers.Contract(contractAddress, contractABI, wallet);

	try {
		const tx = await contract.transferOwnership(newOwnerAddress);
		await tx.wait();
		console.log("Ownership transferred successfully");
	} catch (error) {
		console.error("Error transferring ownership:", error);
	}
}

transferOwnership(contractAddress, currentOwnerPrivateKey, newOwnerAddress);
