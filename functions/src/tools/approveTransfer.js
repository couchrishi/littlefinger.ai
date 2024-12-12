const ai = require('../utils/genkit');
const { z } = require('genkit');
const { transferFunds } = require('../blockchain/transferFunds');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore();


const approveTransfer = ai.defineTool(
  {
    name: 'approveTransfer',
    description: 'Authorize the release or transfer of Vault funds and provide an explanation for the decision.',
    inputSchema: z.object({
      explanation: z.string().describe('The reason for approving the release of funds from the Vault.'),
    }),
    outputSchema: z.object({
      status: z.string(),
      txHash: z.string().optional(),
    }),
  },
  async (input, context) => {
    const { sessionId, queryID, queryText, networkID } = context || {};

    console.log(`💸 Approving transfer for sessionID: ${sessionId} with reason: ${input.explanation}`);

    if (!queryID) {
      console.error('❌ Missing queryID in context');
      return {
        status: 'failure',
        txHash: null
      };
    }

    if (!networkID) {
      console.error('❌ Missing networkID in context');
      return {
        status: 'failure',
        txHash: null
      };
    }

    try {
      // Call the transferFunds function
      //const result = await transferFunds(sessionId, networkID);
      console.log("Winner..Transferring funds....")
      
      // 🔥 Write to Firestore under 'littlefinger-explanations' collection
      const docRef = firestore.collection('littlefinger-explanations').doc(networkID); // use networkID as the document name
      await firestore.runTransaction(async (transaction) => {
        const explanationsDoc = await transaction.get(docRef);
        const data = explanationsDoc.exists ? explanationsDoc.data() : {};
        const explanationData = {
          queryID,
          queryText: queryText || 'Unknown',
          toolSelected: 'Approve',
          explanation: input.explanation
        };
        transaction.set(docRef, { [queryID]: explanationData }, { merge: true });
      });

      console.log(`✅ Explanation for queryID: ${queryID} successfully saved to Firestore (networkID: ${networkID}).`);

      return {
        status: result.status,
        txHash: result.txHash || null
      };
    } catch (error) {
      console.error(`❌ Error during approveTransfer for sessionID: ${sessionId} (networkID: ${networkID}):`, error);
      return {
        status: 'failure',
        txHash: null
      };
    }
  }
);

module.exports = approveTransfer;
