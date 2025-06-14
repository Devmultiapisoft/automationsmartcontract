const database = require('../utils/database');
const contractInteraction = require('../utils/contractInteraction');
const Wallet = require('../models/Wallet');
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
        new winston.transports.File({ filename: 'logs/get-registered.log' })
    ]
});

async function getRegisteredAddresses(saveToFile = true) {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize contract interaction
        await contractInteraction.initialize();

        logger.info('Fetching registered addresses from smart contract...');

        // Get registered addresses from contract
        const contractResult = await contractInteraction.getAllRegistered();
        
        if (!contractResult.success) {
            throw new Error(`Failed to get registered addresses: ${contractResult.error}`);
        }

        const contractAddresses = contractResult.addresses;
        const totalFromContract = contractResult.total;

        logger.info(`Found ${contractAddresses.length} registered addresses in contract`);
        logger.info(`Contract reports total: ${totalFromContract}`);

        // Get registered addresses from database
        const dbWallets = await Wallet.getRegisteredWallets();
        const dbAddresses = dbWallets.map(w => w.address.toLowerCase());

        logger.info(`Found ${dbAddresses.length} registered addresses in database`);

        // Compare contract vs database
        const contractAddressesLower = contractAddresses.map(addr => addr.toLowerCase());
        
        const onlyInContract = contractAddressesLower.filter(addr => !dbAddresses.includes(addr));
        const onlyInDatabase = dbAddresses.filter(addr => !contractAddressesLower.includes(addr));
        const inBoth = contractAddressesLower.filter(addr => dbAddresses.includes(addr));

        logger.info(`Comparison results:`);
        logger.info(`- In both contract and database: ${inBoth.length}`);
        logger.info(`- Only in contract: ${onlyInContract.length}`);
        logger.info(`- Only in database: ${onlyInDatabase.length}`);

        // Create detailed report
        const report = {
            timestamp: new Date().toISOString(),
            contract: {
                total: totalFromContract,
                addresses: contractAddresses
            },
            database: {
                total: dbAddresses.length,
                addresses: dbAddresses
            },
            comparison: {
                inBoth: inBoth.length,
                onlyInContract: onlyInContract.length,
                onlyInDatabase: onlyInDatabase.length,
                addressesOnlyInContract: onlyInContract,
                addressesOnlyInDatabase: onlyInDatabase
            }
        };

        // Save to file if requested
        if (saveToFile) {
            await fs.mkdir('data', { recursive: true });
            
            const filename = `data/registered-addresses-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await fs.writeFile(filename, JSON.stringify(report, null, 2));
            logger.info(`Report saved to: ${filename}`);
        }

        // Update database with any missing registrations
        if (onlyInContract.length > 0) {
            logger.info(`Updating database with ${onlyInContract.length} missing registrations...`);
            
            for (const address of onlyInContract) {
                try {
                    await Wallet.findOneAndUpdate(
                        { address: address },
                        { 
                            isRegistered: true,
                            registrationTimestamp: new Date(),
                            registrationTxHash: 'unknown' // We don't have the tx hash
                        }
                    );
                } catch (error) {
                    logger.warn(`Could not update wallet ${address}: ${error.message}`);
                }
            }
            
            logger.info('Database updated with missing registrations');
        }

        // Log discrepancies
        if (onlyInDatabase.length > 0) {
            logger.warn(`Found ${onlyInDatabase.length} addresses marked as registered in database but not in contract:`);
            onlyInDatabase.forEach(addr => logger.warn(`- ${addr}`));
        }

        return report;

    } catch (error) {
        logger.error(`Failed to get registered addresses: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

async function syncDatabaseWithContract() {
    try {
        logger.info('Syncing database with contract state...');
        
        const report = await getRegisteredAddresses(false);
        
        // Connect to database
        await database.connect();
        
        // Mark addresses as unregistered if they're not in the contract
        if (report.comparison.addressesOnlyInDatabase.length > 0) {
            logger.info(`Marking ${report.comparison.addressesOnlyInDatabase.length} addresses as unregistered...`);
            
            await Wallet.updateMany(
                { address: { $in: report.comparison.addressesOnlyInDatabase } },
                { 
                    isRegistered: false,
                    registrationTxHash: null,
                    registrationTimestamp: null
                }
            );
            
            logger.info('Database synchronized with contract state');
        }

        // Get updated stats
        const stats = await Wallet.getStats();
        if (stats.length > 0) {
            const stat = stats[0];
            logger.info(`Updated database stats:`);
            logger.info(`- Total wallets: ${stat.total}`);
            logger.info(`- Registered: ${stat.registered}`);
            logger.info(`- Platform changed: ${stat.platformChanged}`);
            logger.info(`- Transfer completed: ${stat.transferCompleted}`);
        }

        return report;

    } catch (error) {
        logger.error(`Sync failed: ${error.message}`);
        throw error;
    } finally {
        await database.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    const mode = process.argv[2] || 'get'; // 'get' or 'sync'
    
    if (mode === 'sync') {
        syncDatabaseWithContract()
            .then(() => {
                logger.info('Database sync completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error(`Database sync failed: ${error.message}`);
                process.exit(1);
            });
    } else {
        getRegisteredAddresses(true)
            .then(() => {
                logger.info('Get registered addresses completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error(`Get registered addresses failed: ${error.message}`);
                process.exit(1);
            });
    }
}

module.exports = { getRegisteredAddresses, syncDatabaseWithContract };
