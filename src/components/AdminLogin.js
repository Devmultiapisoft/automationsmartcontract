import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Security,
  AdminPanelSettings,
  Lock,
  Person
} from '@mui/icons-material';

function AdminLogin({ onLogin }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('adminToken', data.data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.admin));
        
        // Call parent callback
        onLogin(data.data);
      } else {
        setError(data.error || 'Login failed');
      }

    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0B1426 0%, #1E2329 100%)',
        p: { xs: 2, sm: 3 }
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            p: { xs: 3, sm: 4 },
            width: '100%',
            maxWidth: { xs: '100%', sm: 450 },
            borderRadius: { xs: 2, sm: 3 },
            background: 'linear-gradient(145deg, #1E2329 0%, #2B3139 100%)',
            border: '1px solid #2B3139',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #F0B90B 0%, #FCD535 100%)'
            }
          }}
        >
          {/* Header Section */}
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
            <Avatar
              sx={{
                width: { xs: 60, sm: 80 },
                height: { xs: 60, sm: 80 },
                margin: '0 auto 16px',
                background: 'linear-gradient(45deg, #F0B90B 0%, #FCD535 100%)',
                boxShadow: '0 4px 16px rgba(240, 185, 11, 0.3)'
              }}
            >
              <AdminPanelSettings sx={{ fontSize: { xs: 30, sm: 40 }, color: '#0B1426' }} />
            </Avatar>

            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              gutterBottom
              sx={{
                background: 'linear-gradient(45deg, #F0B90B, #FCD535)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Admin Portal
            </Typography>

            <Typography variant="body1" sx={{ color: '#848E9C', mb: 2 }}>
              Smart Contract Automation System
            </Typography>
          </Box>

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

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: '#848E9C' }} />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#0B1426',
                  '& fieldset': {
                    borderColor: '#2B3139'
                  },
                  '&:hover fieldset': {
                    borderColor: '#F0B90B'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#F0B90B',
                    boxShadow: '0 0 0 2px rgba(240, 185, 11, 0.2)'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#848E9C',
                  '&.Mui-focused': {
                    color: '#F0B90B'
                  }
                },
                '& .MuiInputBase-input': {
                  color: 'white'
                }
              }}
            />

            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#848E9C' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#0B1426',
                  '& fieldset': {
                    borderColor: '#2B3139'
                  },
                  '&:hover fieldset': {
                    borderColor: '#F0B90B'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#F0B90B',
                    boxShadow: '0 0 0 2px rgba(240, 185, 11, 0.2)'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#848E9C',
                  '&.Mui-focused': {
                    color: '#F0B90B'
                  }
                },
                '& .MuiInputBase-input': {
                  color: 'white'
                }
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} sx={{ color: '#0B1426' }} /> : <LoginIcon />}
              sx={{
                mt: { xs: 2, sm: 3 },
                mb: 2,
                py: { xs: 1.2, sm: 1.5 },
                background: 'linear-gradient(45deg, #F0B90B 0%, #FCD535 100%)',
                color: '#0B1426',
                fontWeight: 'bold',
                fontSize: { xs: '1rem', sm: '1.1rem' },
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(240, 185, 11, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #D9A441 0%, #F0B90B 100%)',
                  boxShadow: '0 6px 25px rgba(240, 185, 11, 0.6)',
                  transform: 'translateY(-1px)'
                },
                '&:disabled': {
                  background: '#848E9C',
                  color: '#2B3139'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Signing In...' : 'Access Admin Portal'}
            </Button>
          </Box>

          {/* Default Credentials Info */}
          <Box sx={{
            mt: { xs: 2, sm: 3 },
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #0B1426 0%, #1E2329 100%)',
            borderRadius: 2,
            border: '1px solid #2B3139'
          }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Security sx={{ color: '#F0B90B', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#F0B90B', fontWeight: 'bold' }}>
                Default Credentials
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#848E9C' }}>
              <strong style={{ color: 'white' }}>Username:</strong> admin<br />
              <strong style={{ color: 'white' }}>Password:</strong> admin123
            </Typography>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}

export default AdminLogin;
