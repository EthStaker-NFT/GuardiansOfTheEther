//Original file
// var contract = artifacts.require("./EthStakerERC721.sol");
//
// module.exports = function(deployer) {
//   deployer.deploy(contract, "tempBasURI", "0xbCa4D1149c15b1e2fC510b6dA47942b199dFAD64");
// };

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require("fs");
const EthStakerERC721Upgradeable = artifacts.require('./EthStakerERC721Upgradeable');

module.exports = async function (deployer, network) {
  const _baseURIInit = "ipfs:/";
  const _authSigner = "";
  console.log("Deploying EthStakerERC721Upgradeable...");
  const instance = await deployProxy(EthStakerERC721Upgradeable, [_baseURIInit, _authSigner], { deployer, initializer: 'initialize' });
  console.log('Deployed', instance.address);

  // Update .env file with the contract address
    if (network === 'development') {
      // Update .env file with the contract address
      const envPath = './server/.env';
      let envContents = fs.readFileSync(envPath, 'utf8');
      const contractAddressRegex = /^LOCAL_CONTRACT_ADDRESS=.*$/m;
      if (envContents.match(contractAddressRegex)) {
        envContents = envContents.replace(contractAddressRegex, `LOCAL_CONTRACT_ADDRESS=${instance.address}`);
      } else {
        envContents += `LOCAL_CONTRACT_ADDRESS=${instance.address}\n`; // If no existing line, add it
      }
      fs.writeFileSync(envPath, envContents);

      // Copy ABI to specific location
      const abiPath = './build/contracts/EthStakerERC721Upgradeable.json';
      const abiDestination = './server/EthStakerERC721Upgradeable.json';
      const contractABI = fs.readFileSync(abiPath, 'utf8');
      fs.writeFileSync(abiDestination, contractABI);
    }
};
