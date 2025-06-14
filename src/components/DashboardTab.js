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
  LinearProgress
} from '@mui/material';
import {
  AccountBalanceWallet,
  CheckCircle,
  SwapHoriz,
  TrendingUp,
  Error as ErrorIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function StatCard({ title, value, icon, color = 'primary', subtitle, progress }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {progress !== undefined && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  color={color}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {progress.toFixed(1)}% Complete
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      {loading && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Wallets"
            value={stats?.total || 0}
            icon={<AccountBalanceWallet sx={{ fontSize: 40 }} />}
            color="primary"
            subtitle="Generated wallets"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Platform Changed"
            value={stats?.platformChanged || 0}
            icon={<SwapHoriz sx={{ fontSize: 40 }} />}
            color="info"
            subtitle="Platform wallet updated"
            progress={platformChangeProgress}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Transfers Completed"
            value={stats?.transferCompleted || 0}
            icon={<TrendingUp sx={{ fontSize: 40 }} />}
            color="success"
            subtitle="Tokens transferred"
            progress={transferProgress}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Errors"
            value={stats?.withErrors || 0}
            icon={<ErrorIcon sx={{ fontSize: 40 }} />}
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
                    {pieData.map((entry, index) => (
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
