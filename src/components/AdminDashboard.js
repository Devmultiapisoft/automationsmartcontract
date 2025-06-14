import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Stack,
  Avatar,
  Fade
} from '@mui/material';
import {
  Logout,
  Settings,
  AccountCircle,
  Dashboard as DashboardIcon,
  AccountBalanceWallet,
  Timeline,
  Menu as MenuIcon,
  Close as CloseIcon,
  VpnKey
} from '@mui/icons-material';
import ContractSettings from './ContractSettings';
import DashboardTab from './DashboardTab';
import WalletsTab from './WalletsTab';
import OperationsTab from './OperationsTab';
import SettingsTab from './SettingsTab';
import ChangePassword from './ChangePassword';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{
          p: { xs: 1, sm: 2, md: 3 },
          backgroundColor: '#1E2329',
          borderRadius: { xs: '0 0 4px 4px', sm: '0 0 8px 8px' },
          minHeight: { xs: 'calc(100vh - 120px)', sm: 'calc(100vh - 140px)' }
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function AdminDashboard({ adminData, onLogout }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0); // Start with Contract Settings tab
  const [anchorEl, setAnchorEl] = useState(null);

  const [contractSettings, setContractSettings] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContractSettings();
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchContractSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/contract-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setContractSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching contract settings:', error);
    }
  };

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

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    handleMenuClose();
    onLogout();
  };

  const isContractConfigured = contractSettings && contractSettings.contractAddress;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          backgroundColor: '#1E2329',
          borderBottom: '1px solid #2B3139',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <DashboardIcon sx={{ mr: 2, color: '#F0B90B' }} />
          <Typography
            variant={isMobile ? "subtitle1" : "h6"}
            component="div"
            sx={{
              flexGrow: 1,
              background: 'linear-gradient(45deg, #F0B90B, #FCD535)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            {isMobile ? 'Admin Panel' : 'Smart Contract Automation - Admin Panel'}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={1}>
            {/* Health Status - Hidden on mobile */}
            {healthStatus && !isMobile && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: healthStatus.status === 'healthy' ? '#00C851' : '#F6465D'
                  }}
                />
                <Typography variant="body2" sx={{ color: '#848E9C' }}>
                  {healthStatus.status === 'healthy' ? 'Connected' : 'Disconnected'}
                </Typography>
              </Stack>
            )}

            {/* Contract Status */}
            {!isContractConfigured && (
              <Chip
                label={isMobile ? "Setup Required" : "Contract Not Configured"}
                sx={{
                  backgroundColor: '#F0B90B',
                  color: '#0B1426',
                  fontWeight: 'bold',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}
                size="small"
              />
            )}

            {/* Welcome text - Hidden on mobile */}
            {!isMobile && (
              <Typography variant="body2" sx={{ color: '#848E9C' }}>
                Welcome, {adminData.admin.username}
              </Typography>
            )}

            <IconButton
              size="large"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <AccountCircle sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{
        background: 'linear-gradient(135deg, #0B1426 0%, #1E2329 100%)',
        minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' }
      }}>
        <Container
          maxWidth="xl"
          sx={{
            pt: { xs: 1, sm: 2, md: 3 },
            pb: { xs: 1, sm: 2, md: 3 },
            px: { xs: 1, sm: 2, md: 3 }
          }}
        >
          {error && (
            <Fade in timeout={500}>
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  backgroundColor: '#F6465D',
                  color: 'white',
                  '& .MuiAlert-icon': {
                    color: 'white'
                  }
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          <Box sx={{
            borderBottom: 1,
            borderColor: '#2B3139',
            backgroundColor: '#1E2329',
            borderRadius: { xs: '4px 4px 0 0', sm: '8px 8px 0 0' },
            overflow: 'hidden'
          }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="admin dashboard tabs"
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons={isMobile ? "auto" : false}
              allowScrollButtonsMobile
              sx={{
                minHeight: { xs: 48, sm: 56 },
                '& .MuiTab-root': {
                  color: '#848E9C',
                  fontWeight: 600,
                  textTransform: 'none',
                  minHeight: { xs: 48, sm: 56 },
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  padding: { xs: '6px 8px', sm: '12px 16px' },
                  '&.Mui-selected': {
                    color: '#F0B90B',
                  },
                  '&:hover': {
                    color: '#F0B90B',
                    backgroundColor: 'rgba(240, 185, 11, 0.05)'
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#F0B90B',
                  height: 3
                },
                '& .MuiTabs-scrollButtons': {
                  color: '#848E9C',
                  '&:hover': {
                    color: '#F0B90B'
                  }
                }
              }}
            >
              <Tab
                label={isMobile ? "Settings" : "Contract Settings"}
                icon={<Settings />}
                iconPosition={isMobile ? "top" : "start"}
                id="admin-tab-0"
                aria-controls="admin-tabpanel-0"
              />
              <Tab
                icon={<DashboardIcon />}
                label="Dashboard"
                iconPosition={isMobile ? "top" : "start"}
                id="admin-tab-1"
                aria-controls="admin-tabpanel-1"
                disabled={!isContractConfigured}
              />
              <Tab
                icon={<AccountBalanceWallet />}
                label="Wallets"
                iconPosition={isMobile ? "top" : "start"}
                id="admin-tab-2"
                aria-controls="admin-tabpanel-2"
                disabled={!isContractConfigured}
              />
              <Tab
                icon={<Timeline />}
                label="Operations"
                iconPosition={isMobile ? "top" : "start"}
                id="admin-tab-3"
                aria-controls="admin-tabpanel-3"
                disabled={!isContractConfigured}
              />
              <Tab
                icon={<Settings />}
                label={isMobile ? "System" : "System Settings"}
                iconPosition={isMobile ? "top" : "start"}
                id="admin-tab-4"
                aria-controls="admin-tabpanel-4"
                disabled={!isContractConfigured}
              />
              <Tab
                icon={<VpnKey />}
                label={isMobile ? "Password" : "Change Password"}
                iconPosition={isMobile ? "top" : "start"}
                id="admin-tab-5"
                aria-controls="admin-tabpanel-5"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <ContractSettings
              settings={contractSettings}
              onSettingsUpdate={fetchContractSettings}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {isContractConfigured ? (
              <DashboardTab />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="textSecondary">
                  Please configure contract settings first to access dashboard
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {isContractConfigured ? (
              <WalletsTab />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="textSecondary">
                  Please configure contract settings first to access wallets
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {isContractConfigured ? (
              <OperationsTab />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="textSecondary">
                  Please configure contract settings first to access operations
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            {isContractConfigured ? (
              <SettingsTab />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="textSecondary">
                  Please configure contract settings first to access system settings
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={5}>
            <ChangePassword />
          </TabPanel>
        </Container>
      </Box>
    </Box>
  );
}

export default AdminDashboard;
