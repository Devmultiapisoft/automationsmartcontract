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
        new winston.transports.File({ filename: 'logs/wallet-registration.log' })
    ]
});

async function registerWallets(batchSize = 10, delayMs = 2000) {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize contract interaction
        await contractInteraction.initialize();

        logger.info('Starting wallet registration process...');

        // Get unregistered wallets
        const unregisteredWallets = await Wallet.getUnregisteredWallets();
        logger.info(`Found ${unregisteredWallets.length} unregistered wallets`);

        if (unregisteredWallets.length === 0) {
            logger.info('No wallets to register');
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        let alreadyRegisteredCount = 0;

        // Process in batches
        for (let i = 0; i < unregisteredWallets.length; i += batchSize) {
            const batch = unregisteredWallets.slice(i, i + batchSize);
            
            logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(unregisteredWallets.length / batchSize)} (${batch.length} wallets)`);

            // Process batch concurrently
            const promises = batch.map(async (wallet) => {
                try {
                    const result = await contractInteraction.whitlistAddress(
                        wallet.address,
                        wallet.privateKey
                    );

                    if (result.success) {
                        if (result.alreadyRegistered) {
                            await wallet.markRegistered(null);
                            alreadyRegisteredCount++;
                            logger.info(`Wallet ${wallet.address} was already registered`);
                        } else {
                            await wallet.markRegistered(result.txHash);
                            successCount++;
                            logger.info(`Wallet ${wallet.address} registered successfully. TX: ${result.txHash}`);
                        }
                    } else {
                        await wallet.recordError(result.error);
                        errorCount++;
                        logger.error(`Failed to register wallet ${wallet.address}: ${result.error}`);
                    }

                } catch (error) {
                    await wallet.recordError(error.message);
                    errorCount++;
                    logger.error(`Error processing wallet ${wallet.address}: ${error.message}`);
                }
            });

            // Wait for batch to complete
            await Promise.all(promises);

            // Delay between batches to avoid rate limiting
            if (i + batchSize < unregisteredWallets.length) {
                logger.info(`Waiting ${delayMs}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        // Final summary
        logger.info('Wallet registration completed!');
        logger.info(`Successfully registered: ${successCount}`);
        logger.info(`Already registered: ${alreadyRegisteredCount}`);
        logger.info(`Errors: ${errorCount}`);
        logger.info(`Total processed: ${successCount + alreadyRegisteredCount + errorCount}`);

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
        logger.error(`Registration process failed: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    const batchSize = process.argv[2] ? parseInt(process.argv[2]) : 10;
    const delayMs = process.argv[3] ? parseInt(process.argv[3]) : 2000;
    
    registerWallets(batchSize, delayMs)
        .then(() => {
            logger.info('Registration process completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error(`Registration process failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { registerWallets };
