const mongoose = require('mongoose');

const registeredAddressSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },

    // Order for sequential processing (1, 2, 3, etc.)
    processOrder: {
        type: Number,
        required: true,
        index: true
    },

    // Transfer status for this registered address
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
    fetchedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
registeredAddressSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Instance methods
registeredAddressSchema.methods.markTransferCompleted = function(txHash) {
    this.transferCompleted = true;
    this.transferTxHash = txHash;
    this.transferTimestamp = new Date();
    return this.save();
};

registeredAddressSchema.methods.recordError = function(error) {
    this.lastError = error;
    this.errorCount += 1;
    return this.save();
};

// Static methods
registeredAddressSchema.statics.getByOrder = function(orderNumber) {
    return this.findOne({ processOrder: orderNumber });
};

registeredAddressSchema.statics.getNextForTransfer = function() {
    return this.findOne({
        transferCompleted: false
    }).sort({ processOrder: 1 });
};

registeredAddressSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
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

module.exports = mongoose.model('RegisteredAddress', registeredAddressSchema);
