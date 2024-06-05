let buttonMintNFT, buttonConnect, buttonAuthMintNFT;
let web3Modal;
let provider;
let selectedAccount;

const getMessages = async (message) => {
	const nonce = uuid.v4();
	const originalMessage = `I am signing this message to authenticate my wallet address with Eth Staker Incentives. I understand that this does not incur any costs. Unique ID: ${nonce}.`
	console.log('originalMessage:', originalMessage);
	const signedMessage = await getSignedMessage(originalMessage);
	console.log('signedMessage:', signedMessage);
return { signedMessage, originalMessage };
}

async function mintNFT() {
	console.log('Minting NFT...', apiEndpoint);

	const apiEndpoint = 'http://localhost:3000/mintNFT';

	const messages = await getMessages();

	try {
		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(messages)
		});

		const data = await response.json();

		if (response.status === 200) {
			console.log('Success:', data);
		} else {
			console.error('Error response:', data);
		}
	} catch (error) {
		console.error('Network error:', error);
	}
}

async function connect() {
	try {
		provider = await web3Modal.connect();

		const web3Provider = new ethers.providers.Web3Provider(provider);

		const accounts = await web3Provider.listAccounts();
		selectedAccount = accounts[0];
		console.log('Connected account:', selectedAccount);

		buttonMintNFT.removeAttribute('disabled');
		buttonAuthMintNFT.removeAttribute('disabled');

		provider.on("accountsChanged", (accounts) => {
			selectedAccount = accounts[0];
			console.log('Account changed:', selectedAccount);
		});

		provider.on("chainChanged", (chainId) => {
			console.log('Chain changed:', chainId);
		});

		provider.on("disconnect", (code, reason) => {
			console.log('Disconnected:', reason);
			// Reset application state
		});
	} catch (e) {
		console.error("Could not get a wallet connection", e);
	}
}

async function authAndMintNFT() {
	const apiEndpoint = 'http://localhost:3000/authorizeNFTMint';
	const messages = await getMessages();
	try {
		const response = await fetch(apiEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ...messages })
		});

		const data = await response.json();


		if (response.status === 200) {
			console.log('Success:');
			const {signature, nonce, tokenId, timestamp} = data;
			await mintNFTDirectly(messages, signature, nonce, tokenId, timestamp);

		} else {
			console.error('Error response:', data);
		}
	} catch (error) {
		console.error('Network error:', error);
	}
}

window.onload = async () => {
	console.group('window.onload');
	console.log("ethers:", ethers);

	buttonConnect 			= document.getElementById('button-connect');
	buttonMintNFT  			= document.getElementById('button-mint-NFT');
	buttonAuthMintNFT  		= document.getElementById('button-auth-mint-NFT');

	const providerOptions = {
		walletconnect: {
			package: window.WalletConnectProvider.default,
		}
	};

	web3Modal = new window.Web3Modal.default({
		cacheProvider: false, // Optional
		providerOptions, // Required
		disableInjectedProvider: false, // Optional
	});
	console.log('web3Modal:', web3Modal);

	console.groupEnd();
};

async function getSignedMessage(message) {
	if (typeof window.ethereum !== 'undefined') {
		const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

		const account = accounts[0];

		try {
			const signature = await window.ethereum.request({
				method: 'personal_sign',
				params: [message, account],
			});

			return signature;
		} catch (error) {
			console.error('Error signing message:', error);
			throw error;
		}
	} else {
		console.error('MetaMask is not installed!');
		throw new Error('MetaMask is not installed!');
	}
}

async function loadContractABI() {
	const response = await fetch('http://localhost:3000/contractABI');
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const contractJSON = await response.json();
	return  contractJSON.abi;
}

async function loadContractAddress() {
	const response = await fetch('http://localhost:3000/contractAddress');
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	const json = await response.json();
	const contractAddress = json.contractAddress;
	console.log('contractAddress:', contractAddress);
	return  contractAddress;
}

async function testContract() {
	const provider = new ethers.providers.Web3Provider(window.ethereum);
	const signer = provider.getSigner(); // Get the signer to sign transactions
	const contractABI = await loadContractABI();
	const contractAddress = await loadContractAddress();
	const contract = new ethers.Contract(contractAddress, contractABI, signer);
	const tx = await contract.test("hello world");
}

async function mintNFTDirectly(messages, signature, nonce, tokenId, timestamp) {
	console.log("Minting NFT...");

	const provider = new ethers.providers.Web3Provider(window.ethereum);
	const signer = provider.getSigner(); // Get the signer to sign transactions
	const contractABI = await loadContractABI();
	const contractAddress = await loadContractAddress();
	const contract = new ethers.Contract(contractAddress, contractABI, signer);
	const signerAddress = await signer.getAddress();
	console.log('contractAddress:', contractAddress);
	console.log('signerAddress:', signerAddress);
	console.log('signature:', signature);
	console.log('nonce:', nonce);
	console.log('tokenId:', tokenId);
	console.log('timestamp:', timestamp);

	try {
		const tx = await contract.mintWithSignature(signature, nonce, tokenId, timestamp);
		console.log("Transaction hash:", tx.hash);
		const txReceipt = await tx.wait();
		console.log("Transaction confirmed!", txReceipt);
		const transactionHash = tx.hash;
		console.log("transactionHash:", transactionHash);
	} catch (error) {
		console.error('Error minting NFT:', error);
	}
}
