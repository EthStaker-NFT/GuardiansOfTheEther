// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


contract EthStakerERC721Upgradeable is Initializable, ERC721URIStorageUpgradeable, OwnableUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using ECDSAUpgradeable for bytes32;
    using StringsUpgradeable for uint256;

    // Events
    event NFTMinted(uint256 indexed tokenId, string tokenURI, address recipient);
    event NFTUpgraded(uint256 indexed burnedTokenId1, uint256 indexed burnedTokenId2, uint256 indexed newTokenId, string newTokenURI);
    event TestEvent(string message);

    // Structs
    struct TokenRange {
        uint256 start;
        uint256 end;
    }

    struct Category {
        string directory;
        TokenRange[] ranges;
    }

    // State variables
    mapping(uint256 => Category) public categories;
    uint256 public categoriesCount;
    string private baseURI;
    address private authSigner;
    mapping(bytes32 => bool) private usedNonces;
    // add a new state variables here

    // Initializer
    function initialize(string memory _baseURIInit, address _authSigner) public initializer {
        __ERC721URIStorage_init();
        __Ownable_init();
        __ERC721_init("Guardians of the Ether", "GOTE");

        baseURI = _baseURIInit;
        authSigner = _authSigner;
    }

    // Public and external functions
    function setAuthSigner(address _authSigner) public onlyOwner {
        authSigner = _authSigner;
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        baseURI = baseURI_;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        uint256 category = getCategoryByTokenId(tokenId);
        string memory categoryDirectory = categories[category].directory;

        // Concatenate the baseURI, the category directory, tokenId, and ".json" to form the full URI
        return string(abi.encodePacked(_baseURI(), "/", categoryDirectory, "/", StringsUpgradeable.toString(tokenId), ".json"));
    }

    function test(string memory message) public {
        emit TestEvent(message);
    }

    function addCategory(string calldata _directory, TokenRange[] calldata _ranges) external onlyOwner {
        require(bytes(_directory).length > 0, "Directory cannot be empty");
        validateRanges(_ranges);
        Category storage newCategory = categories[categoriesCount++];//this creates a new Category
        newCategory.directory = _directory;
        for (uint256 i = 0; i < _ranges.length; i++) {
            newCategory.ranges.push(_ranges[i]);
        }
    }

    function addRangeToCategory(uint256 categoryId, TokenRange calldata newRange) external onlyOwner {
        require(categoryId < categoriesCount, "Invalid category ID");
        TokenRange[] memory ranges = new TokenRange[](1);
        ranges[0] = newRange;
        validateRanges(ranges); //check the new range against the existing ranges of the category
        categories[categoryId].ranges.push(newRange);
    }

    function updateCategoryDirectory(uint256 categoryId, string calldata newDirectory) external onlyOwner {
        require(categoryId < categoriesCount, "Invalid category ID");
        require(bytes(newDirectory).length > 0, "New directory cannot be empty");
        categories[categoryId].directory = newDirectory;
    }

    function getCategoryRanges(uint256 categoryId) public view returns (TokenRange[] memory) {
        return categories[categoryId].ranges;
    }

    function mintTo(address recipient, uint256 tokenId) external onlyOwner {
        _mint(recipient, tokenId);
        emit NFTMinted(tokenId, tokenURI(tokenId), recipient);
    }

    function mintWithSignature(bytes calldata signature, bytes32 nonce, uint256 tokenId, uint256 timestamp) external {
        require(!usedNonces[nonce], "Nonce has already been used");
        require(block.timestamp <= timestamp + 5 minutes, "Timestamp has expired.");
        bytes32 message = prefixed(keccak256(abi.encodePacked(nonce, msg.sender, tokenId, timestamp)));
        address signer = recoverSignerFromSignature(message, signature);
        require(signer == authSigner, "Signature invalid or unauthorized");
        usedNonces[nonce] = true;
        _mint(msg.sender, tokenId);
        emit NFTMinted(tokenId, tokenURI(tokenId), msg.sender);
    }

    function upgradeWithSignature(bytes calldata signature, bytes32 nonce, uint256 tokenId1, uint256 tokenId2, uint256 newTokenId) external {
        require(!usedNonces[nonce], "Nonce has already been used");
        require(ownerOf(tokenId1) == msg.sender && ownerOf(tokenId2) == msg.sender, "Caller must own the tokens");

        bytes32 message = prefixed(keccak256(abi.encodePacked(nonce, msg.sender, tokenId1, tokenId2, newTokenId)));
        address signer = recoverSignerFromSignature(message, signature);
        require(signer == authSigner, "Signature invalid or unauthorized");
        usedNonces[nonce] = true;

        _burn(tokenId1);
        _burn(tokenId2);

        _mint(msg.sender, newTokenId);
        emit NFTUpgraded(tokenId1, tokenId2, newTokenId, tokenURI(newTokenId));
    }

    //Internal and private functions
    function validateRanges(TokenRange[] memory _ranges) internal view {
        for (uint256 i = 0; i < _ranges.length; i++) {
            for (uint256 j = 0; j < categoriesCount; j++) {
                for (uint256 k = 0; k < categories[j].ranges.length; k++) {
                    require(_ranges[i].start > categories[j].ranges[k].end || _ranges[i].end < categories[j].ranges[k].start, "Range overlaps with existing category");
                }
            }
        }
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function getCategoryByTokenId(uint256 tokenId) internal view returns (uint256) {
        for (uint256 i = 0; i < categoriesCount; i++) {
            for (uint256 j = 0; j < categories[i].ranges.length; j++) {
                if (tokenId >= categories[i].ranges[j].start && tokenId <= categories[i].ranges[j].end) {
                    return i;
                }
            }
        }
        revert("Token does not belong to any category");
    }

    function recoverSignerFromSignature(
        bytes32 message,
        bytes memory sig
    ) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");

        uint8 v;
        bytes32 r;
        bytes32 s;

        assembly {
        // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
        // second 32 bytes
            s := mload(add(sig, 64))
        // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return ecrecover(message, v, r, s);
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    // Override the _transfer function to prevent any transfers
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        revert("Transfers are disabled for this NFT");
    }
}
