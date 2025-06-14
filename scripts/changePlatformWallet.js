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
        new winston.transports.File({ filename: 'logs/platform-wallet-change.log' })
    ]
});

async function changePlatformWalletForAll(batchSize = 50, delayMs = 3000) {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize contract interaction
        await contractInteraction.initialize();

        logger.info('Starting platform wallet change process...');

        // Get registered wallets that haven't had platform wallet changed
        const walletsToProcess = await Wallet.getWalletsForPlatformChange();
        logger.info(`Found ${walletsToProcess.length} wallets for platform wallet change`);

        if (walletsToProcess.length === 0) {
            logger.info('No wallets need platform wallet change');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Process in batches
        for (let i = 0; i < walletsToProcess.length; i += batchSize) {
            const batch = walletsToProcess.slice(i, i + batchSize);
            
            logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(walletsToProcess.length / batchSize)} (${batch.length} wallets)`);

            // Process each wallet in the batch
            for (const wallet of batch) {
                try {
                    logger.info(`Changing platform wallet for: ${wallet.address}`);

                    // Use the wallet address as the new platform wallet
                    const result = await contractInteraction.changePlatformWallet(wallet.address);

                    if (result.success) {
                        await wallet.markPlatformWalletChanged(result.txHash);
                        successCount++;
                        logger.info(`Platform wallet changed to ${wallet.address}. TX: ${result.txHash}`);
                    } else {
                        await wallet.recordError(result.error);
                        errorCount++;
                        logger.error(`Failed to change platform wallet for ${wallet.address}: ${result.error}`);
                    }

                } catch (error) {
                    await wallet.recordError(error.message);
                    errorCount++;
                    logger.error(`Error processing wallet ${wallet.address}: ${error.message}`);
                }

                // Small delay between individual transactions
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Delay between batches to avoid rate limiting
            if (i + batchSize < walletsToProcess.length) {
                logger.info(`Waiting ${delayMs}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        // Final summary
        logger.info('Platform wallet change process completed!');
        logger.info(`Successfully changed: ${successCount}`);
        logger.info(`Errors: ${errorCount}`);
        logger.info(`Total processed: ${successCount + errorCount}`);

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

    } catch (error) {
        logger.error(`Platform wallet change process failed: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

async function changePlatformWalletToSpecific(newPlatformWallet) {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize contract interaction
        await contractInteraction.initialize();

        logger.info(`Changing platform wallet to: ${newPlatformWallet}`);

        const result = await contractInteraction.changePlatformWallet(newPlatformWallet);

        if (result.success) {
            logger.info(`Platform wallet changed successfully. TX: ${result.txHash}`);
            
            // Update all wallets to mark platform wallet as changed
            await Wallet.updateMany(
                { isRegistered: true, platformWalletChanged: false },
                { 
                    platformWalletChanged: true, 
                    platformWalletTxHash: result.txHash,
                    platformWalletTimestamp: new Date()
                }
            );
            
            logger.info('Updated all registered wallets with platform wallet change status');
        } else {
            logger.error(`Failed to change platform wallet: ${result.error}`);
        }

        return result;

    } catch (error) {
        logger.error(`Platform wallet change failed: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    const mode = process.argv[2] || 'all'; // 'all' or 'specific'
    
    if (mode === 'specific') {
        const newPlatformWallet = process.argv[3];
        if (!newPlatformWallet) {
            logger.error('Please provide the new platform wallet address');
            process.exit(1);
        }
        
        changePlatformWalletToSpecific(newPlatformWallet)
            .then(() => {
                logger.info('Platform wallet change completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error(`Platform wallet change failed: ${error.message}`);
                process.exit(1);
            });
    } else {
        const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 50;
        const delayMs = process.argv[4] ? parseInt(process.argv[4]) : 3000;
        
        changePlatformWalletForAll(batchSize, delayMs)
            .then(() => {
                logger.info('Platform wallet change process completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error(`Platform wallet change process failed: ${error.message}`);
                process.exit(1);
            });
    }
}

module.exports = { changePlatformWalletForAll, changePlatformWalletToSpecific };
