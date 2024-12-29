import dotenv from "dotenv"; // For environment variables
dotenv.config();
import { LlamaCloudIndex } from "llamaindex";

// Sample JSON Data (Text for Embeddings)
const data = {
    "create-wallet": "create a wallet",
    "list-wallet": "list my wallets",
};

const index = new LlamaCloudIndex({
    apiKey: process.env.LLAMA_CLOUD_API_KEY,
});

// Main Function to Handle All Tasks
async function main() {
    try {
        // Step 1: Create Embeddings from JSON Data
        await createEmbeddings(data);

        // Step 2: Configure Retriever
        const retriever = configureRetriever();

        // Step 3: Perform Query Retrieval
        const queryText = "show my wallets";
        await queryIndex(retriever, queryText);
    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

// Function to Create Embeddings from JSON
async function createEmbeddings(jsonData) {
    const documents = Object.entries(jsonData).map(([key, value]) => ({
        id: key,
        text: value,
    }));

    await index.addDocuments(documents);
    console.log("Embeddings created and documents added to the index.");
}

// Configure Retriever for Hybrid Search
function configureRetriever() {
    return index.asRetriever({
        similarityTopK: 3,
        sparseSimilarityTopK: 3,
        alpha: 0.5,
        enableReranking: true,
        rerankTopN: 3,
    });
}

// Perform Query and Log Results
async function queryIndex(retriever, queryText) {
    const nodes = await retriever.retrieve({
        query: queryText,
    });

    console.log(`\nQuery Results for: "${queryText}"`);
    nodes.forEach((node, index) => {
        console.log(`${index + 1}. ${node.text} (ID: ${node.id})`);
    });
}

// Run Main
main();
