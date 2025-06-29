const { ethers } = require('ethers');
const winston = require('winston');
const config = require('../src/config/config');
const ContractSettings = require('../models/ContractSettings');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/contract-interaction.log' })
    ]
});

class ContractInteraction {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.ownerWallet = null;
        this.initialized = false;
        this.currentSettings = null;
    }

    async loadSettings() {
        try {
            const settings = await ContractSettings.getCurrentSettings();
            if (settings) {
                this.currentSettings = settings;
                return settings;
            } else {
                // Fallback to config file if no database settings
                this.currentSettings = null;
                return null;
            }
        } catch (error) {
            logger.error('Error loading contract settings:', error.message);
            this.currentSettings = null;
            return null;
        }
    }

    async initialize() {
        try {
            if (this.initialized) {
                return;
            }

            // Load settings from database first
            const settings = await this.loadSettings();

            let rpcUrl, ownerPrivateKey, contractAddress, contractABI;

            if (settings) {
                // Use database settings
                rpcUrl = settings.rpcUrl;
                ownerPrivateKey = settings.ownerPrivateKey;
                contractAddress = settings.contractAddress;
                contractABI = settings.contractABI;
                logger.info('Using contract settings from database');
            } else {
                // Fallback to config file
                rpcUrl = config.rpcUrl;
                ownerPrivateKey = config.ownerPrivateKey;
                contractAddress = config.contractAddress;
                contractABI = config.contractABI;
                logger.info('Using contract settings from config file (fallback)');
            }

            // Initialize provider
            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            // Test connection
            const network = await this.provider.getNetwork();
            logger.info(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

            // Initialize owner wallet
            if (!ownerPrivateKey || ownerPrivateKey === 'YOUR_OWNER_PRIVATE_KEY_HERE') {
                throw new Error('Owner private key not configured');
            }

            this.ownerWallet = new ethers.Wallet(ownerPrivateKey, this.provider);
            logger.info(`Owner wallet address: ${this.ownerWallet.address}`);

            // Debug: Log ABI functions
            const functionNames = contractABI
                .filter(item => item.type === 'function')
                .map(item => item.name);
            logger.info(`Available contract functions: ${functionNames.join(', ')}`);

            // Initialize contract
            this.contract = new ethers.Contract(
                contractAddress,
                contractABI,
                this.ownerWallet
            );

            // Verify contract exists
            const code = await this.provider.getCode(contractAddress);
            if (code === '0x') {
                throw new Error(`No contract found at address: ${contractAddress}`);
            }

            logger.info(`Contract initialized at: ${contractAddress}`);
            this.initialized = true;

        } catch (error) {
            logger.error(`Failed to initialize contract interaction: ${error.message}`);
            throw error;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    async reinitialize() {
        this.initialized = false;
        this.provider = null;
        this.ownerWallet = null;
        this.contract = null;
        this.currentSettings = null;
        await this.initialize();
    }

    // Whitelist a single address
    async whitlistAddress(userAddress, userPrivateKey) {
        try {
            await this.ensureInitialized();

            logger.info(`Whitelisting address: ${userAddress}`);

            // Create wallet for the user
            const userWallet = new ethers.Wallet(userPrivateKey, this.provider);
            const userContract = this.contract.connect(userWallet);

            // Check if already registered
            const isRegistered = await this.contract.checkIfRegistered(userAddress);
            if (isRegistered) {
                logger.info(`Address ${userAddress} is already registered`);
                return { success: true, txHash: null, alreadyRegistered: true };
            }

            // Get gas settings (use current settings or fallback to config)
            const gasPrice = this.currentSettings?.gasPrice || config.gasPrice;
            const gasLimitSetting = this.currentSettings?.gasLimit || config.gasLimit;

            // Estimate gas
            const gasEstimate = await userContract.whitlistAddress.estimateGas(userAddress);
            const gasLimit = Math.min(Math.floor(Number(gasEstimate) * 1.2), gasLimitSetting); // Add 20% buffer

            // Execute transaction
            const tx = await userContract.whitlistAddress(userAddress, {
                gasLimit: gasLimit,
                gasPrice: BigInt(gasPrice)
            });

            logger.info(`Whitelist transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                logger.info(`Address ${userAddress} whitelisted successfully. Gas used: ${receipt.gasUsed}`);
                return { success: true, txHash: tx.hash, gasUsed: receipt.gasUsed.toString() };
            } else {
                throw new Error('Transaction failed');
            }

        } catch (error) {
            logger.error(`Error whitelisting address ${userAddress}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Change platform wallet (only owner can do this)
    async changePlatformWallet(newPlatformWallet) {
        try {
            await this.ensureInitialized();

            logger.info(`Changing platform wallet to: ${newPlatformWallet}`);

            // Get gas settings (use current settings or fallback to config)
            const gasPrice = this.currentSettings?.gasPrice || config.gasPrice;
            const gasLimitSetting = this.currentSettings?.gasLimit || config.gasLimit;

            // Estimate gas
            const gasEstimate = await this.contract.changePlatformWallet.estimateGas(newPlatformWallet);
            const gasLimit = Math.min(Math.floor(Number(gasEstimate) * 1.2), gasLimitSetting);

            // Execute transaction
            const tx = await this.contract.changePlatformWallet(newPlatformWallet, {
                gasLimit: gasLimit,
                gasPrice: BigInt(gasPrice)
            });

            logger.info(`Platform wallet change transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                logger.info(`Platform wallet changed successfully. Gas used: ${receipt.gasUsed}`);
                return { success: true, txHash: tx.hash, gasUsed: receipt.gasUsed.toString() };
            } else {
                throw new Error('Transaction failed');
            }

        } catch (error) {
            logger.error(`Error changing platform wallet: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Get all registered addresses
    async getAllRegistered() {
        try {
            await this.ensureInitialized();

            logger.info('Fetching all registered addresses...');

            const registeredAddresses = await this.contract.getAllRegistered();
            const totalRegistered = await this.contract.totalRegistered();

            logger.info(`Found ${registeredAddresses.length} registered addresses`);

            return {
                success: true,
                addresses: registeredAddresses,
                total: totalRegistered.toString()
            };

        } catch (error) {
            logger.error(`Error getting registered addresses: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Execute single transfer for a user
    async singleTransfer(userAddress) {
        try {
            await this.ensureInitialized();

            logger.info(`Executing single transfer for: ${userAddress}`);

            // Check if user is registered
            const isRegistered = await this.contract.checkIfRegistered(userAddress);
            if (!isRegistered) {
                throw new Error(`Address ${userAddress} is not registered`);
            }

            // Get gas settings (use current settings or fallback to config)
            const gasPrice = this.currentSettings?.gasPrice || config.gasPrice;
            const gasLimitSetting = this.currentSettings?.gasLimit || config.gasLimit;

            // Estimate gas
            const gasEstimate = await this.contract.singleTransfer.estimateGas(userAddress);
            const gasLimit = Math.min(Math.floor(Number(gasEstimate) * 1.2), gasLimitSetting);

            // Execute transaction
            const tx = await this.contract.singleTransfer(userAddress, {
                gasLimit: gasLimit,
                gasPrice: BigInt(gasPrice)
            });

            logger.info(`Single transfer transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                logger.info(`Single transfer completed for ${userAddress}. Gas used: ${receipt.gasUsed}`);
                return { success: true, txHash: tx.hash, gasUsed: receipt.gasUsed.toString() };
            } else {
                throw new Error('Transaction failed');
            }

        } catch (error) {
            logger.error(`Error executing single transfer for ${userAddress}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Check if address is registered
    async checkIfRegistered(userAddress) {
        try {
            await this.ensureInitialized();
            const isRegistered = await this.contract.checkIfRegistered(userAddress);
            return { success: true, isRegistered };
        } catch (error) {
            logger.error(`Error checking registration for ${userAddress}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Get total extractable tokens
    async getTotalExtractableTokens() {
        try {
            await this.ensureInitialized();
            const total = await this.contract.getTotalExtractableTokens();
            return { success: true, total: total.toString() };
        } catch (error) {
            logger.error(`Error getting total extractable tokens: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Get current platform wallet
    async getPlatformWallet() {
        try {
            await this.ensureInitialized();
            const platformWallet = await this.contract.platformWallet();
            return { success: true, platformWallet };
        } catch (error) {
            logger.error(`Error getting platform wallet: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // Get contract owner
    async getOwner() {
        try {
            await this.ensureInitialized();
            const owner = await this.contract.owner();
            return { success: true, owner };
        } catch (error) {
            logger.error(`Error getting contract owner: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const contractInteraction = new ContractInteraction();

module.exports = contractInteraction;
