import { Wallet } from 'lib-wallet';
import { WalletStoreHyperbee } from 'lib-wallet-store';
import { BitcoinPay, Provider } from 'lib-wallet-pay-btc';
import Bip39 from 'wallet-seed-bip39';


// Main function to initialize and manage the wallet
async function main() {
    try {
        console.log('Starting wallet setup...');



        // Step 1: Generate a BIP39 seed (mnemonic phrase)
        const seed = await Bip39.generate();


        // Step 2: Initialize the wallet store (persistent storage)
        const store = new WalletStoreHyperbee({ store_path: './wallet-store' });
        await store.init()

        const provider = new Provider({ store: store, host: '34.82.233.188', port: 8000 })
        await provider.connect()

        // Step 3: Configure the Bitcoin payment module
        const btcPay = new BitcoinPay({
            asset_name: 'btc',
            provider,
            network: 'testnet',  // Change to 'mainnet' or 'testnet' as needed

        });

        // Step 4: Create the wallet instance
        const wallet = new Wallet({
            store,
            seed,
            assets: [btcPay],
        });

        // Step 5: Initialize and synchronize the wallet
        await wallet.initialize();
        await wallet.syncHistory();

        // Step 6: Generate a new Bitcoin receiving address
        const btcAddress = await wallet.pay.btc.getNewAddress();
        console.log('New Bitcoin Address:', btcAddress);

        // Step 7: Retrieve and display transaction history
        const transactions = await wallet.pay.btc.getTransactions();
        console.log('Transaction History:');
        if (transactions) {
            transactions.forEach(tx => console.log(tx));
        }

        const addrBalance = await wallet.pay.btc.getBalance({}, btcAddress.address)
        console.log('addrBalance: ', addrBalance);

        console.log('Wallet setup complete.');

    } catch (error) {
        console.error('Error during wallet setup:', error);
    }
}

// Call the main function
main();
