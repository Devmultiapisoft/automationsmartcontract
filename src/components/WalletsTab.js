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
  CircularProgress
} from '@mui/material';
import { CheckCircle, Cancel, Pending, Error as ErrorIcon } from '@mui/icons-material';

function WalletsTab() {
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
      return <Chip icon={<CheckCircle />} label="Transfer Complete" color="success" size="small" />;
    } else if (wallet.platformWalletChanged) {
      return <Chip icon={<Pending />} label="Platform Changed" color="info" size="small" />;
    } else if (wallet.errorCount > 0) {
      return <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />;
    } else {
      return <Chip icon={<Cancel />} label="Generated" color="default" size="small" />;
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Wallet Management
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Platform Changed</InputLabel>
                <Select
                  value={filters.platformChanged}
                  label="Platform Changed"
                  onChange={(e) => handleFilterChange('platformChanged', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Changed</MenuItem>
                  <MenuItem value="false">Not Changed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Transfer Status</InputLabel>
                <Select
                  value={filters.transferCompleted}
                  label="Transfer Status"
                  onChange={(e) => handleFilterChange('transferCompleted', e.target.value)}
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
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Wallets ({totalCount} total)
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Platform Changed</TableCell>
                      <TableCell>Transfer Complete</TableCell>
                      <TableCell>Errors</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wallets.map((wallet) => (
                      <TableRow key={wallet._id}>
                        <TableCell>{wallet.walletId}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {wallet.address}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(wallet)}
                        </TableCell>
                        <TableCell>
                          {wallet.platformWalletChanged ? (
                            <Chip icon={<CheckCircle />} label="Yes" color="success" size="small" />
                          ) : (
                            <Chip icon={<Cancel />} label="No" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {wallet.transferCompleted ? (
                            <Chip icon={<CheckCircle />} label="Yes" color="success" size="small" />
                          ) : (
                            <Chip icon={<Cancel />} label="No" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {wallet.errorCount > 0 ? (
                            <Chip 
                              icon={<ErrorIcon />} 
                              label={wallet.errorCount} 
                              color="error" 
                              size="small" 
                            />
                          ) : (
                            <Chip label="0" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(wallet.createdAt).toLocaleDateString()}
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
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default WalletsTab;
