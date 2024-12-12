const { z } = require('genkit');
const ai = require('../utils/genkit');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore();

const rejectTransfer = ai.defineTool(
  {
    name: 'rejectTransfer',
    description: 'Reject the release or transfer of Vault funds and provide an explanation for the decision.',
    inputSchema: z.object({
      explanation: z.string().describe('The reason for rejecting the release of funds from the Vault.'),
    }),
    outputSchema: z.object({
      status: z.string(),
    }),
  },
  async (input) => {

    //const { sessionId, queryId, queryText, networkId } = session?.state?.context || {};
    //console.log(`❌ Rejecting transfer for sessionId: ${sessionId} with reason: ${input.explanation}`);
    console.log(`❌ Rejecting transfer for sessionId:`);

    // if (!queryId) {
    //   console.error('❌ Missing queryId in context');
    //   return {
    //     status: 'failure'
    //   };
    // }

    // if (!networkId) {
    //   console.error('❌ Missing networkId in context');
    //   return {
    //     status: 'failure'
    //   };
    // }

    // try {
    //   // 🔥 Write to Firestore under 'littlefinger-explanations' collection
    //   console.log("Loser..Not transferring funds....")

    //   const docRef = firestore.collection('littlefinger-explanations').doc(networkId); // use networkId as the document name
    //   await firestore.runTransaction(async (transaction) => {
    //     const explanationsDoc = await transaction.get(docRef);
    //     const data = explanationsDoc.exists ? explanationsDoc.data() : {};
    //     const explanationData = {
    //       queryId,
    //       queryText: queryText || 'Unknown',
    //       toolSelected: 'Reject',
    //       explanation: input.explanation
    //     };
    //     transaction.set(docRef, { [queryId]: explanationData }, { merge: true });
    //   });

    //   console.log(`✅ Rejection explanation for queryId: ${queryId} successfully saved to Firestore (networkId: ${networkId}).`);

    //   return {
    //     status: 'rejected'
    //   };
    // } catch (error) {
    //   console.error(`❌ Error during rejectTransfer for sessionId: ${sessionId} (networkId: ${networkId}):`, error);
    //   return {
    //     status: 'failure'
    //   };
    // }
  }
);

module.exports = rejectTransfer;
