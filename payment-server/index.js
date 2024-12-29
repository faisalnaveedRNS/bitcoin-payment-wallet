import RPC from "@hyperswarm/rpc";  // Import RPC for remote procedure call handling
import DHT from "hyperdht";          // Import Distributed Hash Table for peer-to-peer communication
import Hypercore from "hypercore";   // Import Hypercore for distributed log-based storage
import Hyperbee from "hyperbee";     // Import Hyperbee, a database built on top of Hypercore
import crypto from "crypto";         // Import crypto for secure random byte generation
import { MemoryVectorStore } from "langchain/vectorstores/memory";  // Import in-memory vector store from LangChain
import { CohereEmbeddings } from "@langchain/cohere";  // Import Cohere embeddings for NLP tasks
import { Document } from "langchain/document";         // Import Document class from LangChain
import dotenv from "dotenv";         // Import dotenv to handle environment variables
import { Wallet } from 'lib-wallet'; // Import Wallet class for Bitcoin wallet operations
import { WalletStoreHyperbee } from 'lib-wallet-store';  // Import wallet storage using Hyperbee
import { BitcoinPay, Provider } from 'lib-wallet-pay-btc';  // Import Bitcoin payment and provider classes
import Bip39 from 'wallet-seed-bip39';  // Import BIP39 for mnemonic seed generation

dotenv.config();  // Load environment variables from .env file

// Sample JSON data representing user commands and their descriptions
const jsonData = {
    "create-wallet": "create a new bitcoin wallet",
    "show-balance": "show the balance",
    "list-transactions": "list recent transactions of the wallet",
    "make-payment": "make a bitcoin payment from user wallet",
};

// Convert JSON to LangChain Document objects for embedding
const documents = Object.entries(jsonData).map(
    ([key, value]) =>
        new Document({
            pageContent: value,
            metadata: { id: key },  // Store command name as metadata for easy retrieval
        })
);

// Initialize Cohere Embedding Model for document embeddings
const embeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,  // Use API key from environment variables
    model: "embed-english-v3.0"          // Use specific embedding model
});

// Create an in-memory vector store to hold embedded documents
const vectorStore = new MemoryVectorStore(embeddings);

// Function to embed and store documents in vector store
async function createEmbeddingsAndStore() {
    await vectorStore.addDocuments(documents);  // Embed and store documents
    console.log("Documents embedded and stored in vector database.");
}

// Function to query vector store for similar documents
async function queryVectorStore(query) {
    const results = await vectorStore.similaritySearch(query, 1);  // Perform similarity search for top result
    const key = results[0]?.metadata.id;  // Extract the command ID from the result
    if (results.length > 0) {
        return key;  // Return the matched command
    } else {
        console.log("No relevant documents found.");
        return;
    }
}

// Function to set up a Bitcoin wallet
async function setupWallet() {
    try {
        console.log('Starting wallet setup...');

        // Step 1: Generate a BIP39 mnemonic seed (used for wallet generation)
        const seed = await Bip39.generate();

        // Step 2: Initialize wallet store using Hyperbee for persistent storage
        const store = new WalletStoreHyperbee({ store_path: './wallet-store' });
        await store.init();

        // Step 3: Configure Electrum server connection
        const host = process.env.ELECTRUM_HOST;
        const port = process.env.ELECTRUM_PORT;
        const provider = new Provider({ store: store, host: host, port: port });
        await provider.connect();  // Connect to the Electrum server

        // Step 4: Configure Bitcoin payment module with testnet settings
        const btcPay = new BitcoinPay({
            asset_name: 'btc',
            provider,
            network: 'testnet',  // Change to 'mainnet' if deploying to main Bitcoin network
        });

        // Step 5: Create wallet instance linked to the seed and provider
        const wallet = new Wallet({
            store,
            seed,
            assets: [btcPay],  // Attach Bitcoin payment module to the wallet
        });

        // Step 6: Initialize wallet and synchronize transaction history
        await wallet.initialize();
        await wallet.syncHistory();
        return wallet;
    } catch (error) {
        console.error('Error during wallet setup:', error);
    }
}

// Function to initialize and configure Hyperbee database
async function setupHyperBee() {
    const hcore = new Hypercore("./db/rpc-server");  // Initialize Hypercore log storage
    const hbee = new Hyperbee(hcore, {
        keyEncoding: "utf-8",
        valueEncoding: "binary",
    });
    await hbee.ready();  // Wait until the database is ready
    return hbee;
}

// Function to configure Distributed Hash Table (DHT)
async function setupDHT(dhtSeed) {
    const host = process.env.DHT_HOST;
    const port = process.env.DHT_PORT;

    // Initialize DHT with specified seed and bootstrap peers
    const dht = new DHT({
        port: 40001,
        keyPair: DHT.keyPair(dhtSeed),  // Use a key pair derived from the seed
        bootstrap: [{ host: host, port: parseInt(port) }],  // Connect to bootstrap DHT node
    });
    await dht.ready();  // Wait for DHT to be ready
    return dht;
}

// Function to initialize RPC server for remote communication
async function setupRPCServer(rpcSeed, dht) {
    const rpc = new RPC({ seed: rpcSeed, dht });  // Create RPC instance with seed and DHT
    const rpcServer = rpc.createServer();  // Initialize RPC server
    await rpcServer.listen();  // Start listening for incoming RPC calls
    console.log("rpc server started listening on public key:", rpcServer.publicKey.toString("hex"));
    return rpcServer;
}

// Main function to set up wallet, embeddings, and RPC services
const main = async () => {
    const wallet = await setupWallet();  // Set up Bitcoin wallet
    await createEmbeddingsAndStore();    // Create and store document embeddings

    const hbee = await setupHyperBee();  // Initialize Hyperbee for DHT/RPC seeds

    // Retrieve or generate DHT seed
    let dhtSeed = (await hbee.get("dht-seed"))?.value;
    if (!dhtSeed) {
        dhtSeed = crypto.randomBytes(32);  // Generate random seed if not found
        await hbee.put("dht-seed", dhtSeed);  // Store seed in database
    }

    const dht = await setupDHT(dhtSeed);  // Set up DHT network

    // Retrieve or generate RPC server seed
    let rpcSeed = (await hbee.get("rpc-seed"))?.value;
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32);  // Generate new RPC seed if not found
        await hbee.put("rpc-seed", rpcSeed);
    }

    const rpcServer = await setupRPCServer(rpcSeed, dht);  // Set up RPC server
    let address;

    // Handle incoming RPC calls with message parsing
    rpcServer.respond("message", async (reqRaw) => {
        let resp = {};

        try {
            const req = JSON.parse(reqRaw.toString("utf-8"));
            const message = req.message;

            const command = await queryVectorStore(message);  // Interpret command using LangChain

            // Execute wallet operations based on command
            switch (command) {
                case 'create-wallet':
                    const btcAddress = await wallet.pay.btc.getNewAddress();
                    address = btcAddress;
                    resp = { address: btcAddress };
                    break;
                case 'show-balance':
                    const balance = await wallet.pay.btc.getBalance({}, address.address);
                    resp = { balance: balance };
                    break;
                case 'list-transactions':
                    const transactions = await wallet.pay.btc.getTransactions({}, address.address);
                    resp = { transactions: transactions };
                    break;
                case 'make-payment':
                    const result = await wallet.pay.btc.sendTransaction({}, {
                        to: 'tb1qaddress', amount: 0.0001, unit: 'main', fee: 10,
                    });
                    resp = { result: result };
                    break;
                default:
                    throw new Error("Unknown command: " + command);
            }
        } catch (err) {
            resp = { error: { message: err.message, code: 500 } };
        }

        return Buffer.from(JSON.stringify(resp), "utf-8");
    });
};

main().catch(console.error);  // Run main function and handle errors
