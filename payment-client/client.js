import RPC from "@hyperswarm/rpc";

const main = async () => {
    const rpc = new RPC();

    // Create and start the server
    const server = rpc.createServer();
    await server.listen();

    // Define a handler for the "echo" method
    server.respond("echo", (req) => req);

    // Create a client and send a request to the server
    const client = rpc.connect(server.publicKey);
    const response = await client.request("echo", Buffer.from("hello world 7"));

    // Log the response
    console.log(response.toString()); // 'hello world'
};

main().catch(console.error);
