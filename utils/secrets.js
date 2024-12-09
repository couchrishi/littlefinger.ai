const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const secrets = {
  testnet: {
    SERVICE_ACCOUNT_KEY: "SERVICE_ACCOUNT_KEY",
    CONTRACT_ADDRESS: "AMOY_CONTRACT_ADDRESS",
    WSS_URL: "POLYGON_AMOY_WSS_URL",
    RPC_URL: "POLYGON_AMOY_RPC_URL",
    PRIVATE_KEY: "AMOY_DEPLOYER_PRIVATE_KEY",
  },
  mainnet: {
    SERVICE_ACCOUNT_KEY: "SERVICE_ACCOUNT_KEY",
    CONTRACT_ADDRESS: "MAINNET_CONTRACT_ADDRESS",
    WSS_URL: "POLYGON_MAINNET_WSS_URL",
    RPC_URL: "POLYGON_MAINNET_RPC_URL",
    PRIVATE_KEY: "MAINNET_DEPLOYER_PRIVATE_KEY",
  }
};

async function accessSecret(secretName) {
  try {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/saib-ai-playground/secrets/${secretName}/versions/latest`
    });
    const secret = version.payload.data.toString('utf8');
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

  // Use Promise.all to fetch secrets in parallel
  const secretEntries = await Promise.all(
    Object.entries(networkSecrets).map(async ([key, secretName]) => {
      const secretValue = await accessSecret(secretName);
      return [key, secretValue]; // Return key-value pair
    })
  );

  // Convert the array of key-value pairs back to an object
  const secretValues = Object.fromEntries(secretEntries);

  return secretValues;
}

module.exports = { getNetworkSecrets, accessSecret };
