const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (adminId) => {
    return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.cookies?.authToken;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }
        
        const decoded = verifyToken(token);
        const admin = await Admin.findById(decoded.adminId).select('-password');
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token. Admin not found.'
            });
        }
        
        if (!admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated.'
            });
        }
        
        if (admin.isLocked()) {
            return res.status(401).json({
                success: false,
                error: 'Account is temporarily locked due to failed login attempts.'
            });
        }
        
        req.admin = admin;
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Authentication error.'
        });
    }
};

// Super admin middleware
const requireSuperAdmin = (req, res, next) => {
    if (req.admin.role !== 'super-admin') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Super admin privileges required.'
        });
    }
    next();
};

// Rate limiting for login attempts
const loginRateLimit = {};

const checkLoginRateLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;
    
    if (!loginRateLimit[ip]) {
        loginRateLimit[ip] = { attempts: 0, resetTime: now + windowMs };
    }
    
    const record = loginRateLimit[ip];
    
    if (now > record.resetTime) {
        record.attempts = 0;
        record.resetTime = now + windowMs;
    }
    
    if (record.attempts >= maxAttempts) {
        return res.status(429).json({
            success: false,
            error: 'Too many login attempts. Please try again later.'
        });
    }
    
    record.attempts++;
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    requireSuperAdmin,
    checkLoginRateLimit
};
