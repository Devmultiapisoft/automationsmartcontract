import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Avatar,
  Stack,
  Divider,
  Fade,
  Slide,
  Zoom,
  useTheme,
  alpha,
  keyframes
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  RocketLaunch,
  Timeline,
  Speed,
  AutoAwesome,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  SwapHoriz,
  Cancel
} from '@mui/icons-material';
import ModernLoader from './ModernLoader';

// Keyframe animations
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px #F0B90B; }
  50% { box-shadow: 0 0 20px #F0B90B, 0 0 30px #F0B90B; }
  100% { box-shadow: 0 0 5px #F0B90B; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;



function OperationsTab() {
  const [running, setRunning] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [processStatus, setProcessStatus] = useState([]);
  const [automationStatus, setAutomationStatus] = useState({
    isRunning: false,
    shouldStop: false,
    currentPair: 0,
    totalPairs: 0,
    stats: {}
  });
  const [currentPair, setCurrentPair] = useState(null);

  // Fetch stats to check if operations can be run
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/wallets/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAutomationStatus();

    const statsInterval = setInterval(fetchStats, 5000); // Update stats every 5 seconds
    const statusInterval = setInterval(() => {
      if (automationStatus.isRunning) {
        fetchAutomationStatus();
      }
    }, 2000); // Update automation status every 2 seconds when running

    return () => {
      clearInterval(statsInterval);
      clearInterval(statusInterval);
    };
  }, [automationStatus.isRunning]);

  const fetchAutomationStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/automation-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAutomationStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching automation status:', error);
    }
  };

  const startAutomation = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/start-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          delayBetweenWallets: 3000
        })
      });

      const data = await response.json();
      if (data.success) {
        setAutomationStatus(data.status);
        // Start polling for status updates
        fetchAutomationStatus();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to start automation: ' + error.message);
    }
  };

  const stopAutomation = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/stop-automation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setAutomationStatus(data.status);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to stop automation: ' + error.message);
    }
  };

  const runOperation = async (operationId) => {
    try {
      setRunning(prev => ({ ...prev, [operationId]: true }));
      setError(null);
      setProcessStatus([]);
      setCurrentPair(null);

      // Start polling for status updates
      const statusInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/operations/status');
          const statusData = await statusResponse.json();
          if (statusData.success) {
            setProcessStatus(statusData.data.processStatus || []);
            setCurrentPair(statusData.data.currentPair || null);
          }
        } catch (error) {
          console.error('Error fetching status:', error);
        }
      }, 2000); // Poll every 2 seconds

      const response = await fetch(`/api/operations/${operationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      // Stop polling
      clearInterval(statusInterval);

      if (data.success) {
        setResults(prev => ({
          ...prev,
          [operationId]: { success: true, data: data.data, timestamp: new Date() }
        }));
        // Refresh stats after successful operation
        await fetchStats();
      } else {
        setResults(prev => ({
          ...prev,
          [operationId]: { success: false, error: data.error, timestamp: new Date() }
        }));
        setError(data.error);
      }

    } catch (error) {
      setError(error.message);
      setResults(prev => ({
        ...prev,
        [operationId]: { success: false, error: error.message, timestamp: new Date() }
      }));
    } finally {
      setRunning(prev => ({ ...prev, [operationId]: false }));
      setProcessStatus([]);
      setCurrentPair(null);
    }
  };

  // Check if operation can be run
  const canRunOperation = (operationId) => {
    return !Object.values(running).some(r => r); // Can run if nothing is running
  };

  // Get status chip for process step
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pending" color="default" size="small" />;
      case 'generating':
        return <Chip label="Generating..." color="info" size="small" />;
      case 'platform-change':
        return <Chip label="Platform Change..." color="warning" size="small" />;
      case 'transfer':
        return <Chip label="Transfer..." color="primary" size="small" />;
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'error':
        return <Chip label="Error" color="error" size="small" />;
      default:
        return <Chip label="Unknown" color="default" size="small" />;
    }
  };

  const clearResults = () => {
    setResults({});
    setError(null);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Avatar sx={{
            bgcolor: '#F0B90B',
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 }
          }}>
            <RocketLaunch sx={{ fontSize: { xs: 24, sm: 30 }, color: '#0B1426' }} />
          </Avatar>
          <Box>
            <Typography
              variant={{ xs: 'h5', sm: 'h4' }}
              sx={{
                color: 'white',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #F0B90B, #FCD535)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              Automation Operations
            </Typography>
            <Typography variant="body1" sx={{ color: '#848E9C' }}>
              Execute smart contract automation workflows
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Status Alert */}
      {stats && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            backgroundColor: alpha('#2196F3', 0.1),
            border: '1px solid #2196F3',
            color: '#2196F3',
            '& .MuiAlert-icon': {
              color: '#2196F3'
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            <strong>Current Status:</strong> {stats.total} wallets generated, {stats.platformChanged} platform changes completed, {stats.transferCompleted} transfers completed
          </Typography>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            backgroundColor: '#F6465D',
            color: 'white',
            border: '1px solid #F6465D',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Operation */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            background: 'linear-gradient(145deg, #1E2329 0%, #2B3139 100%)',
            border: '1px solid #2B3139',
            borderRadius: { xs: 2, sm: 3 }
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <AutoAwesome sx={{ color: '#F0B90B', fontSize: 24 }} />
                <Typography variant="h6" sx={{ color: '#F0B90B', fontWeight: 'bold' }}>
                  Smart Contract Automation
                </Typography>
              </Stack>

              <Typography variant="body2" sx={{ color: '#848E9C', mb: 3 }}>
                Complete automation workflow: Fetch registered addresses → Generate wallets → Platform changes → Transfers
              </Typography>

              {/* Automation Status */}
              {automationStatus.isRunning && (
                <Box sx={{ mb: 3 }}>
                  <LinearProgress
                    sx={{
                      backgroundColor: '#2B3139',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#F0B90B'
                      },
                      borderRadius: 1,
                      height: 6
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 1, color: '#848E9C' }}>
                    Processing pair {automationStatus.currentPair}/{automationStatus.totalPairs}...
                    {automationStatus.shouldStop && ' (Stopping after current operation...)'}
                  </Typography>

                  {/* Live Stats */}
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#0B1426', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#848E9C' }}>Wallets Generated</Typography>
                        <Typography variant="h6" sx={{ color: '#F0B90B' }}>
                          {automationStatus.stats.walletsGenerated || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#848E9C' }}>Platform Changes</Typography>
                        <Typography variant="h6" sx={{ color: '#2196F3' }}>
                          {automationStatus.stats.platformChanges || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#848E9C' }}>Transfers</Typography>
                        <Typography variant="h6" sx={{ color: '#00C851' }}>
                          {automationStatus.stats.transfers || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#848E9C' }}>Errors</Typography>
                        <Typography variant="h6" sx={{ color: '#F6465D' }}>
                          {automationStatus.stats.errors || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              )}

              {/* Control Buttons */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={startAutomation}
                  disabled={automationStatus.isRunning}
                  fullWidth
                  size="large"
                  sx={{
                    background: 'linear-gradient(45deg, #F0B90B 0%, #FCD535 100%)',
                    color: '#0B1426',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #D9A441 0%, #F0B90B 100%)',
                    },
                    '&:disabled': {
                      background: '#848E9C',
                      color: '#2B3139'
                    }
                  }}
                >
                  {automationStatus.isRunning ? 'Running...' : 'Start Automation'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={stopAutomation}
                  disabled={!automationStatus.isRunning}
                  fullWidth
                  size="large"
                  sx={{
                    borderColor: '#F6465D',
                    color: '#F6465D',
                    '&:hover': {
                      borderColor: '#F6465D',
                      backgroundColor: 'rgba(246, 70, 93, 0.1)'
                    },
                    '&:disabled': {
                      borderColor: '#848E9C',
                      color: '#848E9C'
                    }
                  }}
                >
                  Stop
                </Button>
              </Stack>

              {/* Status Message */}
              {automationStatus.shouldStop && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 2,
                    backgroundColor: 'rgba(240, 185, 11, 0.1)',
                    border: '1px solid #F0B90B',
                    color: '#F0B90B',
                    '& .MuiAlert-icon': {
                      color: '#F0B90B'
                    }
                  }}
                >
                  Stop requested - workflow will stop after current operation completes
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Process Status
              </Typography>

              {processStatus.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Pair</TableCell>
                        <TableCell>Wallet</TableCell>
                        <TableCell>Registered Address</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processStatus.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.pairNumber}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {item.walletAddress ? `${item.walletAddress.slice(0, 8)}...` : '-'}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {item.registeredAddress ? `${item.registeredAddress.slice(0, 8)}...` : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusChip(item.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No active processes. Start the automation to see real-time status.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Clear Results */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={clearResults}
              disabled={Object.values(running).some(r => r)}
            >
              Clear All Results
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Instructions */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Choose your workflow approach:
            </Typography>

            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              🔄 Sequential Workflow (Recommended)
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2, mb: 2 }}>
              <li>Fetches all registered addresses from contract and stores them with order numbers</li>
              <li>For each pair: Generate wallet → Platform change → Transfer to registered address (by order)</li>
              <li>Example: Wallet 1 → Platform change → Transfer to registered address #1</li>
            </Box>

            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              📋 Individual Operations
            </Typography>
            <Box component="ol" sx={{ mt: 1, pl: 2 }}>
              <li><strong>Generate Wallets:</strong> Creates 5000 wallet addresses with private keys and stores them in database</li>
              <li><strong>Change Platform Wallet:</strong> Calls changePlatformWallet() for each generated address (this registers them in the contract)</li>
              <li><strong>Execute Single Transfers:</strong> Calls singleTransfer() for all wallets that successfully completed platform changes</li>
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Make sure your owner private key is configured in the .env file
                and you have sufficient BNB for gas fees before starting operations.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default OperationsTab;
