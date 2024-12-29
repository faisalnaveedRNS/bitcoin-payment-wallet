import { AI21 } from "@langchain/community/llms/ai21";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import dotenv from "dotenv"; // For environment variables
dotenv.config();

// Initialize AI21 LLM
const llm = new AI21({
    apiKey: process.env.AI21_API_KEY,  // Use environment variable for API key
});

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

// Initialize Embedding Model (OpenAI or similar)
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,  // API key for embeddings
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
    console.log("Query Results:", results);
    return results;
}

// Example Workflow
async function main() {
    await createEmbeddingsAndStore();
    const query = "How do I list my wallet?";
    const results = await queryVectorStore(query);
    console.log("AI21 Response:", response);
}

main().catch(console.error);
