import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Avatar,
  Stack,
  Divider,
  Paper,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import {
  AccountBalanceWallet,
  CheckCircle,
  SwapHoriz,
  TrendingUp,
  Error as ErrorIcon,
  Speed,
  Timeline,
  Analytics,
  Insights,
  Send
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ModernLoader from './ModernLoader';

// Binance color scheme
const COLORS = ['#F0B90B', '#00C851', '#F6465D', '#848E9C'];



function StatCard({ title, value, icon, color = 'primary', subtitle, progress }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getColorValue = (colorName) => {
    switch (colorName) {
      case 'primary': return '#F0B90B';
      case 'success': return '#00C851';
      case 'error': return '#F6465D';
      case 'info': return '#2196F3';
      default: return '#F0B90B';
    }
  };

  const colorValue = getColorValue(color);

  return (
    <Card sx={{
      background: 'linear-gradient(145deg, #1E2329 0%, #2B3139 100%)',
      border: '1px solid #2B3139',
      borderRadius: { xs: 2, sm: 3 },
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 4px 16px ${alpha(colorValue, 0.2)}`
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: colorValue
      }
    }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          alignItems={isMobile ? "flex-start" : "center"}
          justifyContent="space-between"
          spacing={isMobile ? 1 : 2}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#848E9C',
                fontWeight: 600,
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            >
              {title}
            </Typography>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              component="div"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                mb: 1
              }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: '#848E9C', mb: 1 }}>
                {subtitle}
              </Typography>
            )}
            {progress !== undefined && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#848E9C' }}>
                    Progress
                  </Typography>
                  <Typography variant="caption" sx={{ color: colorValue, fontWeight: 'bold' }}>
                    {progress.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: { xs: 4, sm: 6 },
                    borderRadius: 3,
                    backgroundColor: '#0B1426',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: colorValue,
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              width: { xs: 40, sm: 50, md: 60 },
              height: { xs: 40, sm: 50, md: 60 },
              background: `linear-gradient(135deg, ${colorValue}, ${alpha(colorValue, 0.8)})`,
              ml: { xs: 0, sm: 2 },
              alignSelf: { xs: 'flex-end', sm: 'center' }
            }}
          >
            {React.cloneElement(icon, {
              sx: {
                fontSize: { xs: 20, sm: 24, md: 30 },
                color: color === 'primary' ? '#0B1426' : 'white'
              }
            })}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch wallet stats
      const statsResponse = await fetch('/api/wallets/stats');
      const statsData = await statsResponse.json();
      
      // Fetch contract info
      const contractResponse = await fetch('/api/contract/info');
      const contractData = await contractResponse.json();
      
      if (statsData.success) {
        setStats(statsData.data);
      }
      
      if (contractData.success) {
        setContractInfo(contractData.data);
      }
      
      setError(null);
    } catch (error) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <ModernLoader
        message="Loading Dashboard Data..."
        variant="binance"
        size={80}
      />
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const platformChangeProgress = stats?.total > 0 ? (stats.platformChanged / stats.total) * 100 : 0;
  const transferProgress = stats?.total > 0 ? (stats.transferCompleted / stats.total) * 100 : 0;

  const pieData = [
    { name: 'Generated', value: stats?.total || 0 },
    { name: 'Platform Changed', value: stats?.platformChanged || 0 },
    { name: 'Transfer Completed', value: stats?.transferCompleted || 0 },
    { name: 'Pending', value: (stats?.total || 0) - (stats?.platformChanged || 0) }
  ];

  const progressData = [
    { name: 'Generation', completed: stats?.total || 0, total: stats?.total || 0 },
    { name: 'Platform Change', completed: stats?.platformChanged || 0, total: stats?.total || 0 },
    { name: 'Transfer', completed: stats?.transferCompleted || 0, total: stats?.total || 0 }
  ];

  return (
    <Box sx={{
      p: { xs: 1, sm: 2, md: 3 }
    }}>
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
            width: { xs: 40, sm: 48, md: 56 },
            height: { xs: 40, sm: 48, md: 56 }
          }}>
            <Analytics sx={{ fontSize: { xs: 20, sm: 24, md: 30 }, color: '#0B1426' }} />
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
              Dashboard Overview
            </Typography>
            <Typography variant="body1" sx={{ color: '#848E9C' }}>
              Real-time monitoring of your automation system
            </Typography>
          </Box>
        </Stack>

        {loading && (
          <LinearProgress
            sx={{
              backgroundColor: '#2B3139',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#F0B90B'
              },
              borderRadius: 1,
              height: 4
            }}
          />
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Wallets"
            value={stats?.total || 0}
            icon={<AccountBalanceWallet />}
            color="primary"
            subtitle="Generated wallets"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Platform Changed"
            value={stats?.platformChanged || 0}
            icon={<SwapHoriz />}
            color="info"
            subtitle="Platform wallet updated"
            progress={platformChangeProgress}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Transfers Completed"
            value={stats?.transferCompleted || 0}
            icon={<Send />}
            color="success"
            subtitle="Tokens transferred"
            progress={transferProgress}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Errors"
            value={stats?.withErrors || 0}
            icon={<ErrorIcon />}
            color="error"
            subtitle="Wallets with errors"
          />
        </Grid>

        {/* Contract Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Smart Contract Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Contract Owner
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {contractInfo?.owner || 'Loading...'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Platform Wallet
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {contractInfo?.platformWallet || 'Loading...'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Registered (Contract)
                    </Typography>
                    <Typography variant="h6">
                      {contractInfo?.totalRegistered || '0'}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Extractable Tokens
                    </Typography>
                    <Typography variant="h6">
                      {contractInfo?.totalExtractableTokens || '0'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Wallet Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Operation Progress
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#8884d8" name="Completed" />
                  <Bar dataKey="total" fill="#82ca9d" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Summary */}
        {stats?.withErrors > 0 && (
          <Grid item xs={12}>
            <Alert severity="warning" icon={<ErrorIcon />}>
              <Typography variant="body1">
                {stats.withErrors} wallets have encountered errors during processing.
                Check the Wallets tab for details.
              </Typography>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default DashboardTab;
