const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const database = require('./utils/database');
const contractInteraction = require('./utils/contractInteraction');
const Wallet = require('./models/Wallet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'build')));

// API Routes

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await database.healthCheck();
        const contractStatus = await contractInteraction.getOwner();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealth,
            contract: contractStatus.success ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get wallet statistics
app.get('/api/wallets/stats', async (req, res) => {
    try {
        const stats = await Wallet.getStats();
        res.json({
            success: true,
            data: stats[0] || {
                total: 0,
                registered: 0,
                platformChanged: 0,
                transferCompleted: 0,
                withErrors: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get wallets with pagination
app.get('/api/wallets', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        const filter = {};
        if (req.query.registered !== undefined) {
            filter.isRegistered = req.query.registered === 'true';
        }
        if (req.query.platformChanged !== undefined) {
            filter.platformWalletChanged = req.query.platformChanged === 'true';
        }
        if (req.query.transferCompleted !== undefined) {
            filter.transferCompleted = req.query.transferCompleted === 'true';
        }

        const wallets = await Wallet.find(filter)
            .select('-privateKey') // Don't send private keys to frontend
            .sort({ walletId: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Wallet.countDocuments(filter);

        res.json({
            success: true,
            data: {
                wallets,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Import wallets from JSON file
app.post('/api/wallets/import', async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'File path is required'
            });
        }

        // Read wallets from file
        const walletsData = await fs.readFile(filePath, 'utf8');
        const wallets = JSON.parse(walletsData);

        // Import to database
        const importedWallets = [];
        for (const walletData of wallets) {
            const wallet = new Wallet({
                walletId: walletData.id,
                address: walletData.address.toLowerCase(),
                privateKey: walletData.privateKey,
                mnemonic: walletData.mnemonic,
                isRegistered: walletData.isRegistered || false,
                registrationTxHash: walletData.registrationTxHash,
                platformWalletChanged: walletData.platformWalletChanged || false,
                platformWalletTxHash: walletData.platformWalletTxHash,
                transferCompleted: walletData.transferCompleted || false,
                transferTxHash: walletData.transferTxHash
            });

            try {
                await wallet.save();
                importedWallets.push(wallet);
            } catch (error) {
                if (error.code === 11000) {
                    // Duplicate key error, skip
                    continue;
                }
                throw error;
            }
        }

        res.json({
            success: true,
            message: `Imported ${importedWallets.length} wallets`,
            data: {
                imported: importedWallets.length,
                total: wallets.length
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get contract information
app.get('/api/contract/info', async (req, res) => {
    try {
        const owner = await contractInteraction.getOwner();
        const platformWallet = await contractInteraction.getPlatformWallet();
        const registeredAddresses = await contractInteraction.getAllRegistered();
        const totalExtractable = await contractInteraction.getTotalExtractableTokens();

        res.json({
            success: true,
            data: {
                owner: owner.success ? owner.owner : null,
                platformWallet: platformWallet.success ? platformWallet.platformWallet : null,
                totalRegistered: registeredAddresses.success ? registeredAddresses.total : '0',
                registeredAddresses: registeredAddresses.success ? registeredAddresses.addresses : [],
                totalExtractableTokens: totalExtractable.success ? totalExtractable.total : '0'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Operations API endpoints
const AutomationWorkflow = require('./scripts/automationWorkflow');
const SequentialWorkflow = require('./scripts/sequentialWorkflow');
const { fetchAndStoreRegisteredAddresses } = require('./scripts/fetchRegisteredAddresses');
const RegisteredAddress = require('./models/RegisteredAddress');

// Sequential workflow
app.post('/api/operations/sequential', async (req, res) => {
    try {
        const workflow = new SequentialWorkflow();
        const delay = req.body.delay || 3000;

        const stats = await workflow.runSequentialWorkflow(delay);

        res.json({
            success: true,
            data: {
                ...stats,
                message: `Sequential workflow completed: ${stats.transfers} transfers out of ${stats.walletsGenerated} wallets`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate wallets
app.post('/api/operations/generate', async (req, res) => {
    try {
        const workflow = new AutomationWorkflow();
        const count = req.body.count || 5000;

        await workflow.step1_GenerateAndStoreWallets(count);

        res.json({
            success: true,
            data: {
                generated: workflow.stats.generated,
                message: `Successfully generated ${workflow.stats.generated} wallets`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Change platform wallet
app.post('/api/operations/platform', async (req, res) => {
    try {
        const workflow = new AutomationWorkflow();
        const batchSize = req.body.batchSize || 20;
        const delay = req.body.delay || 3000;

        await workflow.step2_ChangePlatformWalletForEach(batchSize, delay);

        res.json({
            success: true,
            data: {
                platformChanged: workflow.stats.platformChanged,
                errors: workflow.stats.errors,
                message: `Successfully changed platform wallet for ${workflow.stats.platformChanged} addresses`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Execute transfers
app.post('/api/operations/transfer', async (req, res) => {
    try {
        const workflow = new AutomationWorkflow();
        const batchSize = req.body.batchSize || 10;
        const delay = req.body.delay || 5000;

        // Execute transfers for all platform-changed wallets
        await workflow.step4_SingleTransferForAll(batchSize, delay);

        res.json({
            success: true,
            data: {
                transferred: workflow.stats.transferred,
                errors: workflow.stats.errors,
                message: `Successfully completed transfers for ${workflow.stats.transferred} addresses`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fetch registered addresses
app.post('/api/operations/fetch-registered', async (req, res) => {
    try {
        const result = await fetchAndStoreRegisteredAddresses();

        res.json({
            success: true,
            data: {
                total: result.total,
                stored: result.stored,
                stats: result.stats,
                message: `Fetched and stored ${result.stored} registered addresses`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get registered addresses stats
app.get('/api/registered/stats', async (req, res) => {
    try {
        const stats = await RegisteredAddress.getStats();
        res.json({
            success: true,
            data: stats[0] || {
                total: 0,
                transferCompleted: 0,
                withErrors: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await database.connect();
        await database.createIndexes();

        // Initialize contract interaction
        await contractInteraction.initialize();

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await database.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await database.disconnect();
    process.exit(0);
});

startServer();
