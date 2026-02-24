if (!process.env.AWS_EXECUTION_ENV) {
	require('dotenv').config();
}

const config = {
	development: {
		providerUrl: process.env.LOCAL_PROVIDER_URL,
		whitelistPath: process.env.LOCAL_WHITELIST_PATH,
		frontendUrl: process.env.LOCAL_FRONTEND_URL,
		contractAddress: process.env.LOCAL_CONTRACT_ADDRESS,
		awsRegion: process.env.AWS_REGION,
		awsEndpoint: process.env.AWS_ENDPOINT,
		NFTTableName: process.env.TEST_NFT_DYNAMODB_TABLE_NAME,
		whitelistTableName: process.env.TEST_WHITELIST_DYNAMODB_TABLE_NAME,
		tokenIDTableName: process.env.TEST_SHUFFLED_TOKEN_ID_TABLE_NAME,
		tokenIDCountersTableName: process.env.TEST_INDEX_COUNTERS_TABLE_NAME,
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
		NFTTableName: process.env.TEST_NFT_DYNAMODB_TABLE_NAME,
		whitelistTableName: process.env.TEST_WHITELIST_DYNAMODB_TABLE_NAME,
		tokenIDTableName: process.env.TEST_SHUFFLED_TOKEN_ID_TABLE_NAME,
		tokenIDCountersTableName: process.env.TEST_INDEX_COUNTERS_TABLE_NAME,
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
		contractAddress: process.env.MAINNET_CONTRACT_ADDRESS,
		NFTTableName: process.env.PRODUCTION_NFT_DYNAMODB_TABLE_NAME,
		whitelistTableName: process.env.PRODUCTION_WHITELIST_DYNAMODB_TABLE_NAME,
		tokenIDTableName: process.env.PRODUCTION_SHUFFLED_TOKEN_ID_TABLE_NAME,
		tokenIDCountersTableName: process.env.PRODUCTION_INDEX_COUNTERS_TABLE_NAME,
		authPrivateKey: process.env.PRODUCTION_AUTH_PRIVATE_KEY,
		contractArtifactPath: process.env.CONTRACT_ARTIFACT_PATH,
		category0TokenCount: process.env.PRODUCTION_CATEGORY_0_TOKEN_COUNT,
		category1TokenCount: process.env.PRODUCTION_CATEGORY_1_TOKEN_COUNT,
		category2TokenCount: process.env.PRODUCTION_CATEGORY_2_TOKEN_COUNT,
	}
};

module.exports = config;
