import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  Settings,
  AccountBalanceWallet,
  Storage,
  NetworkCheck,
  Info
} from '@mui/icons-material';

function SettingsTab() {
  const [contractInfo, setContractInfo] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContractInfo();
    fetchHealthStatus();
  }, []);

  const fetchContractInfo = async () => {
    try {
      const response = await fetch('/api/contract/info');
      const data = await response.json();
      if (data.success) {
        setContractInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch contract info:', error);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchContractInfo(), fetchHealthStatus()]);
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings & Configuration
      </Typography>

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkCheck sx={{ mr: 1 }} />
                <Typography variant="h6">System Status</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Storage />
                  </ListItemIcon>
                  <ListItemText
                    primary="Database"
                    secondary={
                      <Chip
                        label={healthStatus?.database?.status || 'Unknown'}
                        color={healthStatus?.database?.status === 'healthy' ? 'success' : 'error'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <NetworkCheck />
                  </ListItemIcon>
                  <ListItemText
                    primary="Smart Contract"
                    secondary={
                      <Chip
                        label={healthStatus?.contract === 'connected' ? 'Connected' : 'Disconnected'}
                        color={healthStatus?.contract === 'connected' ? 'success' : 'error'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              </List>

              <Button
                variant="outlined"
                onClick={refreshData}
                disabled={loading}
                fullWidth
                sx={{ mt: 2 }}
              >
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Contract Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceWallet sx={{ mr: 1 }} />
                <Typography variant="h6">Contract Information</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="Contract Address"
                    secondary={
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        0x7238fae7a03b278f2e13bb357191816dff1792d0
                      </Typography>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Owner Address"
                    secondary={
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {contractInfo?.owner || 'Loading...'}
                      </Typography>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Platform Wallet"
                    secondary={
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {contractInfo?.platformWallet || 'Loading...'}
                      </Typography>
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Total Registered"
                    secondary={contractInfo?.totalRegistered || '0'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Settings sx={{ mr: 1 }} />
                <Typography variant="h6">Configuration</Typography>
              </Box>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Configuration is managed through environment variables. 
                  Update your .env file and restart the server to apply changes.
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="RPC URL"
                    value="https://data-seed-prebsc-1-s1.binance.org:8545/"
                    fullWidth
                    disabled
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Chain ID"
                    value="97 (BSC Testnet)"
                    fullWidth
                    disabled
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Contract Address"
                    value="0x7238fae7a03b278f2e13bb357191816dff1792d0"
                    fullWidth
                    disabled
                    size="small"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Database"
                    value="MongoDB"
                    fullWidth
                    disabled
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Info sx={{ mr: 1 }} />
                <Typography variant="h6">Usage Instructions</Typography>
              </Box>
              
              <Typography variant="body2" paragraph>
                <strong>Before starting the automation:</strong>
              </Typography>
              
              <Box component="ol" sx={{ pl: 2, mb: 2 }}>
                <li>Ensure MongoDB is running on your system</li>
                <li>Configure your .env file with the owner private key</li>
                <li>Make sure you have sufficient BNB for gas fees</li>
                <li>Verify the contract address is correct</li>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" paragraph>
                <strong>Automation workflow:</strong>
              </Typography>
              
              <Box component="ol" sx={{ pl: 2 }}>
                <li>Generate 5000 wallet addresses with private keys</li>
                <li>Store all wallets in the database</li>
                <li>Call changePlatformWallet() for each generated address</li>
                <li>Fetch all registered addresses from the contract</li>
                <li>Execute singleTransfer() for each registered address</li>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Important:</strong> The automation process may take several hours to complete 
                  depending on network conditions and gas prices. Monitor the progress in the Operations tab.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SettingsTab;
