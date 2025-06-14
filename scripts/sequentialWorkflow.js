const database = require('../utils/database');
const contractInteraction = require('../utils/contractInteraction');
const Wallet = require('../models/Wallet');
const RegisteredAddress = require('../models/RegisteredAddress');
const { ethers } = require('ethers');
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
        new winston.transports.File({ filename: 'logs/sequential-workflow.log' })
    ]
});

class SequentialWorkflow {
    constructor() {
        this.stats = {
            totalRegistered: 0,
            walletsGenerated: 0,
            platformChanges: 0,
            transfers: 0,
            errors: 0,
            registeredAddressesFetched: 0
        };
        this.processedPairs = []; // Track wallet-registered address pairs
    }



    async generateSingleWallet(walletId) {
        try {
            // Generate random wallet
            const wallet = ethers.Wallet.createRandom();
            
            const walletData = {
                walletId: walletId,
                address: wallet.address.toLowerCase(),
                privateKey: wallet.privateKey,
                mnemonic: wallet.mnemonic?.phrase || null,
                platformWalletChanged: false,
                transferCompleted: false,
                createdAt: new Date()
            };
            
            // Save to database
            const dbWallet = new Wallet(walletData);
            await dbWallet.save();
            
            logger.info(`✅ Generated and stored wallet ${walletId}: ${wallet.address}`);
            return dbWallet;
            
        } catch (error) {
            logger.error(`❌ Error generating wallet ${walletId}: ${error.message}`);
            throw error;
        }
    }

    async performPlatformChange(wallet) {
        try {
            logger.info(`🔄 Performing platform change for wallet ${wallet.walletId}: ${wallet.address}`);

            const result = await contractInteraction.changePlatformWallet(wallet.address);

            if (result.success) {
                await wallet.markPlatformWalletChanged(result.txHash);
                this.stats.platformChanges++;
                logger.info(`✅ Platform change completed for ${wallet.address}. TX: ${result.txHash}`);
                return { success: true, txHash: result.txHash };
            } else {
                await wallet.recordError(result.error);
                this.stats.errors++;
                logger.error(`❌ Platform change failed for ${wallet.address}: ${result.error}`);
                return { success: false, error: result.error };
            }

        } catch (error) {
            await wallet.recordError(error.message);
            this.stats.errors++;
            logger.error(`❌ Error in platform change for ${wallet.address}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async performSingleTransfer(registeredAddress) {
        try {
            logger.info(`💸 Performing single transfer for registered address ${registeredAddress.processOrder}: ${registeredAddress.address}`);

            const result = await contractInteraction.singleTransfer(registeredAddress.address);

            if (result.success) {
                await registeredAddress.markTransferCompleted(result.txHash);
                this.stats.transfers++;
                logger.info(`✅ Transfer completed for ${registeredAddress.address}. TX: ${result.txHash}`);
                return { success: true, txHash: result.txHash };
            } else {
                await registeredAddress.recordError(result.error);
                this.stats.errors++;
                logger.error(`❌ Transfer failed for ${registeredAddress.address}: ${result.error}`);
                return { success: false, error: result.error };
            }

        } catch (error) {
            await registeredAddress.recordError(error.message);
            this.stats.errors++;
            logger.error(`❌ Error in transfer for ${registeredAddress.address}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async runSequentialWorkflow(delayBetweenWallets = 3000) {
        try {
            logger.info('🚀 STARTING SEQUENTIAL AUTOMATION WORKFLOW');
            logger.info('================================================');

            const startTime = Date.now();

            // Ensure database connection (don't disconnect after)
            await database.ensureConnection();

            // Step 1: Fetch and store all registered addresses from contract
            logger.info('📥 Step 1: Fetching registered addresses from contract...');

            // Initialize contract interaction first
            await contractInteraction.initialize();

            // Get registered addresses from contract
            const contractResult = await contractInteraction.getAllRegistered();

            if (!contractResult.success) {
                throw new Error(`Failed to get registered addresses: ${contractResult.error}`);
            }

            const contractAddresses = contractResult.addresses;
            logger.info(`Found ${contractAddresses.length} registered addresses in contract`);

            if (contractAddresses.length === 0) {
                logger.info('No registered addresses found in contract');
                return this.stats;
            }

            // Clear existing registered addresses
            await RegisteredAddress.deleteMany({});
            logger.info('Cleared existing registered addresses from database');

            let storedCount = 0;

            // Store each address with order number
            for (let i = 0; i < contractAddresses.length; i++) {
                const address = contractAddresses[i].toLowerCase();
                const orderNumber = i + 1;

                try {
                    const registeredAddress = new RegisteredAddress({
                        address: address,
                        processOrder: orderNumber,
                        transferCompleted: false
                    });

                    await registeredAddress.save();
                    storedCount++;

                    logger.info(`✅ Stored registered address ${orderNumber}: ${address}`);

                } catch (error) {
                    logger.error(`❌ Error storing address ${address}: ${error.message}`);
                }
            }

            this.stats.registeredAddressesFetched = storedCount;
            this.stats.totalRegistered = contractAddresses.length;

            if (this.stats.totalRegistered === 0) {
                logger.info('No registered users in contract. Nothing to process.');
                return this.stats;
            }

            logger.info(`✅ Fetched and stored ${this.stats.registeredAddressesFetched} registered addresses`);
            logger.info(`Will generate ${this.stats.totalRegistered} wallets and process them sequentially`);

            // Verify database connection is still active
            const dbStatus = database.getConnectionStatus();
            logger.info(`Database connection status: ${dbStatus.isConnected ? 'Connected' : 'Disconnected'}`);
            
            // Process each wallet sequentially
            for (let i = 1; i <= this.stats.totalRegistered; i++) {
                let pairData = {
                    pairNumber: i,
                    walletId: i,
                    walletAddress: null,
                    registeredAddress: null,
                    registeredOrder: i,
                    walletGenerated: false,
                    platformChangeSuccess: false,
                    platformChangeTxHash: null,
                    transferSuccess: false,
                    transferTxHash: null,
                    errors: []
                };

                try {
                    logger.info(`\n--- Processing Pair ${i}/${this.stats.totalRegistered} ---`);

                    // Step 1: Generate and store wallet
                    const wallet = await this.generateSingleWallet(i);
                    this.stats.walletsGenerated++;
                    pairData.walletAddress = wallet.address;
                    pairData.walletGenerated = true;

                    // Small delay after generation
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Step 2: Platform change for generated wallet
                    const platformResult = await this.performPlatformChange(wallet);
                    pairData.platformChangeSuccess = platformResult.success;
                    pairData.platformChangeTxHash = platformResult.txHash;

                    if (platformResult.success) {
                        // Small delay before transfer
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Step 3: Get registered address by order and perform transfer
                        const registeredAddress = await RegisteredAddress.getByOrder(i);

                        if (registeredAddress) {
                            pairData.registeredAddress = registeredAddress.address;
                            logger.info(`🔗 Pair ${i}: Wallet ${wallet.address} → Transfer to registered address ${registeredAddress.address}`);

                            const transferResult = await this.performSingleTransfer(registeredAddress);
                            pairData.transferSuccess = transferResult.success;
                            pairData.transferTxHash = transferResult.txHash;
                        } else {
                            logger.error(`❌ No registered address found for order ${i}`);
                            this.stats.errors++;
                            pairData.errors.push('No registered address found');
                        }
                    } else {
                        logger.warn(`⚠️ Skipping transfer for pair ${i} due to platform change failure`);
                        pairData.errors.push('Platform change failed');
                    }

                    // Delay between pairs
                    if (i < this.stats.totalRegistered) {
                        logger.info(`Waiting ${delayBetweenWallets}ms before next pair...`);
                        await new Promise(resolve => setTimeout(resolve, delayBetweenWallets));
                    }

                } catch (error) {
                    this.stats.errors++;
                    pairData.errors.push(error.message);
                    logger.error(`❌ Error processing pair ${i}: ${error.message}`);
                    // Continue with next pair
                } finally {
                    // Add pair data to tracking
                    this.processedPairs.push(pairData);
                }
            }
            
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
            
            // Final summary
            logger.info('\n================================================');
            logger.info('🎉 SEQUENTIAL WORKFLOW COMPLETED!');
            logger.info('================================================');
            logger.info(`📊 FINAL STATISTICS:`);
            logger.info(`- Total registered in contract: ${this.stats.totalRegistered}`);
            logger.info(`- Registered addresses fetched: ${this.stats.registeredAddressesFetched}`);
            logger.info(`- Wallets generated: ${this.stats.walletsGenerated}`);
            logger.info(`- Platform changes completed: ${this.stats.platformChanges}`);
            logger.info(`- Transfers completed: ${this.stats.transfers}`);
            logger.info(`- Total errors: ${this.stats.errors}`);
            logger.info(`- Total duration: ${duration} minutes`);
            logger.info('================================================');
            
            // Save final report
            await this.saveFinalReport();
            
            return this.stats;
            
        } catch (error) {
            logger.error(`💥 SEQUENTIAL WORKFLOW FAILED: ${error.message}`);
            throw error;
        }
        // Note: Database connection is kept open for the application
    }

    async saveFinalReport() {
        try {
            await fs.mkdir('data', { recursive: true });

            const report = {
                timestamp: new Date().toISOString(),
                workflowType: 'sequential',
                stats: this.stats,
                summary: {
                    successRate: this.stats.walletsGenerated > 0 ?
                        Math.round((this.stats.transfers / this.stats.walletsGenerated) * 100) : 0,
                    platformChangeRate: this.stats.walletsGenerated > 0 ?
                        Math.round((this.stats.platformChanges / this.stats.walletsGenerated) * 100) : 0
                },
                processedPairs: this.processedPairs,
                pairDetails: this.processedPairs.map(pair => ({
                    pair: pair.pairNumber,
                    generatedWallet: pair.walletAddress,
                    registeredAddress: pair.registeredAddress,
                    platformChangeSuccess: pair.platformChangeSuccess,
                    platformChangeTx: pair.platformChangeTxHash,
                    transferSuccess: pair.transferSuccess,
                    transferTx: pair.transferTxHash,
                    errors: pair.errors
                }))
            };

            const filename = `data/sequential-workflow-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await fs.writeFile(filename, JSON.stringify(report, null, 2));

            logger.info(`📄 Final report saved to: ${filename}`);

            // Also create a simple CSV for easy viewing
            await this.createCSVReport();

        } catch (error) {
            logger.error(`Error saving report: ${error.message}`);
        }
    }

    async createCSVReport() {
        try {
            const csvHeaders = 'Pair,Generated Wallet,Registered Address,Platform Change,Platform TX,Transfer Success,Transfer TX,Errors\n';

            const csvRows = this.processedPairs.map(pair => {
                return [
                    pair.pairNumber,
                    pair.walletAddress || 'N/A',
                    pair.registeredAddress || 'N/A',
                    pair.platformChangeSuccess ? 'Success' : 'Failed',
                    pair.platformChangeTxHash || 'N/A',
                    pair.transferSuccess ? 'Success' : 'Failed',
                    pair.transferTxHash || 'N/A',
                    pair.errors.length > 0 ? pair.errors.join('; ') : 'None'
                ].join(',');
            }).join('\n');

            const csvContent = csvHeaders + csvRows;
            const csvFilename = `data/sequential-workflow-pairs-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

            await fs.writeFile(csvFilename, csvContent);
            logger.info(`📊 CSV report saved to: ${csvFilename}`);

        } catch (error) {
            logger.error(`Error creating CSV report: ${error.message}`);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const delayBetweenWallets = process.argv[2] ? parseInt(process.argv[2]) : 3000;

    const workflow = new SequentialWorkflow();

    workflow.runSequentialWorkflow(delayBetweenWallets)
        .then(async (stats) => {
            logger.info('Sequential workflow completed successfully');
            // Only disconnect when run as standalone script
            await database.disconnect();
            process.exit(0);
        })
        .catch(async (error) => {
            logger.error(`Sequential workflow failed: ${error.message}`);
            // Only disconnect when run as standalone script
            await database.disconnect();
            process.exit(1);
        });
}

module.exports = SequentialWorkflow;
