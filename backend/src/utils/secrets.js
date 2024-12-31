// src/utils/secrets.js
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const secretManagerClient = new SecretManagerServiceClient();

const secrets = {
  testnet: {
    GCP_PROJECT_ID: "GCP_PROJECT_ID",
    GCP_LOCATION: "GCP_LOCATION",
    SERVICE_ACCOUNT_KEY: "SERVICE_ACCOUNT_KEY",
    CONTRACT_ADDRESS: "AMOY_CONTRACT_ADDRESS",
    WSS_URL: "POLYGON_AMOY_WSS_URL",
    RPC_URL: "POLYGON_AMOY_RPC_URL",
    PRIVATE_KEY: "AMOY_DEPLOYER_PRIVATE_KEY",
    ALCHEMY_API_KEY: "AMOY_ALCHEMY_API_KEY",
    PROJECT_NAMESPACE: "PROJECT_NAMESPACE",
    CMC_API_KEY: "CMC_API_KEY",
  },
  mainnet: {
    GCP_PROJECT_ID: "GCP_PROJECT_ID",
    GCP_LOCATION: "GCP_LOCATION",
    SERVICE_ACCOUNT_KEY: "SERVICE_ACCOUNT_KEY",
    CONTRACT_ADDRESS: "MAINNET_CONTRACT_ADDRESS",
    WSS_URL: "POLYGON_MAINNET_WSS_URL",
    RPC_URL: "POLYGON_MAINNET_RPC_URL",
    PRIVATE_KEY: "MAINNET_DEPLOYER_PRIVATE_KEY",
    ALCHEMY_API_KEY: "POLYGON_MAINNET_ALCHEMY_API_KEY",
    PROJECT_NAMESPACE: "PROJECT_NAMESPACE",
    CMC_API_KEY: "CMC_API_KEY",
  },
  currentConfig: {
    NETWORK: "CURRENT_NETWORK",
    GAME_USERNAME: "GAME_USERNAME",
    GAME_PASSWORD: "GAME_PASSWORD",
  }
};

async function accessSecret(secretName) {
  try {
    const [version] = await secretManagerClient.accessSecretVersion({
      name: `projects/saib-ai-playground/secrets/${secretName}/versions/latest`
    });
    let secret = version.payload.data.toString('utf8').trim();
    return secret;
  } catch (error) {
    console.error(`❌ Failed to access secret ${secretName}:`, error);
    throw new Error(`SecretManager error for ${secretName}`);
  }
}

async function getNetworkSecrets(network) {
  if (!secrets[network]) {
    throw new Error(`❌ Invalid network: ${network}. Supported networks: testnet, mainnet`);
  }

  const networkSecrets = secrets[network];
  const secretEntries = await Promise.all(
    Object.entries(networkSecrets).map(async ([key, secretName]) => {
      const secretValue = await accessSecret(secretName);
      return [key, secretValue];
    })
  );

  return Object.fromEntries(secretEntries);
}

module.exports = { 
  getNetworkSecrets, 
  accessSecret 
};