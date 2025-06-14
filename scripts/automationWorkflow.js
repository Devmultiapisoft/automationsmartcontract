const database = require('../utils/database');
const contractInteraction = require('../utils/contractInteraction');
const Wallet = require('../models/Wallet');
const { generateWallets } = require('./generateWallets');
const winston = require('winston');
const fs = require('fs').promises;

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
        new winston.transports.File({ filename: 'logs/automation-workflow.log' })
    ]
});

class AutomationWorkflow {
    constructor() {
        this.wallets = [];
        this.stats = {
            generated: 0,
            platformChanged: 0,
            transferred: 0,
            errors: 0
        };
    }

    async step1_GenerateAndStoreWallets(count = 5000) {
        try {
            logger.info(`STEP 1: Generating ${count} wallets...`);
            
            // Connect to database
            await database.connect();
            
            // Generate wallets
            this.wallets = await generateWallets(count);
            this.stats.generated = this.wallets.length;
            
            // Store in database
            logger.info('Storing wallets in database...');
            for (const walletData of this.wallets) {
                const wallet = new Wallet({
                    walletId: walletData.id,
                    address: walletData.address.toLowerCase(),
                    privateKey: walletData.privateKey,
                    mnemonic: walletData.mnemonic
                });

                try {
                    await wallet.save();
                } catch (error) {
                    if (error.code !== 11000) { // Ignore duplicate key errors
                        throw error;
                    }
                }
            }
            
            logger.info(`✅ STEP 1 COMPLETED: Generated and stored ${this.stats.generated} wallets`);
            return true;
            
        } catch (error) {
            logger.error(`❌ STEP 1 FAILED: ${error.message}`);
            throw error;
        }
    }

    async step2_ChangePlatformWalletForEach(batchSize = 20, delayMs = 3000) {
        try {
            logger.info(`STEP 2: Changing platform wallet for each generated address...`);
            
            // Initialize contract interaction
            await contractInteraction.initialize();
            
            // Get all wallets from database
            const allWallets = await Wallet.find({}).sort({ walletId: 1 });
            logger.info(`Found ${allWallets.length} wallets to process`);
            
            let successCount = 0;
            let errorCount = 0;
            
            // Process in batches
            for (let i = 0; i < allWallets.length; i += batchSize) {
                const batch = allWallets.slice(i, i + batchSize);
                
                logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allWallets.length / batchSize)} (${batch.length} wallets)`);
                
                for (const wallet of batch) {
                    try {
                        logger.info(`Changing platform wallet to: ${wallet.address}`);
                        
                        const result = await contractInteraction.changePlatformWallet(wallet.address);
                        
                        if (result.success) {
                            await wallet.markPlatformWalletChanged(result.txHash);
                            successCount++;
                            logger.info(`✅ Platform wallet changed to ${wallet.address}. TX: ${result.txHash}`);
                        } else {
                            await wallet.recordError(result.error);
                            errorCount++;
                            logger.error(`❌ Failed to change platform wallet for ${wallet.address}: ${result.error}`);
                        }
                        
                        // Small delay between transactions
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (error) {
                        await wallet.recordError(error.message);
                        errorCount++;
                        logger.error(`❌ Error processing wallet ${wallet.address}: ${error.message}`);
                    }
                }
                
                // Delay between batches
                if (i + batchSize < allWallets.length) {
                    logger.info(`Waiting ${delayMs}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
            
            this.stats.platformChanged = successCount;
            this.stats.errors += errorCount;
            
            logger.info(`✅ STEP 2 COMPLETED: Platform wallet changed for ${successCount} addresses`);
            logger.info(`❌ Errors: ${errorCount}`);
            return true;
            
        } catch (error) {
            logger.error(`❌ STEP 2 FAILED: ${error.message}`);
            throw error;
        }
    }

    async step3_GetAllRegisteredAddresses() {
        try {
            logger.info(`STEP 3: Fetching all registered addresses from contract...`);
            
            const result = await contractInteraction.getAllRegistered();
            
            if (!result.success) {
                throw new Error(`Failed to get registered addresses: ${result.error}`);
            }
            
            const registeredAddresses = result.addresses;
            this.stats.registered = registeredAddresses.length;
            
            logger.info(`Found ${registeredAddresses.length} registered addresses in contract`);
            
            // Save registered addresses to file
            await fs.mkdir('data', { recursive: true });
            const filename = `data/registered-addresses-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await fs.writeFile(filename, JSON.stringify({
                timestamp: new Date().toISOString(),
                total: registeredAddresses.length,
                addresses: registeredAddresses
            }, null, 2));
            
            logger.info(`Registered addresses saved to: ${filename}`);
            logger.info(`✅ STEP 3 COMPLETED: Found ${this.stats.registered} registered addresses`);
            
            return registeredAddresses;
            
        } catch (error) {
            logger.error(`❌ STEP 3 FAILED: ${error.message}`);
            throw error;
        }
    }

    async step4_SingleTransferForAll(batchSize = 10, delayMs = 5000) {
        try {
            logger.info(`STEP 4: Executing single transfer for wallets with successful platform changes...`);

            // Get wallets that have platform wallet changed but transfer not completed
            const walletsForTransfer = await Wallet.find({
                platformWalletChanged: true,
                transferCompleted: false
            }).sort({ walletId: 1 });

            logger.info(`Found ${walletsForTransfer.length} wallets ready for transfer`);

            if (walletsForTransfer.length === 0) {
                logger.info('No wallets need transfer');
                return true;
            }

            let successCount = 0;
            let errorCount = 0;
            let totalGasUsed = BigInt(0);

            // Process in batches
            for (let i = 0; i < walletsForTransfer.length; i += batchSize) {
                const batch = walletsForTransfer.slice(i, i + batchSize);

                logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(walletsForTransfer.length / batchSize)} (${batch.length} wallets)`);

                for (const wallet of batch) {
                    try {
                        logger.info(`Executing single transfer for: ${wallet.address}`);

                        const result = await contractInteraction.singleTransfer(wallet.address);

                        if (result.success) {
                            await wallet.markTransferCompleted(result.txHash, '0');
                            successCount++;
                            totalGasUsed += BigInt(result.gasUsed || 0);
                            logger.info(`✅ Transfer completed for ${wallet.address}. TX: ${result.txHash}`);
                        } else {
                            await wallet.recordError(result.error);
                            errorCount++;
                            logger.error(`❌ Failed to transfer for ${wallet.address}: ${result.error}`);
                        }

                        // Small delay between transactions
                        await new Promise(resolve => setTimeout(resolve, 2000));

                    } catch (error) {
                        await wallet.recordError(error.message);
                        errorCount++;
                        logger.error(`❌ Error processing transfer for ${wallet.address}: ${error.message}`);
                    }
                }

                // Delay between batches
                if (i + batchSize < walletsForTransfer.length) {
                    logger.info(`Waiting ${delayMs}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }

            this.stats.transferred = successCount;
            this.stats.errors += errorCount;

            logger.info(`✅ STEP 4 COMPLETED: Transfers completed for ${successCount} addresses`);
            logger.info(`❌ Errors: ${errorCount}`);
            logger.info(`⛽ Total gas used: ${totalGasUsed.toString()}`);
            return true;

        } catch (error) {
            logger.error(`❌ STEP 4 FAILED: ${error.message}`);
            throw error;
        }
    }

    async runCompleteWorkflow(walletCount = 5000, batchSizes = { platform: 20, transfer: 10 }, delays = { platform: 3000, transfer: 5000 }) {
        try {
            logger.info('🚀 STARTING COMPLETE AUTOMATION WORKFLOW');
            logger.info('================================================');
            
            const startTime = Date.now();
            
            // Step 1: Generate and store wallets
            await this.step1_GenerateAndStoreWallets(walletCount);
            
            // Step 2: Change platform wallet for each generated address
            await this.step2_ChangePlatformWalletForEach(batchSizes.platform, delays.platform);
            
            // Step 3: Get all registered addresses (for reporting)
            await this.step3_GetAllRegisteredAddresses();

            // Step 4: Execute single transfer for all platform-changed wallets
            await this.step4_SingleTransferForAll(batchSizes.transfer, delays.transfer);
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
            
            // Final summary
            logger.info('================================================');
            logger.info('🎉 AUTOMATION WORKFLOW COMPLETED SUCCESSFULLY!');
            logger.info('================================================');
            logger.info(`📊 FINAL STATISTICS:`);
            logger.info(`- Wallets generated: ${this.stats.generated}`);
            logger.info(`- Platform wallet changes: ${this.stats.platformChanged}`);
            logger.info(`- Addresses registered: ${this.stats.registered}`);
            logger.info(`- Transfers completed: ${this.stats.transferred}`);
            logger.info(`- Total errors: ${this.stats.errors}`);
            logger.info(`- Total duration: ${duration} minutes`);
            logger.info('================================================');
            
            return this.stats;
            
        } catch (error) {
            logger.error(`💥 WORKFLOW FAILED: ${error.message}`);
            throw error;
        } finally {
            await database.disconnect();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const walletCount = process.argv[2] ? parseInt(process.argv[2]) : 5000;
    
    const workflow = new AutomationWorkflow();
    
    workflow.runCompleteWorkflow(walletCount)
        .then((stats) => {
            logger.info('Automation workflow completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error(`Automation workflow failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = AutomationWorkflow;
