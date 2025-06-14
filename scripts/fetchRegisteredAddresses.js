const database = require('../utils/database');
const contractInteraction = require('../utils/contractInteraction');
const RegisteredAddress = require('../models/RegisteredAddress');
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
        new winston.transports.File({ filename: 'logs/fetch-registered.log' })
    ]
});

async function fetchAndStoreRegisteredAddresses() {
    try {
        logger.info('🔄 Fetching registered addresses from contract...');
        
        // Ensure database connection
        await database.ensureConnection();
        
        // Initialize contract interaction
        await contractInteraction.initialize();
        
        // Get registered addresses from contract
        const result = await contractInteraction.getAllRegistered();
        
        if (!result.success) {
            throw new Error(`Failed to get registered addresses: ${result.error}`);
        }
        
        const contractAddresses = result.addresses;
        logger.info(`Found ${contractAddresses.length} registered addresses in contract`);
        
        if (contractAddresses.length === 0) {
            logger.info('No registered addresses found in contract');
            return { total: 0, stored: 0, updated: 0 };
        }
        
        // Clear existing registered addresses
        await RegisteredAddress.deleteMany({});
        logger.info('Cleared existing registered addresses from database');
        
        let storedCount = 0;
        
        // Store each address with order number
        for (let i = 0; i < contractAddresses.length; i++) {
            const address = contractAddresses[i].toLowerCase();
            const orderNumber = i + 1; // Start from 1
            
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
        
        logger.info(`✅ Successfully stored ${storedCount}/${contractAddresses.length} registered addresses`);
        
        // Get stats
        const stats = await RegisteredAddress.getStats();
        const finalStats = stats[0] || { total: 0, transferCompleted: 0, withErrors: 0 };
        
        logger.info(`📊 Database stats: ${finalStats.total} total, ${finalStats.transferCompleted} completed, ${finalStats.withErrors} with errors`);
        
        return {
            total: contractAddresses.length,
            stored: storedCount,
            stats: finalStats
        };
        
    } catch (error) {
        logger.error(`❌ Failed to fetch and store registered addresses: ${error.message}`);
        throw error;
    }
    // Note: Database connection is kept open for the application
}

// Run if called directly
if (require.main === module) {
    fetchAndStoreRegisteredAddresses()
        .then(async (result) => {
            logger.info(`Fetch completed: ${result.stored} addresses stored`);
            // Only disconnect when run as standalone script
            await database.disconnect();
            process.exit(0);
        })
        .catch(async (error) => {
            logger.error(`Fetch failed: ${error.message}`);
            // Only disconnect when run as standalone script
            await database.disconnect();
            process.exit(1);
        });
}

module.exports = { fetchAndStoreRegisteredAddresses };
