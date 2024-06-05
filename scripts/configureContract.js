require('dotenv').config({ path: '../server/.env' });
const Web3 = require('web3');
const HDWalletProvider = require("@truffle/hdwallet-provider");
const path = require('path');

console.log("NODE_ENV:", process.env.NODE_ENV);

/*CONFIGURATION*/
const numberOfAddresses = 10;
const accountIndex = 5;
const gasPrice = Web3.utils.toWei('10', 'gwei');
const gasLimit = 3000000;

let mnemonic;
let providerUrl;
let expectedWalletAddress;
let contractAddress;
switch (process.env.NODE_ENV) {
case 'production':
	providerUrl = process.env.MAINNET_INFURA_URL;
	mnemonic = process.env.PRODUCTION_WALLET_MNEMONIC;
	expectedWalletAddress = process.env.PRODUCTION_WALLET_ADDRESS;
	contractAddress = process.env.MAINNET_CONTRACT_ADDRESS;
	break;
case 'test':
	providerUrl = process.env.SEPOLIA_INFURA_URL;
	mnemonic = process.env.TEST_WALLET_MNEMONIC;
	expectedWalletAddress = process.env.TEST_WALLET_ADDRESS;
	contractAddress = process.env.TESTNET_CONTRACT_ADDRESS;
	break;
default:
	mnemonic = process.env.LOCAL_WALLET_MNEMONIC;
	providerUrl = process.env.GANACHE_URL;
	expectedWalletAddress = process.env.LOCAL_WALLET_ADDRESS;
	contractAddress = process.env.LOCAL_CONTRACT_ADDRESS;
	break;
}
console.log(`mnemonic is set?: ${mnemonic !== undefined}`);

const provider = new HDWalletProvider({
	mnemonic: {
		phrase: mnemonic
	},
	providerOrUrl: providerUrl,
	numberOfAddresses: numberOfAddresses,
	shareNonce: true
});
const web3 = new Web3(provider);

async function main() {
	const accounts = await web3.eth.getAccounts();
	let isWalletAddressCorrect = false;
	if (accounts.length > accountIndex) {
		console.log('Selected account address:', accounts[accountIndex]);
		console.log('Expected wallet address:', expectedWalletAddress);
		isWalletAddressCorrect = accounts[accountIndex] === expectedWalletAddress;
	} else {
		console.log('No account available at index', accountIndex);
	}

	if (isWalletAddressCorrect && mnemonic !== undefined) {
		const contractArtifactPath = path.resolve(__dirname, '../server/EthStakerERC721Upgradeable.json');
		const contractABI = require(contractArtifactPath).abi;
		const contract = new web3.eth.Contract(contractABI, contractAddress);

		const addCategory = async (directory, ranges) => {
			try {
				const receipt = await contract.methods.addCategory(directory, ranges).send({
					from: accounts[accountIndex],
					gas: gasLimit,
					gasPrice: gasPrice,
				});
				console.log(`Category added with directory: ${directory}`);
				console.log('Transaction receipt:', receipt);
			} catch (error) {
				console.error(`Error adding category with directory: ${directory}`, error);
			}
		};

		// await addCategory('QmYSjx3rPEmNeMY6nvZXXmQp2zFPDxUmEaZSNobTrzGU2c', [{ start: 12001, end: 30000 }]);
		// await addCategory('QmTP5zFukG2oGJbq5rwcWCrBDpShNkVReyyUBK152RDjas', [{ start: 30001, end: 41224 }]);
	} else {
		console.log('Mnemonic is not set or wallet address is incorrect');
	}
}

main().then(() => {
	console.log('Done!');
	provider.engine.stop();
}).catch(error => {
	console.error(error);
	provider.engine.stop();
});
