const mongoose = require('mongoose');
const winston = require('winston');
const config = require('../src/config/config');

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
        new winston.transports.File({ filename: 'logs/database.log' })
    ]
});

class Database {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.isConnected) {
                logger.info('Database already connected');
                return this.connection;
            }

            logger.info('Connecting to MongoDB...');
            
            const options = {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false
            };

            this.connection = await mongoose.connect(config.mongoUri, options);
            this.isConnected = true;

            logger.info(`Connected to MongoDB: ${config.mongoUri}`);

            // Handle connection events
            mongoose.connection.on('error', (error) => {
                logger.error(`MongoDB connection error: ${error.message}`);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                logger.info('MongoDB reconnected');
                this.isConnected = true;
            });

            return this.connection;

        } catch (error) {
            logger.error(`Failed to connect to MongoDB: ${error.message}`);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (!this.isConnected) {
                logger.info('Database not connected');
                return;
            }

            await mongoose.connection.close();
            this.isConnected = false;
            logger.info('Disconnected from MongoDB');

        } catch (error) {
            logger.error(`Error disconnecting from MongoDB: ${error.message}`);
            throw error;
        }
    }

    async ensureConnection() {
        if (!this.isConnected) {
            await this.connect();
        }
        return this.connection;
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }

    async healthCheck() {
        try {
            await this.ensureConnection();
            
            // Simple ping to check if database is responsive
            const admin = mongoose.connection.db.admin();
            const result = await admin.ping();
            
            return {
                status: 'healthy',
                connected: this.isConnected,
                ping: result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async createIndexes() {
        try {
            await this.ensureConnection();
            
            const Wallet = require('../models/Wallet');
            
            // Ensure indexes are created
            await Wallet.createIndexes();
            
            logger.info('Database indexes created successfully');
            
        } catch (error) {
            logger.error(`Error creating indexes: ${error.message}`);
            throw error;
        }
    }

    async clearCollection(collectionName) {
        try {
            await this.ensureConnection();
            
            const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
            logger.info(`Cleared collection ${collectionName}: ${result.deletedCount} documents deleted`);
            
            return result;

        } catch (error) {
            logger.error(`Error clearing collection ${collectionName}: ${error.message}`);
            throw error;
        }
    }

    async getCollectionStats(collectionName) {
        try {
            await this.ensureConnection();
            
            const stats = await mongoose.connection.db.collection(collectionName).stats();
            return stats;

        } catch (error) {
            logger.error(`Error getting stats for collection ${collectionName}: ${error.message}`);
            throw error;
        }
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;
