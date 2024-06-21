const express = require('express');
const axios = require('axios');
const { ethers } = require('ethers');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();
const config = require('./config')[process.env.NODE_ENV || 'development'];
const {configureAWS, createTable, incrementCounter, addItemToTable, getItemByPK, getItems, updateItem} = require("./dynamodb");
const path = require("path");

const port = process.env.PORT || 3000;

const corsOptions = {
	origin: config.frontendUrl,
	optionsSuccessStatus: 200 // For legacy browser support
};

const app = express();
console.log("config.frontendUrl", config.frontendUrl);
app.use(cors(corsOptions));
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

//configure ethers
const provider = new ethers.JsonRpcProvider(config.providerUrl);
//set the poll interval to 15 seconds
provider.pollingInterval = 15000;
// const signer = new ethers.Wallet(config.mintingPrivateKey, provider);
const contractABI = require(config.contractArtifactPath).abi;
const authSigner = new ethers.Wallet(config.authPrivateKey, provider);
const contract = new ethers.Contract( config.contractAddress, contractABI, authSigner);

console.log("authSigner", authSigner.address);

const alreadyMintedText = "It appears you've already minted this NFT!";

const intialize = async () => {
	//configure dynamodb
	await configureAWS(config);

	//table for NFT receipts
	const NFTTableGSIConfig = {
		// String type for the owner's wallet address
		attributeName: "ownerAddress",
		attributeType: "S"
	};
	const NFTTableKeys = [
		{ name: "id", type: "N", keyType: "HASH" },		// Partition key
	]
	await createTable(config.NFTTableName, NFTTableKeys, NFTTableGSIConfig);
	await monitorContractEvents();
}

const monitorContractEvents = async () => {
	contract.on('NFTMinted', async (tokenId, tokenURI, recipient, event) => {
		console.log('NFTMinted event:', tokenId, tokenURI);

		const ownerAddress = recipient.toLowerCase();
		const transactionHash = event.log.transactionHash;
		const blockNumber = event.log.blockNumber;
		// const attributes = { tokenURI };
		const attributes = { ownerAddress, tokenURI, transactionHash, blockNumber };
		const tokenIdNumber = Number(tokenId);
		await updateItem(config.NFTTableName, {id: tokenIdNumber}, attributes);
	});
}

//checks if the address is whitelisted and has not already minted an NFT for the given category
const verifyMintingPermissionsAndGetTokenCategory = async (address) => {
	let tokenCategory;
	let reissueAuthorization = false;
	let reissueObject = {};

	// Check if the address has already minted an NFT for the given category
	const items = await getItems(config.NFTTableName, 'ownerAddressIndex', 'ownerAddress', address);
	if (items.length > 0) {
		// for now, we only allow one NFT per address
		items.forEach(item => {
			if (item.tokenURI) {
				console.log('NFT already minted.');
				const error = new Error(alreadyMintedText);
				error.tokenURI = item.tokenURI;
				throw error;
			} else {
				// If the tokenURI is not set, it means the minting failed
				// We can allow the user to mint again if the timestamp is older than 6 minutes
				const currentTime = Math.floor(Date.now() / 1000);
				const mintingTime = item.mintInitTime;
				if (currentTime - mintingTime < 360) {
					// return please try again later message
					throw new Error('Please try again in a few minutes.');
				} else {
					//we need to reissue the authorization with the same nonce and tokenId
					reissueAuthorization = true;
					reissueObject = {
						nonce: item.nonce,
						tokenId: item.id
					}
				}
			}
		})
	}

	// Find the whitelist entry
	console.log("address:", address);
	const whiteListItems = await getItems(config.whitelistTableName, null, "Address", address);
	console.log('whiteListItems:', whiteListItems);

	if (whiteListItems.length === 0) {
		console.log('Address not whitelisted.');
		throw new Error('Address not whitelisted.');
	} else {
		if (whiteListItems.length > 1) {
			tokenCategory = 2;
		} else {
			tokenCategory = whiteListItems[0].Category;
		}
	}

	console.log('tokenCategory:', tokenCategory);
	if (reissueAuthorization) {
		reissueObject.tokenCategory = tokenCategory;
		return reissueObject;
	} else {
		console.log('return tokenCategory:', tokenCategory);
		return tokenCategory;
	}
};

const handleError = (error, res) => {
	if (error.message === 'Address not whitelisted') {
		res.status(401).send({error: error.message});
	} else if (error.message === alreadyMintedText) {
		res.status(403).send({ error: error.message, tokenURI: error.tokenURI });
	} else {
		// For all other errors, return a 500 Internal Server Error
		console.error('Error:', error.message);
		res.status(500).send({ error: error.message });
	}
}

const getNextTokenId = async (tokenCategory) => {
	let index;
	switch (tokenCategory) {
		case 0:
			// Get the next token ID for category 0
			index = await incrementCounter(config.tokenIDCountersTableName, 'category0');
			if (index > +config.category0TokenCount) {
				throw new Error('Category 0 token limit reached');
			}
			break;
		case 1:
			index = await incrementCounter(config.tokenIDCountersTableName, 'category1') + +config.category0TokenCount;
			if (index > +config.category1TokenCount + +config.category0TokenCount) {
				throw new Error('Category 1 token limit reached');
			}
			break;
		case 2:
			index = await incrementCounter(config.tokenIDCountersTableName, 'category2') + +config.category0TokenCount + +config.category1TokenCount;
			if (index > +config.category2TokenCount + +config.category0TokenCount + +config.category1TokenCount) {
				throw new Error('Category 2 token limit reached');
			}
			break;
		default:
			throw new Error('Invalid token category');
	}
	console.log('token index:', index);
	const tokenIdItem = await getItemByPK(config.tokenIDTableName, {Index: index});
	return tokenIdItem.Value;
}

const mintNFT = async (recipientAddress, tokenCategory) => {
	try {
		console.log('recipientAddress:', recipientAddress)
		console.log("Minting NFT...");
		const tx = await contract.mintTo(recipientAddress, tokenCategory);
		const receipt = await tx.wait();
		console.log('receipt:', receipt);
		console.log('receipt.blockNumber:', receipt.blockNumber);
		console.log('receipt.gasUsed:', receipt.gasUsed);

		// Add item to DynamoDB table
		const currentTimeUTC = new Date().toISOString();
		console.log('currentTimeUTC:', currentTimeUTC);
		await addItemToTable(config.NFTTableName, {
			id: `${recipientAddress}-${currentTimeUTC}`,
			isServerMint: true,
			ownerAddress: recipientAddress,
			mintInitTime: currentTimeUTC,
			txHash: tx.hash,
			blockNumber: receipt.blockNumber,
			gasUsed: receipt.gasUsed.toString(),
		});

		return tx.hash;
	} catch (error) {
		throw error;
	}
}

//this endpoint authorizes the minting of an NFT by a user
app.post('/authorizeNFTMint', async (req, res) => {
	const { signedMessage, originalMessage } = req.body;

	console.log('signedMessage:', signedMessage);
	console.log('originalMessage:', originalMessage);

	if (!signedMessage || !originalMessage) {
		return res.status(401).send('Signed message and original message are required.');
	}

	const recipientAddress = ethers.verifyMessage(originalMessage, signedMessage).toLowerCase();
	console.log('recipientAddress:', recipientAddress);

	try {
		let tokenCategory;
		let reissue = false;
		const tokenCategoryOrReissueObject = await verifyMintingPermissionsAndGetTokenCategory(recipientAddress);
		if (typeof tokenCategoryOrReissueObject === 'object')
		{
			//reissue authorization
			console.log('reissue authorization', tokenCategoryOrReissueObject);
			tokenCategory = tokenCategoryOrReissueObject.tokenCategory;
			reissue = true;
		} else {
			tokenCategory = tokenCategoryOrReissueObject;
		}
		console.log('tokenCategory:', tokenCategory);
		if (typeof tokenCategory === 'number') {
			//create authorization payload
			let nonce, tokenId;
			if (reissue) {
				nonce = tokenCategoryOrReissueObject.nonce;
				tokenId = tokenCategoryOrReissueObject.tokenId;
			} else {
				nonce = crypto.randomBytes(32);
				tokenId = await getNextTokenId(tokenCategory);
			}
			console.log("tokenId:", tokenId);
			const nonceHex = '0x' + nonce.toString('hex');
			console.log('nonceHex:', nonceHex);
			const timestamp = Math.floor(Date.now() / 1000);
			const message = ethers.solidityPackedKeccak256(['bytes32', 'address', 'uint256', 'uint256'], [nonce, recipientAddress, tokenId, timestamp]);
			console.log('message:', message);
			const signature = await authSigner.signMessage(ethers.toBeArray(message));
			console.log('signature:', signature);

			const nonceBase64 = nonce.toString('base64');

			await addItemToTable(config.NFTTableName, {
				id: tokenId,
				category: tokenCategory,
				// tokenURI,
				ownerAddress: recipientAddress,
				mintInitTime: timestamp,
				nonce: nonce,
				// txHash: tx.hash,
				// blockNumber: receipt.blockNumber,
				// gasUsed: receipt.gasUsed.toString(),
			});

			res.send({ message: 'Authorized to mint', signature, nonce: nonceHex, tokenId, timestamp});
		}
	} catch (error) {
		handleError(error, res);
	}
});

app.get('/contractABI', (req, res) => {
	// Specify the exact path to your contract's JSON file
	const filePath = path.join(__dirname, config.contractArtifactPath);

	// Use res.sendFile to serve the file
	res.sendFile(filePath, (err) => {
		if (err) {
			// Handle errors, for example, file not found
			console.log(err);
			res.status(500).send("Error serving the file.");
		}
	});
});

app.get('/contractAddress', (req, res) => {
	res.send({ contractAddress: config.contractAddress });
});

app.post('/registerToken', async (req, res) => {
	const { signedMessage, originalMessage, nonce,
		tokenId, tokenURI, transactionHash, blockNumber, gasUsed } = req.body;

	console.log("transactionHash:", transactionHash);

	if (!signedMessage || !originalMessage) {
		return res.status(401).send('Signed message and original message are required.');
	}
	const minterAddress = ethers.verifyMessage(originalMessage, signedMessage);
	const item = await getItemByPK(config.NFTTableName, {id: nonce});
	if (!item || item.ownerAddress !== minterAddress) {
		return res.status(403).send("Error registering token.");
	}

	await updateItem(config.NFTTableName, {id: nonce}, {
		tokenId, tokenURI, transactionHash, blockNumber, gasUsed
	});
	res.send({ message: 'Token registered successfully.' });
});

intialize().then(() => {
	app.listen(port, () => {
		console.log(`Server is running on http://localhost:${port}`);
	});
}).catch(console.error);
