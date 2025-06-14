import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Save,
  Refresh,
  CheckCircle,
  Error,
  ExpandMore,
  Info
} from '@mui/icons-material';

function ContractSettings({ settings, onSettingsUpdate }) {
  const [formData, setFormData] = useState({
    contractAddress: '',
    rpcUrl: 'https://bsc-testnet.public.blastapi.io',
    chainId: 97,
    networkName: 'BSC Testnet',
    ownerPrivateKey: '',
    platformWalletAddress: '',
    gasLimit: 300000,
    gasPrice: '20000000000',
    batchSize: 20,
    delayBetweenBatches: 5000
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchingABI, setFetchingABI] = useState(false);
  const [message, setMessage] = useState('');
  const [contractInfo, setContractInfo] = useState(null);
  const [abiInfo, setAbiInfo] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        contractAddress: settings.contractAddress || '',
        rpcUrl: settings.rpcUrl || 'https://bsc-testnet.public.blastapi.io',
        chainId: settings.chainId || 97,
        networkName: settings.networkName || 'BSC Testnet',
        ownerPrivateKey: settings.ownerPrivateKey === '***HIDDEN***' ? '' : settings.ownerPrivateKey || '',
        platformWalletAddress: settings.platformWalletAddress || '',
        gasLimit: settings.gasLimit || 300000,
        gasPrice: settings.gasPrice || '20000000000',
        batchSize: settings.batchSize || 20,
        delayBetweenBatches: settings.delayBetweenBatches || 5000
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setMessage('');
  };

  const fetchContractInfo = async () => {
    if (!formData.contractAddress) {
      setMessage('Please enter a contract address first');
      return;
    }

    setFetchingABI(true);
    setContractInfo(null);
    setAbiInfo(null);

    try {
      const token = localStorage.getItem('adminToken');
      
      // Fetch contract info
      const infoResponse = await fetch('/api/admin/contract-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractAddress: formData.contractAddress,
          chainId: formData.chainId
        })
      });

      const infoData = await infoResponse.json();
      if (infoData.success) {
        setContractInfo(infoData.data);
      }

      // Fetch ABI
      const abiResponse = await fetch('/api/admin/fetch-abi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractAddress: formData.contractAddress,
          chainId: formData.chainId
        })
      });

      const abiData = await abiResponse.json();
      if (abiData.success) {
        setAbiInfo(abiData.data);
        setMessage('✅ ABI fetched successfully from blockchain');
      } else {
        setMessage(`⚠️ Could not fetch ABI: ${abiData.error}. Will use fallback ABI.`);
      }

    } catch (error) {
      setMessage(`❌ Error fetching contract info: ${error.message}`);
    } finally {
      setFetchingABI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/contract-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Contract settings saved successfully!');
        onSettingsUpdate();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }

    } catch (error) {
      setMessage(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const networkOptions = [
    {
      value: 97,
      label: 'BSC Testnet',
      rpc: 'https://bsc-testnet.public.blastapi.io',
      explorer: 'https://testnet.bscscan.com',
      gasPrice: '10000000000' // 10 gwei for testnet
    },
    {
      value: 56,
      label: 'BSC Mainnet',
      rpc: 'https://bsc-dataseed.binance.org',
      explorer: 'https://bscscan.com',
      gasPrice: '5000000000' // 5 gwei for mainnet
    }
  ];

  const handleNetworkChange = (chainId) => {
    const network = networkOptions.find(n => n.value === chainId);
    if (network) {
      setFormData(prev => ({
        ...prev,
        chainId: network.value,
        networkName: network.label,
        rpcUrl: network.rpc,
        gasPrice: network.gasPrice // Update gas price based on network
      }));

      // Clear contract info when network changes
      setContractInfo(null);
      setAbiInfo(null);
      setMessage('Network changed. Please fetch ABI again for the new network.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Contract Configuration
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Configure your smart contract settings. The system will automatically fetch the ABI from BSCScan.
      </Typography>

      {message && (
        <Alert 
          severity={message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}
          sx={{ mb: 3 }}
        >
          {message}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Contract Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Contract Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Contract Address"
                      name="contractAddress"
                      value={formData.contractAddress}
                      onChange={handleChange}
                      required
                      placeholder="0x..."
                      helperText="Enter the smart contract address"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Button
                      variant="outlined"
                      onClick={fetchContractInfo}
                      disabled={fetchingABI || !formData.contractAddress}
                      startIcon={fetchingABI ? <CircularProgress size={20} /> : <Refresh />}
                      fullWidth
                      sx={{ height: 56 }}
                    >
                      {fetchingABI ? 'Fetching...' : 'Fetch ABI'}
                    </Button>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Network</InputLabel>
                      <Select
                        value={formData.chainId}
                        label="Network"
                        onChange={(e) => handleNetworkChange(e.target.value)}
                      >
                        {networkOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="RPC URL"
                      name="rpcUrl"
                      value={formData.rpcUrl}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                </Grid>

                {/* Contract Info Display */}
                {contractInfo && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Contract Information ({formData.chainId === 97 ? 'BSC Testnet' : 'BSC Mainnet'}):
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Name: ${contractInfo.contractName}`} size="small" />
                      <Chip
                        label={contractInfo.isVerified ? 'Verified' : 'Not Verified'}
                        color={contractInfo.isVerified ? 'success' : 'warning'}
                        size="small"
                      />
                      <Chip label={`Compiler: ${contractInfo.compilerVersion}`} size="small" />
                      <Chip
                        label={`Network: ${formData.networkName}`}
                        color="info"
                        size="small"
                      />
                    </Box>
                  </Box>
                )}

                {/* ABI Info Display */}
                {abiInfo && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      ABI Validation:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={abiInfo.validation.valid ? <CheckCircle /> : <Error />}
                        label={abiInfo.validation.valid ? 'Valid ABI' : 'Invalid ABI'} 
                        color={abiInfo.validation.valid ? 'success' : 'error'}
                        size="small" 
                      />
                      <Chip label={`Functions: ${abiInfo.validation.totalFunctions || abiInfo.validation.availableFunctions?.length || 0}`} size="small" />
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Wallet Configuration */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Wallet Configuration
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Owner Private Key"
                      name="ownerPrivateKey"
                      type="password"
                      value={formData.ownerPrivateKey}
                      onChange={handleChange}
                      required={!settings?.ownerPrivateKey}
                      placeholder={settings?.ownerPrivateKey ? "Leave empty to keep current key" : "Enter private key"}
                      helperText="Private key of the contract owner wallet"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Platform Wallet Address"
                      name="platformWalletAddress"
                      value={formData.platformWalletAddress}
                      onChange={handleChange}
                      required
                      placeholder="0x..."
                      helperText="Address where tokens will be transferred"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Advanced Settings */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Advanced Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Gas Limit"
                      name="gasLimit"
                      type="number"
                      value={formData.gasLimit}
                      onChange={handleChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Gas Price (wei)"
                      name="gasPrice"
                      value={formData.gasPrice}
                      onChange={handleChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Batch Size"
                      name="batchSize"
                      type="number"
                      value={formData.batchSize}
                      onChange={handleChange}
                      inputProps={{ min: 1, max: 100 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Delay Between Batches (ms)"
                      name="delayBetweenBatches"
                      type="number"
                      value={formData.delayBetweenBatches}
                      onChange={handleChange}
                      inputProps={{ min: 1000, max: 60000 }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{ minWidth: 200 }}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>

              {settings && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('adminToken');
                      const response = await fetch('/api/admin/reinitialize-contract', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      const data = await response.json();
                      if (data.success) {
                        setMessage('✅ Contract reinitialized successfully');
                      } else {
                        setMessage(`❌ Failed to reinitialize: ${data.error}`);
                      }
                    } catch (error) {
                      setMessage(`❌ Error: ${error.message}`);
                    }
                  }}
                  startIcon={<Refresh />}
                >
                  Reinitialize Contract
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default ContractSettings;
