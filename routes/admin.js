const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const ContractSettings = require('../models/ContractSettings');
const abiFetcher = require('../utils/abiFetcher');
const contractInteraction = require('../utils/contractInteraction');
const { generateToken, authenticate, requireSuperAdmin, checkLoginRateLimit } = require('../middleware/auth');

// Login
router.post('/login', checkLoginRateLimit, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        if (admin.isLocked()) {
            return res.status(401).json({
                success: false,
                error: 'Account is temporarily locked due to failed login attempts'
            });
        }

        const isValidPassword = await admin.comparePassword(password);

        if (!isValidPassword) {
            await admin.incrementLoginAttempts();
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        await admin.updateLastLogin();
        const token = generateToken(admin._id);

        res.json({
            success: true,
            data: {
                token,
                admin: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    role: admin.role,
                    lastLogin: admin.lastLogin
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

// Get current admin profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                id: req.admin._id,
                username: req.admin.username,
                email: req.admin.email,
                role: req.admin.role,
                lastLogin: req.admin.lastLogin,
                createdAt: req.admin.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get contract settings
router.get('/contract-settings', authenticate, async (req, res) => {
    try {
        const settings = await ContractSettings.getCurrentSettings();
        
        if (!settings) {
            return res.json({
                success: true,
                data: null,
                message: 'No contract settings found. Please configure the contract first.'
            });
        }

        res.json({
            success: true,
            data: settings.toSafeObject()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update contract settings
router.post('/contract-settings', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const {
            contractAddress,
            rpcUrl,
            chainId,
            networkName,
            ownerPrivateKey,
            platformWalletAddress,
            gasLimit,
            gasPrice,
            batchSize,
            delayBetweenBatches
        } = req.body;

        // Validate required fields
        if (!contractAddress || !rpcUrl || !chainId || !ownerPrivateKey || !platformWalletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: contractAddress, rpcUrl, chainId, ownerPrivateKey, platformWalletAddress'
            });
        }

        // Fetch ABI automatically based on network
        const abiResult = await abiFetcher.fetchABI(contractAddress, chainId);
        let contractABI;
        let abiMessage = '';

        if (abiResult.success) {
            contractABI = abiResult.abi;
            abiMessage = `ABI fetched successfully from ${abiResult.source}`;
        } else {
            // Use fallback ABI if fetch fails
            contractABI = abiResult.fallbackABI;
            abiMessage = `Could not fetch ABI from ${chainId === 97 ? 'BSC Testnet' : 'BSC Mainnet'}: ${abiResult.error}. Using fallback ABI.`;
        }

        // Validate ABI
        const abiValidation = abiFetcher.validateABI(contractABI);
        if (!abiValidation.valid) {
            return res.status(400).json({
                success: false,
                error: `ABI validation failed: ${abiValidation.error}`,
                details: abiValidation
            });
        }

        const newSettings = {
            contractAddress: contractAddress.toLowerCase(),
            rpcUrl,
            chainId: parseInt(chainId),
            networkName: networkName || (chainId === 97 ? 'BSC Testnet' : 'BSC Mainnet'),
            ownerPrivateKey,
            platformWalletAddress: platformWalletAddress.toLowerCase(),
            contractABI,
            gasLimit: gasLimit || 300000,
            gasPrice: gasPrice || '20000000000',
            batchSize: batchSize || 20,
            delayBetweenBatches: delayBetweenBatches || 5000
        };

        const settings = await ContractSettings.updateSettings(newSettings, req.admin._id);

        // Reinitialize contract interaction with new settings
        try {
            await contractInteraction.reinitialize();
        } catch (error) {
            console.error('Warning: Failed to reinitialize contract interaction:', error.message);
        }

        res.json({
            success: true,
            data: settings.toSafeObject(),
            message: `Contract settings updated successfully. ${abiMessage} Contract reinitialized.`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fetch ABI for contract address
router.post('/fetch-abi', authenticate, async (req, res) => {
    try {
        const { contractAddress, chainId } = req.body;

        if (!contractAddress) {
            return res.status(400).json({
                success: false,
                error: 'Contract address is required'
            });
        }

        const result = await abiFetcher.fetchABI(contractAddress, chainId || 97);
        
        if (result.success) {
            const validation = abiFetcher.validateABI(result.abi);
            
            res.json({
                success: true,
                data: {
                    abi: result.abi,
                    source: result.source,
                    validation
                }
            });
        } else {
            res.json({
                success: false,
                error: result.error,
                fallbackABI: result.fallbackABI
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get contract info
router.post('/contract-info', authenticate, async (req, res) => {
    try {
        const { contractAddress, chainId } = req.body;

        if (!contractAddress) {
            return res.status(400).json({
                success: false,
                error: 'Contract address is required'
            });
        }

        const result = await abiFetcher.getContractInfo(contractAddress, chainId || 97);
        
        res.json({
            success: result.success,
            data: result.success ? result : null,
            error: result.success ? null : result.error
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Reinitialize contract with current settings
router.post('/reinitialize-contract', authenticate, async (req, res) => {
    try {
        await contractInteraction.reinitialize();

        res.json({
            success: true,
            message: 'Contract reinitialized successfully with current settings'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: `Failed to reinitialize contract: ${error.message}`
        });
    }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        const admin = await Admin.findById(req.admin._id);
        const isValidPassword = await admin.comparePassword(currentPassword);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
