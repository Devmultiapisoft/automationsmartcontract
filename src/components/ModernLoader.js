import { Box, CircularProgress, Typography, keyframes, alpha, useMediaQuery, useTheme } from '@mui/material';

// Simple, performant animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

function ModernLoader({
  size = 40,
  message = "Loading...",
  variant = "simple",
  fullScreen = false
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Responsive size
  const loaderSize = isMobile ? Math.min(size, 32) : size;

  const containerSx = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0B1426 0%, #1E2329 100%)',
    zIndex: 9999
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: { xs: 2, sm: 3, md: 4 },
    px: { xs: 1, sm: 2 }
  };

  if (variant === "binance") {
    return (
      <Box sx={containerSx}>
        {/* Simple Binance loader - better performance */}
        <Box sx={{ position: 'relative', mb: { xs: 2, sm: 3 } }}>
          <CircularProgress
            size={loaderSize}
            thickness={4}
            sx={{
              color: '#F0B90B',
              animation: `${fadeIn} 0.5s ease-in`,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round'
              }
            }}
          />
        </Box>

        {/* Loading text */}
        <Typography
          variant={isMobile ? "body1" : "h6"}
          sx={{
            color: '#F0B90B',
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          {message}
        </Typography>

        {/* Subtitle - hidden on mobile */}
        {!isMobile && (
          <Typography
            variant="body2"
            sx={{
              color: '#848E9C',
              mt: 1,
              textAlign: 'center'
            }}
          >
            Please wait...
          </Typography>
        )}
      </Box>
    );
  }

  // Simple, fast variant
  return (
    <Box sx={containerSx}>
      <CircularProgress
        size={loaderSize}
        thickness={4}
        sx={{
          color: '#F0B90B',
          mb: { xs: 1, sm: 2 },
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round'
          }
        }}
      />
      <Typography
        variant={isMobile ? "body2" : "body1"}
        sx={{
          color: '#848E9C',
          textAlign: 'center',
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}

export default ModernLoader;
