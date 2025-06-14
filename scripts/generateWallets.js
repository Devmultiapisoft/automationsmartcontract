const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
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
        new winston.transports.File({ filename: 'logs/wallet-generation.log' })
    ]
});

async function generateWallets(count = 5000) {
    try {
        logger.info(`Starting generation of ${count} wallets...`);
        
        const wallets = [];
        const batchSize = 100; // Process in batches to avoid memory issues
        
        // Ensure logs directory exists
        await fs.mkdir('logs', { recursive: true });
        await fs.mkdir('data', { recursive: true });
        
        for (let i = 0; i < count; i += batchSize) {
            const currentBatchSize = Math.min(batchSize, count - i);
            const batch = [];
            
            logger.info(`Generating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(count / batchSize)} (${currentBatchSize} wallets)`);
            
            for (let j = 0; j < currentBatchSize; j++) {
                // Generate random wallet
                const wallet = ethers.Wallet.createRandom();
                
                const walletData = {
                    id: i + j + 1,
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                    mnemonic: wallet.mnemonic?.phrase || null,
                    createdAt: new Date().toISOString(),
                    isRegistered: false,
                    registrationTxHash: null,
                    platformWalletChanged: false,
                    platformWalletTxHash: null,
                    transferCompleted: false,
                    transferTxHash: null
                };
                
                batch.push(walletData);
            }
            
            wallets.push(...batch);
            
            // Save progress every batch
            if (i % (batchSize * 10) === 0 || i + batchSize >= count) {
                await saveWalletsToFile(wallets, `data/wallets_progress_${i + batchSize}.json`);
                logger.info(`Progress saved: ${i + batchSize}/${count} wallets generated`);
            }
        }
        
        // Save final result
        await saveWalletsToFile(wallets, 'data/wallets.json');
        
        // Create summary
        const summary = {
            totalWallets: wallets.length,
            generatedAt: new Date().toISOString(),
            firstAddress: wallets[0]?.address,
            lastAddress: wallets[wallets.length - 1]?.address
        };
        
        await fs.writeFile('data/generation-summary.json', JSON.stringify(summary, null, 2));
        
        logger.info(`Successfully generated ${wallets.length} wallets`);
        logger.info(`Wallets saved to: data/wallets.json`);
        logger.info(`Summary saved to: data/generation-summary.json`);
        
        return wallets;
        
    } catch (error) {
        logger.error(`Error generating wallets: ${error.message}`);
        throw error;
    }
}

async function saveWalletsToFile(wallets, filename) {
    try {
        await fs.writeFile(filename, JSON.stringify(wallets, null, 2));
    } catch (error) {
        logger.error(`Error saving wallets to ${filename}: ${error.message}`);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const count = process.argv[2] ? parseInt(process.argv[2]) : 5000;
    
    generateWallets(count)
        .then(() => {
            logger.info('Wallet generation completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error(`Wallet generation failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { generateWallets };
