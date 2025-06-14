const axios = require('axios');
const fs = require('fs').promises;

class ServerMonitor {
    constructor(serverUrl = 'http://localhost:3000') {
        this.serverUrl = serverUrl;
        this.logFile = 'logs/monitor.log';
    }

    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} [MONITOR]: ${message}\n`;
        
        console.log(logMessage.trim());
        
        try {
            await fs.appendFile(this.logFile, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async checkHealth() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/health`, {
                timeout: 10000
            });
            
            if (response.status === 200 && response.data.status === 'healthy') {
                await this.log('✅ Server is healthy');
                return true;
            } else {
                await this.log(`⚠️ Server health check failed: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error) {
            await this.log(`❌ Server health check error: ${error.message}`);
            return false;
        }
    }

    async checkDatabase() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/wallets/stats`, {
                timeout: 10000
            });
            
            if (response.status === 200 && response.data.success) {
                await this.log(`📊 Database stats: ${JSON.stringify(response.data.data)}`);
                return true;
            } else {
                await this.log(`⚠️ Database check failed: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error) {
            await this.log(`❌ Database check error: ${error.message}`);
            return false;
        }
    }

    async getSystemStats() {
        try {
            const response = await axios.get(`${this.serverUrl}/api/wallets/stats`);
            const registeredResponse = await axios.get(`${this.serverUrl}/api/registered/stats`);
            
            const stats = {
                wallets: response.data.success ? response.data.data : null,
                registered: registeredResponse.data.success ? registeredResponse.data.data : null,
                timestamp: new Date().toISOString()
            };
            
            await this.log(`📈 System stats: ${JSON.stringify(stats)}`);
            return stats;
            
        } catch (error) {
            await this.log(`❌ Failed to get system stats: ${error.message}`);
            return null;
        }
    }

    async runMonitoring(intervalMinutes = 5) {
        await this.log(`🔍 Starting server monitoring (interval: ${intervalMinutes} minutes)`);
        
        const runCheck = async () => {
            await this.log('--- Running health checks ---');
            
            const healthOk = await this.checkHealth();
            const dbOk = await this.checkDatabase();
            await this.getSystemStats();
            
            if (!healthOk || !dbOk) {
                await this.log('🚨 ALERT: Server or database issues detected!');
            }
        };
        
        // Run initial check
        await runCheck();
        
        // Set up interval
        setInterval(runCheck, intervalMinutes * 60 * 1000);
    }
}

// Run if called directly
if (require.main === module) {
    const serverUrl = process.argv[2] || 'http://localhost:3000';
    const intervalMinutes = process.argv[3] ? parseInt(process.argv[3]) : 5;
    
    const monitor = new ServerMonitor(serverUrl);
    monitor.runMonitoring(intervalMinutes)
        .catch(error => {
            console.error('Monitor failed:', error.message);
            process.exit(1);
        });
}

module.exports = ServerMonitor;
