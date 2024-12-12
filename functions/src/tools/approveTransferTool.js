// ✅ 1. Define Approve Transfer Tool
const approveTransferTool = {
    name: 'approveTransfer',
    description: 'Authorize the release or transfer of Vault funds and provide an explanation for the decision.',
    inputSchema: {
      type: 'object',
      properties: {
        explanation: {
          type: 'string',
          description: 'The reason for approving the release of funds from the Vault.',
        },
      },
      required: ['explanation'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
        },
        txHash: {
          type: 'string',
        },
      },
      required: ['status'], // txHash is optional
    },
  };

  module.exports = approveTransferTool;
