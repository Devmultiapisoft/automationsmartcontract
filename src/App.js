import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Tabs,
  Tab,
  Paper,
  Alert
} from '@mui/material';
import { AccountBalanceWallet, Dashboard, Settings, Timeline } from '@mui/icons-material';

import DashboardTab from './components/DashboardTab';
import WalletsTab from './components/WalletsTab';
import OperationsTab from './components/OperationsTab';
import SettingsTab from './components/SettingsTab';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
      setError(null);
    } catch (error) {
      setError('Failed to connect to server');
      setHealthStatus(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <AccountBalanceWallet sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Smart Contract Automation Dashboard
            </Typography>
            {healthStatus && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: healthStatus.status === 'healthy' ? 'success.main' : 'error.main'
                  }}
                />
                <Typography variant="body2">
                  {healthStatus.status === 'healthy' ? 'Connected' : 'Disconnected'}
                </Typography>
              </Box>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
                <Tab
                  icon={<Dashboard />}
                  label="Dashboard"
                  id="tab-0"
                  aria-controls="tabpanel-0"
                />
                <Tab
                  icon={<AccountBalanceWallet />}
                  label="Wallets"
                  id="tab-1"
                  aria-controls="tabpanel-1"
                />
                <Tab
                  icon={<Timeline />}
                  label="Operations"
                  id="tab-2"
                  aria-controls="tabpanel-2"
                />
                <Tab
                  icon={<Settings />}
                  label="Settings"
                  id="tab-3"
                  aria-controls="tabpanel-3"
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <DashboardTab />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <WalletsTab />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <OperationsTab />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <SettingsTab />
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
