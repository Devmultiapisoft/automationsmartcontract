import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Avatar,
  Stack,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  Error as ErrorIcon,
  ContentCopy,
  Visibility,
  TrendingUp,
  AccountBalanceWallet,
  SwapHoriz,
  Send
} from '@mui/icons-material';
import ModernLoader from './ModernLoader';

function WalletsTab() {
  const theme = useTheme();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    platformChanged: '',
    transferCompleted: ''
  });

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    fetchWallets();
  }, [page, rowsPerPage, filters]);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });
      
      const response = await fetch(`/api/wallets?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setWallets(data.data.wallets);
        setTotalCount(data.data.pagination.total);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const getStatusChip = (wallet) => {
    if (wallet.transferCompleted) {
      return (
        <Chip
          icon={<Send />}
          label="Transfer Complete"
          sx={{
            backgroundColor: '#00C851',
            color: 'white',
            fontWeight: 'bold',
            '& .MuiChip-icon': { color: 'white' }
          }}
          size="small"
        />
      );
    } else if (wallet.platformWalletChanged) {
      return (
        <Chip
          icon={<SwapHoriz />}
          label="Platform Changed"
          sx={{
            backgroundColor: '#F0B90B',
            color: 'black',
            fontWeight: 'bold',
            '& .MuiChip-icon': { color: 'black' }
          }}
          size="small"
        />
      );
    } else if (wallet.errorCount > 0) {
      return (
        <Chip
          icon={<ErrorIcon />}
          label="Error"
          sx={{
            backgroundColor: '#F6465D',
            color: 'white',
            fontWeight: 'bold',
            '& .MuiChip-icon': { color: 'white' }
          }}
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<AccountBalanceWallet />}
          label="Generated"
          sx={{
            backgroundColor: '#848E9C',
            color: 'white',
            fontWeight: 'bold',
            '& .MuiChip-icon': { color: 'white' }
          }}
          size="small"
        />
      );
    }
  };

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
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
            <AccountBalanceWallet />
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
              Wallet Management
            </Typography>
            <Typography variant="body2" sx={{ color: '#848E9C' }}>
              Monitor and manage your automation wallets
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{
        mb: 3,
        backgroundColor: '#1E2329',
        border: '1px solid #2B3139',
        borderRadius: 2
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#F0B90B', fontWeight: 'bold' }}>
            🔍 Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#848E9C' }}>Platform Changed</InputLabel>
                <Select
                  value={filters.platformChanged}
                  label="Platform Changed"
                  onChange={(e) => handleFilterChange('platformChanged', e.target.value)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2B3139'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#F0B90B'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#F0B90B'
                    }
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Changed</MenuItem>
                  <MenuItem value="false">Not Changed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#848E9C' }}>Transfer Status</InputLabel>
                <Select
                  value={filters.transferCompleted}
                  label="Transfer Status"
                  onChange={(e) => handleFilterChange('transferCompleted', e.target.value)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#2B3139'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#F0B90B'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#F0B90B'
                    }
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Completed</MenuItem>
                  <MenuItem value="false">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Wallets Table */}
      <Card sx={{
        backgroundColor: '#1E2329',
        border: '1px solid #2B3139',
        borderRadius: 2
      }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#F0B90B', fontWeight: 'bold' }}>
              💼 Wallets ({totalCount.toLocaleString()} total)
            </Typography>
            <Chip
              label={`${totalCount} Wallets`}
              sx={{
                backgroundColor: alpha('#F0B90B', 0.1),
                color: '#F0B90B',
                fontWeight: 'bold'
              }}
            />
          </Stack>

          {loading ? (
            <ModernLoader
              message="Loading Wallets..."
              variant="binance"
              size={60}
            />
          ) : (
            <>
              <TableContainer sx={{
                backgroundColor: '#0B1426',
                borderRadius: 1,
                border: '1px solid #2B3139'
              }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#1E2329' }}>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        ID
                      </TableCell>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        Address
                      </TableCell>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        Status
                      </TableCell>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        Platform Changed
                      </TableCell>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        Transfer Complete
                      </TableCell>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        Errors
                      </TableCell>
                      <TableCell sx={{
                        color: '#F0B90B',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #2B3139',
                        textAlign: 'center'
                      }}>
                        Created
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wallets.map((wallet, index) => (
                      <TableRow
                        key={wallet._id}
                        sx={{
                          '&:hover': {
                            backgroundColor: alpha('#F0B90B', 0.05)
                          },
                          borderBottom: '1px solid #2B3139'
                        }}
                      >
                        <TableCell sx={{
                          color: 'white',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          #{wallet.walletId}
                        </TableCell>
                        <TableCell sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: '#848E9C',
                          textAlign: 'center',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                            </Typography>
                            <Tooltip title="Copy Address">
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(wallet.address)}
                                sx={{ color: '#848E9C', '&:hover': { color: '#F0B90B' } }}
                              >
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{
                          textAlign: 'center',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          {getStatusChip(wallet)}
                        </TableCell>
                        <TableCell sx={{
                          textAlign: 'center',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          {wallet.platformWalletChanged ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="✓ Yes"
                              sx={{
                                backgroundColor: '#00C851',
                                color: 'white',
                                fontWeight: 'bold',
                                '& .MuiChip-icon': { color: 'white' }
                              }}
                              size="small"
                            />
                          ) : (
                            <Chip
                              icon={<Cancel />}
                              label="✗ No"
                              sx={{
                                backgroundColor: '#848E9C',
                                color: 'white',
                                fontWeight: 'bold',
                                '& .MuiChip-icon': { color: 'white' }
                              }}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{
                          textAlign: 'center',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          {wallet.transferCompleted ? (
                            <Chip
                              icon={<CheckCircle />}
                              label="✓ Yes"
                              sx={{
                                backgroundColor: '#00C851',
                                color: 'white',
                                fontWeight: 'bold',
                                '& .MuiChip-icon': { color: 'white' }
                              }}
                              size="small"
                            />
                          ) : (
                            <Chip
                              icon={<Cancel />}
                              label="✗ No"
                              sx={{
                                backgroundColor: '#848E9C',
                                color: 'white',
                                fontWeight: 'bold',
                                '& .MuiChip-icon': { color: 'white' }
                              }}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{
                          textAlign: 'center',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          {wallet.errorCount > 0 ? (
                            <Chip
                              icon={<ErrorIcon />}
                              label={wallet.errorCount}
                              sx={{
                                backgroundColor: '#F6465D',
                                color: 'white',
                                fontWeight: 'bold',
                                '& .MuiChip-icon': { color: 'white' }
                              }}
                              size="small"
                            />
                          ) : (
                            <Chip
                              label="0"
                              sx={{
                                backgroundColor: '#00C851',
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{
                          color: '#848E9C',
                          textAlign: 'center',
                          borderBottom: '1px solid #2B3139'
                        }}>
                          {new Date(wallet.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  color: '#848E9C',
                  borderTop: '1px solid #2B3139',
                  backgroundColor: '#1E2329',
                  '& .MuiTablePagination-toolbar': {
                    color: '#848E9C'
                  },
                  '& .MuiTablePagination-selectLabel': {
                    color: '#848E9C'
                  },
                  '& .MuiTablePagination-displayedRows': {
                    color: '#848E9C'
                  },
                  '& .MuiIconButton-root': {
                    color: '#848E9C',
                    '&:hover': {
                      backgroundColor: alpha('#F0B90B', 0.1),
                      color: '#F0B90B'
                    }
                  },
                  '& .MuiSelect-select': {
                    color: '#848E9C'
                  }
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default WalletsTab;
