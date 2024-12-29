import RPC from "@hyperswarm/rpc";
import DHT from "hyperdht";
import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import crypto from "crypto";

const main = async () => {
    // Initialize Hypercore and Hyperbee for local key-value storage (acts as a simple database)
    const hcore = new Hypercore("./db/rpc-client");  // Hypercore log stored in ./db/rpc-client
    const hbee = new Hyperbee(hcore, {
        keyEncoding: "utf-8",  // Keys are stored as utf-8 strings
        valueEncoding: "binary",  // Values are stored as binary buffers
    });
    await hbee.ready();  // Wait for the Hyperbee instance to initialize

    // Retrieve or generate the DHT seed (used to maintain a persistent identity on the DHT network)
    let dhtSeed = (await hbee.get("dht-seed"))?.value;  // Fetch the existing seed from the database
    if (!dhtSeed) {
        // If no seed is found, generate a new random 32-byte seed
        dhtSeed = crypto.randomBytes(32);
        await hbee.put("dht-seed", dhtSeed);  // Store the new seed in the database for future use
    }

    // Start Distributed Hash Table (DHT) instance for service discovery and communication
    const dht = new DHT({
        port: 50001,  // Local port to bind the DHT node
        keyPair: DHT.keyPair(dhtSeed),  // Use the generated/retrieved key pair
        bootstrap: [{ host: "127.0.0.1", port: 30001 }],  // Bootstrap server for initial connection to the DHT network
    });
    await dht.ready();  // Wait for the DHT instance to initialize

    // Public key of the RPC server (used for addressless service discovery over DHT)
    const serverPubKey = Buffer.from(
        "9b1a8275466d2ac9f54196c6b7d1d53276de62a0e4698065d895e1dc2a7a26dd",
        "hex"
    );

    // Initialize RPC client to send requests over the DHT network
    const rpc = new RPC({ dht });

    let payloadRaw;
    let respRaw;
    let resp;

    // 1. Request to create a new bitcoin wallet
    payloadRaw = crateWalletReq();  // Create the request payload
    respRaw = await rpc.request(serverPubKey, "message", payloadRaw);  // Send RPC request to the server
    resp = JSON.parse(respRaw.toString("utf-8"));  // Parse the binary response to JSON
    console.log(resp);  // Log the server response to the console

    // 2. Request to show the wallet balance
    payloadRaw = showBalanceReq();
    respRaw = await rpc.request(serverPubKey, "message", payloadRaw);
    resp = JSON.parse(respRaw.toString("utf-8"));
    console.log(resp);

    // 3. Request to list recent wallet transactions
    payloadRaw = listTransactionReq();
    respRaw = await rpc.request(serverPubKey, "message", payloadRaw);
    resp = JSON.parse(respRaw.toString("utf-8"));
    console.log(resp);

    // 4. Request to make a payment from the wallet
    payloadRaw = makePaymentReq();
    respRaw = await rpc.request(serverPubKey, "message", payloadRaw);
    resp = JSON.parse(respRaw.toString("utf-8"));
    console.log(resp);

    // Clean up: Close the RPC and DHT instances to release resources
    await rpc.destroy();
    await dht.destroy();
};


// Helper function to create payload for wallet creation request
function crateWalletReq() {
    const payload = { message: 'create a bitcoin wallet' };  // Define the request message
    const payloadRaw = Buffer.from(JSON.stringify(payload), "utf-8");  // Encode as buffer
    return payloadRaw;
}

// Helper function to create payload for balance inquiry request
function showBalanceReq() {
    const payload = { message: 'show my balance' };
    const payloadRaw = Buffer.from(JSON.stringify(payload), "utf-8");
    return payloadRaw;
}

// Helper function to create payload for listing transactions
function listTransactionReq() {
    const payload = { message: 'list my transactions which are recent' };
    const payloadRaw = Buffer.from(JSON.stringify(payload), "utf-8");
    return payloadRaw;
}

// Helper function to create payload for making a payment
function makePaymentReq() {
    const payload = { message: 'make payment from my wallet' };
    const payloadRaw = Buffer.from(JSON.stringify(payload), "utf-8");
    return payloadRaw;
}

// Run the main function and handle errors
main().catch(console.error);
