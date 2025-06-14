const mongoose = require('mongoose');

const contractSettingsSchema = new mongoose.Schema({
    // Contract Configuration
    contractAddress: {
        type: String,
        required: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid contract address format'
        }
    },
    
    // Network Configuration
    rpcUrl: {
        type: String,
        required: true,
        default: 'https://bsc-testnet.public.blastapi.io'
    },
    chainId: {
        type: Number,
        required: true,
        default: 97 // BSC Testnet
    },
    networkName: {
        type: String,
        required: true,
        default: 'BSC Testnet'
    },
    
    // Owner Configuration
    ownerPrivateKey: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[a-fA-F0-9]{64}$/.test(v);
            },
            message: 'Invalid private key format'
        }
    },
    
    // Platform Wallet
    platformWalletAddress: {
        type: String,
        required: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid platform wallet address format'
        }
    },
    
    // Contract ABI
    contractABI: {
        type: Array,
        required: true,
        default: []
    },
    
    // Gas Configuration
    gasLimit: {
        type: Number,
        default: 300000
    },
    gasPrice: {
        type: String,
        default: '20000000000' // 20 gwei
    },
    
    // Processing Configuration
    batchSize: {
        type: Number,
        default: 20,
        min: 1,
        max: 100
    },
    delayBetweenBatches: {
        type: Number,
        default: 5000, // 5 seconds
        min: 1000,
        max: 60000
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Update lastUpdated before saving
contractSettingsSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Static methods
contractSettingsSchema.statics.getCurrentSettings = async function() {
    return await this.findOne({ isActive: true }).populate('updatedBy', 'username');
};

contractSettingsSchema.statics.updateSettings = async function(newSettings, adminId) {
    // Deactivate current settings
    await this.updateMany({}, { isActive: false });
    
    // Create new settings
    const settings = new this({
        ...newSettings,
        updatedBy: adminId,
        isActive: true
    });
    
    return await settings.save();
};

// Instance methods
contractSettingsSchema.methods.toSafeObject = function() {
    const obj = this.toObject();
    // Hide sensitive data in responses
    obj.ownerPrivateKey = '***HIDDEN***';
    return obj;
};

module.exports = mongoose.model('ContractSettings', contractSettingsSchema);
