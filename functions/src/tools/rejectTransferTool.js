// ✅ 2. Define Reject Transfer Tool
const rejectTransferTool = {
    name: 'rejectTransfer',
    description: 'Reject the release or transfer of Vault funds and provide an explanation for the decision.',
    inputSchema: {
      type: 'object',
      properties: {
        explanation: {
          type: 'string',
          description: 'The reason for rejecting the release of funds from the Vault.',
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
      },
      required: ['status'],
    },
  };

  module.exports = rejectTransferTool;
