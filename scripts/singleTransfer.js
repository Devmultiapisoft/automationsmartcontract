const database = require('../utils/database');
const contractInteraction = require('../utils/contractInteraction');
const Wallet = require('../models/Wallet');
const winston = require('winston');

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
        new winston.transports.File({ filename: 'logs/single-transfer.log' })
    ]
});

async function executeSingleTransfers(batchSize = 20, delayMs = 5000) {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize contract interaction
        await contractInteraction.initialize();

        logger.info('Starting single transfer process...');

        // Get registered wallets that haven't completed transfer
        const walletsToProcess = await Wallet.getWalletsForTransfer();
        logger.info(`Found ${walletsToProcess.length} wallets for transfer`);

        if (walletsToProcess.length === 0) {
            logger.info('No wallets need transfer');
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        let totalGasUsed = BigInt(0);

        // Process in batches
        for (let i = 0; i < walletsToProcess.length; i += batchSize) {
            const batch = walletsToProcess.slice(i, i + batchSize);
            
            logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(walletsToProcess.length / batchSize)} (${batch.length} wallets)`);

            // Process each wallet in the batch
            for (const wallet of batch) {
                try {
                    logger.info(`Executing single transfer for: ${wallet.address}`);

                    const result = await contractInteraction.singleTransfer(wallet.address);

                    if (result.success) {
                        await wallet.markTransferCompleted(result.txHash, '0'); // Amount will be determined from transaction
                        successCount++;
                        totalGasUsed += BigInt(result.gasUsed || 0);
                        logger.info(`Transfer completed for ${wallet.address}. TX: ${result.txHash}, Gas: ${result.gasUsed}`);
                    } else {
                        await wallet.recordError(result.error);
                        errorCount++;
                        logger.error(`Failed to transfer for ${wallet.address}: ${result.error}`);
                    }

                } catch (error) {
                    await wallet.recordError(error.message);
                    errorCount++;
                    logger.error(`Error processing transfer for ${wallet.address}: ${error.message}`);
                }

                // Small delay between individual transactions
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Delay between batches to avoid rate limiting
            if (i + batchSize < walletsToProcess.length) {
                logger.info(`Waiting ${delayMs}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        // Final summary
        logger.info('Single transfer process completed!');
        logger.info(`Successfully transferred: ${successCount}`);
        logger.info(`Errors: ${errorCount}`);
        logger.info(`Total processed: ${successCount + errorCount}`);
        logger.info(`Total gas used: ${totalGasUsed.toString()}`);

        // Get updated stats
        const stats = await Wallet.getStats();
        if (stats.length > 0) {
            const stat = stats[0];
            logger.info(`Current database stats:`);
            logger.info(`- Total wallets: ${stat.total}`);
            logger.info(`- Registered: ${stat.registered}`);
            logger.info(`- Platform changed: ${stat.platformChanged}`);
            logger.info(`- Transfer completed: ${stat.transferCompleted}`);
            logger.info(`- With errors: ${stat.withErrors}`);
        }

        // Get total extractable tokens from contract
        const extractableResult = await contractInteraction.getTotalExtractableTokens();
        if (extractableResult.success) {
            logger.info(`Total extractable tokens remaining: ${extractableResult.total}`);
        }

    } catch (error) {
        logger.error(`Single transfer process failed: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

async function executeSingleTransferForAddress(userAddress) {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize contract interaction
        await contractInteraction.initialize();

        logger.info(`Executing single transfer for specific address: ${userAddress}`);

        // Find wallet in database
        const wallet = await Wallet.findOne({ address: userAddress.toLowerCase() });
        if (!wallet) {
            throw new Error(`Wallet not found in database: ${userAddress}`);
        }

        if (!wallet.isRegistered) {
            throw new Error(`Wallet is not registered: ${userAddress}`);
        }

        if (wallet.transferCompleted) {
            logger.info(`Transfer already completed for: ${userAddress}`);
            return { success: true, alreadyCompleted: true };
        }

        const result = await contractInteraction.singleTransfer(userAddress);

        if (result.success) {
            await wallet.markTransferCompleted(result.txHash, '0');
            logger.info(`Transfer completed for ${userAddress}. TX: ${result.txHash}`);
        } else {
            await wallet.recordError(result.error);
            logger.error(`Failed to transfer for ${userAddress}: ${result.error}`);
        }

        return result;

    } catch (error) {
        logger.error(`Single transfer failed for ${userAddress}: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    const mode = process.argv[2] || 'all'; // 'all' or 'address'
    
    if (mode === 'address') {
        const userAddress = process.argv[3];
        if (!userAddress) {
            logger.error('Please provide the user address');
            process.exit(1);
        }
        
        executeSingleTransferForAddress(userAddress)
            .then(() => {
                logger.info('Single transfer completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error(`Single transfer failed: ${error.message}`);
                process.exit(1);
            });
    } else {
        const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 20;
        const delayMs = process.argv[4] ? parseInt(process.argv[4]) : 5000;
        
        executeSingleTransfers(batchSize, delayMs)
            .then(() => {
                logger.info('Single transfer process completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error(`Single transfer process failed: ${error.message}`);
                process.exit(1);
            });
    }
}

module.exports = { executeSingleTransfers, executeSingleTransferForAddress };
