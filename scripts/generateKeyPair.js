const { ethers } = require('ethers');

const generateKeyPair = () => {
	const wallet = ethers.Wallet.createRandom();
	const privateKey = wallet.privateKey;
	const publicKey = wallet.address;
	return { privateKey, publicKey };
};

// Generate the key pair
const keyPair = generateKeyPair();

// Output the key pair
console.log('Private Key:', keyPair.privateKey);
console.log('Public Key:', keyPair.publicKey);
