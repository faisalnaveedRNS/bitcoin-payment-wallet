import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { CohereEmbeddings } from "@langchain/cohere";
import { Document } from "langchain/document";
import dotenv from "dotenv"; // For environment variables
dotenv.config();

// Sample JSON data
const jsonData = {
    "create-wallet": "create a wallet",
    "list-wallet": "list my wallets"
};

// Convert JSON to Document objects
const documents = Object.entries(jsonData).map(
    ([key, value]) =>
        new Document({
            pageContent: value,
            metadata: { id: key },
        })
);

// Initialize Cohere Embedding Model
const embeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,  // API key for Cohere
    model: "embed-english-v3.0"
});

// Create In-Memory Vector Store
const vectorStore = new MemoryVectorStore(embeddings);

// Function to Embed and Store Documents
async function createEmbeddingsAndStore() {
    await vectorStore.addDocuments(documents);
    console.log("Documents embedded and stored in vector database.");
}

// Query for Similar Documents
async function queryVectorStore(query) {
    const results = await vectorStore.similaritySearch(query, 1);
    const key = results[0].metadata.id
    if (results.length > 0) {
        console.log("Query Results:", key);
        return key;
    } else {
        console.log("No relevant documents found.");
        return "No relevant documents found.";
    }
}

// Example Workflow
async function main() {
    await createEmbeddingsAndStore();
    const query = "How do I list my wallet?";
    const response = await queryVectorStore(query);

    console.log("Final Response:", response);
}

main().catch(console.error);
