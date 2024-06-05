if (!process.env.AWS_EXECUTION_ENV) {
	require('dotenv').config();
}

const config = {
	development: {
		providerUrl: process.env.GANACHE_URL,
		whitelistPath: process.env.LOCAL_WHITELIST_PATH,
		frontendUrl: process.env.LOCAL_FRONTEND_URL,
		contractAddress: process.env.LOCAL_CONTRACT_ADDRESS,
		awsRegion: process.env.AWS_REGION,
		awsEndpoint: process.env.AWS_ENDPOINT,
		baseUrlSolo1: process.env.TEST_SOLO_1_BASE_URL,
		baseUrlSolo2: process.env.TEST_SOLO_2_BASE_URL,
		baseUrlRp1: process.env.TEST_RP_1_BASE_URL,
		baseUrlRp2: process.env.TEST_RP_2_BASE_URL,
		NFTTableName: process.env.TEST_NFT_DYNAMODB_TABLE_NAME,
		whitelistTableName: process.env.TEST_WHITELIST_DYNAMODB_TABLE_NAME,
		tokenIDTableName: process.env.TEST_SHUFFLED_TOKEN_ID_TABLE_NAME,
		tokenIDCountersTableName: process.env.TEST_INDEX_COUNTERS_TABLE_NAME,
		mintingPrivateKey: process.env.LOCAL_MINT_PRIVATE_KEY,
		authPrivateKey: process.env.LOCAL_AUTH_PRIVATE_KEY,
		contractArtifactPath: process.env.CONTRACT_ARTIFACT_PATH,
		category0TokenCount: process.env.TEST_CATEGORY_0_TOKEN_COUNT,
		category1TokenCount: process.env.TEST_CATEGORY_1_TOKEN_COUNT,
		category2TokenCount: process.env.TEST_CATEGORY_2_TOKEN_COUNT,
	},

	test: {
		providerUrl: process.env.SEPOLIA_INFURA_URL,
		whitelistPath: process.env.TEST_WHITELIST_PATH,
		frontendUrl: process.env.REMOTE_FRONTEND_URL,
		contractAddress: process.env.TESTNET_CONTRACT_ADDRESS,
		baseUrlSolo1: process.env.TEST_SOLO_1_BASE_URL,
		baseUrlSolo2: process.env.TEST_SOLO_2_BASE_URL,
		baseUrlRp1: process.env.TEST_RP_1_BASE_URL,
		baseUrlRp2: process.env.TEST_RP_1_BASE_URL,
		NFTTableName: process.env.TEST_NFT_DYNAMODB_TABLE_NAME,
		whitelistTableName: process.env.TEST_WHITELIST_DYNAMODB_TABLE_NAME,
		tokenIDTableName: process.env.TEST_SHUFFLED_TOKEN_ID_TABLE_NAME,
		tokenIDCountersTableName: process.env.TEST_INDEX_COUNTERS_TABLE_NAME,
		mintingPrivateKey: process.env.TEST_MINT_PRIVATE_KEY,
		authPrivateKey: process.env.TEST_AUTH_PRIVATE_KEY,
		contractArtifactPath: process.env.CONTRACT_ARTIFACT_PATH,
		category0TokenCount: process.env.TEST_CATEGORY_0_TOKEN_COUNT,
		category1TokenCount: process.env.TEST_CATEGORY_1_TOKEN_COUNT,
		category2TokenCount: process.env.TEST_CATEGORY_2_TOKEN_COUNT,
	},

	production: {
		providerUrl: process.env.MAINNET_INFURA_URL,
		whitelistPath: process.env.PRODUCTION_WHITELIST_PATH,
		frontendUrl: process.env.REMOTE_FRONTEND_URL,
		contractAddress: process.env.PRODUCTION_CONTRACT_ADDRESS,
		baseUrlSolo1: process.env.PRODUCTION_SOLO_1_BASE_URL,
		baseUrlSolo2: process.env.PRODUCTION_SOLO_2_BASE_URL,
		baseUrlRp1: process.env.PRODUCTION_RP_1_BASE_URL,
		baseUrlRp2: process.env.PRODUCTION_RP_1_BASE_URL,
		NFTTableName: process.env.PRODUCTION_NFT_DYNAMODB_TABLE_NAME,
		whitelistTableName: process.env.PRODUCTION_WHITELIST_DYNAMODB_TABLE_NAME,
		tokenIDTableName: process.env.PRODUCTION_SHUFFLED_TOKEN_ID_TABLE_NAME,
		tokenIDCountersTableName: process.env.PRODUCTION_INDEX_COUNTERS_TABLE_NAME,
		mintingPrivateKey: process.env.PRODUCTION_MINT_PRIVATE_KEY,
		authPrivateKey: process.env.PRODUCTION_AUTH_PRIVATE_KEY,
		contractArtifactPath: process.env.CONTRACT_ARTIFACT_PATH,
		category0TokenCount: process.env.PRODUCTION_CATEGORY_0_TOKEN_COUNT,
		category1TokenCount: process.env.PRODUCTION_CATEGORY_1_TOKEN_COUNT,
		category2TokenCount: process.env.PRODUCTION_CATEGORY_2_TOKEN_COUNT,
	}
};

module.exports = config;
