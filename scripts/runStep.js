const AutomationWorkflow = require('./automationWorkflow');
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
        new winston.transports.File({ filename: 'logs/run-step.log' })
    ]
});

async function runStep() {
    const step = process.argv[2];
    const workflow = new AutomationWorkflow();
    
    try {
        switch (step) {
            case '1':
            case 'generate':
                const count = process.argv[3] ? parseInt(process.argv[3]) : 5000;
                logger.info(`Running Step 1: Generate ${count} wallets`);
                await workflow.step1_GenerateAndStoreWallets(count);
                break;
                
            case '2':
            case 'platform':
                const batchSize = process.argv[3] ? parseInt(process.argv[3]) : 20;
                const delay = process.argv[4] ? parseInt(process.argv[4]) : 3000;
                logger.info(`Running Step 2: Change platform wallet (batch: ${batchSize}, delay: ${delay}ms)`);
                await workflow.step2_ChangePlatformWalletForEach(batchSize, delay);
                break;
                
            case '3':
            case 'registered':
                logger.info('Running Step 3: Get registered addresses');
                const addresses = await workflow.step3_GetAllRegisteredAddresses();
                logger.info(`Found ${addresses.length} registered addresses`);
                break;
                
            case '4':
            case 'transfer':
                logger.info('Running Step 4: Execute single transfers');
                // First get registered addresses
                const registeredAddresses = await workflow.step3_GetAllRegisteredAddresses();
                const transferBatch = process.argv[3] ? parseInt(process.argv[3]) : 10;
                const transferDelay = process.argv[4] ? parseInt(process.argv[4]) : 5000;
                await workflow.step4_SingleTransferForAll(registeredAddresses, transferBatch, transferDelay);
                break;
                
            case 'all':
            case 'complete':
                const walletCount = process.argv[3] ? parseInt(process.argv[3]) : 5000;
                logger.info(`Running complete workflow with ${walletCount} wallets`);
                await workflow.runCompleteWorkflow(walletCount);
                break;
                
            default:
                logger.error('Invalid step. Available options:');
                logger.info('1 or generate [count] - Generate wallets');
                logger.info('2 or platform [batchSize] [delay] - Change platform wallet');
                logger.info('3 or registered - Get registered addresses');
                logger.info('4 or transfer [batchSize] [delay] - Execute transfers');
                logger.info('all or complete [count] - Run complete workflow');
                process.exit(1);
        }
        
        logger.info('Step completed successfully');
        process.exit(0);
        
    } catch (error) {
        logger.error(`Step failed: ${error.message}`);
        process.exit(1);
    }
}

runStep();
