const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    walletId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    address: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    privateKey: {
        type: String,
        required: true
    },
    mnemonic: {
        type: String,
        default: null
    },
    

    
    // Platform wallet change status
    platformWalletChanged: {
        type: Boolean,
        default: false
    },
    platformWalletTxHash: {
        type: String,
        default: null
    },
    platformWalletTimestamp: {
        type: Date,
        default: null
    },
    
    // Transfer status
    transferCompleted: {
        type: Boolean,
        default: false
    },
    transferTxHash: {
        type: String,
        default: null
    },
    transferTimestamp: {
        type: Date,
        default: null
    },
    transferAmount: {
        type: String,
        default: '0'
    },
    
    // Error tracking
    lastError: {
        type: String,
        default: null
    },
    errorCount: {
        type: Number,
        default: 0
    },
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Additional indexes for better performance
walletSchema.index({ platformWalletChanged: 1 });
walletSchema.index({ transferCompleted: 1 });

// Update the updatedAt field before saving
walletSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Instance methods
walletSchema.methods.markPlatformWalletChanged = function(txHash) {
    this.platformWalletChanged = true;
    this.platformWalletTxHash = txHash;
    this.platformWalletTimestamp = new Date();
    return this.save();
};

walletSchema.methods.markTransferCompleted = function(txHash, amount = '0') {
    this.transferCompleted = true;
    this.transferTxHash = txHash;
    this.transferTimestamp = new Date();
    this.transferAmount = amount;
    return this.save();
};

walletSchema.methods.recordError = function(error) {
    this.lastError = error;
    this.errorCount += 1;
    return this.save();
};

// Static methods
walletSchema.statics.getWalletsForPlatformChange = function() {
    return this.find({
        platformWalletChanged: false
    });
};

walletSchema.statics.getWalletsForTransfer = function() {
    return this.find({
        transferCompleted: false
    });
};

walletSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                platformChanged: {
                    $sum: { $cond: ['$platformWalletChanged', 1, 0] }
                },
                transferCompleted: {
                    $sum: { $cond: ['$transferCompleted', 1, 0] }
                },
                withErrors: {
                    $sum: { $cond: [{ $gt: ['$errorCount', 0] }, 1, 0] }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Wallet', walletSchema);
