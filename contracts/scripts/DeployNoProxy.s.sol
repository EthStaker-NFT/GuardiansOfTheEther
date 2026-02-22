// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EthStakerERC721Upgradeable.sol";

contract DeployNoProxy is Script {
    function run() external {
        string memory baseURI = vm.envString("BASE_URL");
        address authSigner = vm.envAddress("LOCAL_AUTH_PUBLIC_KEY");

        vm.startBroadcast();

        EthStakerERC721Upgradeable nft = new EthStakerERC721Upgradeable();

        nft.initialize(baseURI, authSigner);

        vm.stopBroadcast();
    }
}
