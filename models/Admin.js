const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['admin', 'super-admin'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
adminSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance methods
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
};

adminSchema.methods.incrementLoginAttempts = function() {
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.loginAttempts >= 5) {
        this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    
    return this.save();
};

adminSchema.methods.isLocked = function() {
    return this.lockUntil && this.lockUntil > new Date();
};

// Static methods
adminSchema.statics.createDefaultAdmin = async function() {
    const existingAdmin = await this.findOne({ role: 'super-admin' });
    
    if (!existingAdmin) {
        const defaultAdmin = new this({
            username: 'admin',
            password: 'admin123',
            email: 'admin@automation.local',
            role: 'super-admin'
        });
        
        await defaultAdmin.save();
        console.log('Default admin created: username=admin, password=admin123');
        return defaultAdmin;
    }
    
    return existingAdmin;
};

module.exports = mongoose.model('Admin', adminSchema);
