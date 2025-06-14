import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Security,
  Save,
  VpnKey
} from '@mui/icons-material';
import ModernLoader from './ModernLoader';

function ChangePassword() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (message || error) {
      setMessage('');
      setError('');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePasswords = () => {
    if (!passwords.currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!passwords.newPassword) {
      setError('New password is required');
      return false;
    }
    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (passwords.currentPassword === passwords.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password changed successfully!');
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ModernLoader 
        message="Changing Password..." 
        variant="simple"
        size={40}
      />
    );
  }

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
            width: { xs: 40, sm: 48 }, 
            height: { xs: 40, sm: 48 }
          }}>
            <VpnKey />
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
                WebkitTextFillColor: 'transparent'
              }}
            >
              Change Password
            </Typography>
            <Typography variant="body2" sx={{ color: '#848E9C' }}>
              Update your admin account password
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Change Password Form */}
      <Card sx={{
        background: 'linear-gradient(145deg, #1E2329 0%, #2B3139 100%)',
        border: '1px solid #2B3139',
        borderRadius: { xs: 2, sm: 3 },
        maxWidth: 600,
        mx: 'auto'
      }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <Security sx={{ color: '#F0B90B', fontSize: 24 }} />
            <Typography variant="h6" sx={{ color: '#F0B90B', fontWeight: 'bold' }}>
              Security Settings
            </Typography>
          </Stack>

          {/* Success Message */}
          {message && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                backgroundColor: '#00C851',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }}
            >
              {message}
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                backgroundColor: '#F6465D',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Current Password */}
            <TextField
              fullWidth
              label="Current Password"
              name="currentPassword"
              type={showPasswords.current ? 'text' : 'password'}
              value={passwords.currentPassword}
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
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                      sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}
                    >
                      {showPasswords.current ? <VisibilityOff /> : <Visibility />}
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
                    borderColor: '#F0B90B'
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

            {/* New Password */}
            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type={showPasswords.new ? 'text' : 'password'}
              value={passwords.newPassword}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
              helperText="Password must be at least 6 characters long"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VpnKey sx={{ color: '#848E9C' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('new')}
                      edge="end"
                      sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}
                    >
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
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
                    borderColor: '#F0B90B'
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
                },
                '& .MuiFormHelperText-root': {
                  color: '#848E9C'
                }
              }}
            />

            {/* Confirm New Password */}
            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwords.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VpnKey sx={{ color: '#848E9C' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                      sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}
                    >
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
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
                    borderColor: '#F0B90B'
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

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={<Save />}
              sx={{ 
                mt: { xs: 2, sm: 3 }, 
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
              Change Password
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ChangePassword;
