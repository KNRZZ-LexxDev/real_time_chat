import React, { useState, useCallback, memo } from 'react';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Chat as ChatIcon,
  AccountCircle,
  Logout
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ============ STYLED COMPONENTS ============
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  boxShadow: theme.shadows[2],
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.8,
  },
}));

const UserSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const Username = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}));

const UserAvatar = styled(Avatar)(({ theme }) => ({
  width: 36,
  height: 36,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: `2px solid transparent`,
  '&:hover': {
    transform: 'scale(1.1)',
    border: `2px solid ${theme.palette.primary.light}`,
  },
}));

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    marginTop: theme.spacing(1),
    minWidth: 180,
    boxShadow: theme.shadows[4],
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

// ============ MAIN COMPONENT ============
/**
 * Optimized navigation bar component
 * Displays app branding and user menu
 */
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    handleClose();
  }, [logout, navigate, handleClose]);

  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <StyledAppBar position="static">
      <Toolbar>
        <LogoContainer onClick={handleLogoClick}>
          <ChatIcon />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Real-Time Chat
          </Typography>
        </LogoContainer>

        <Box sx={{ flexGrow: 1 }} />

        {user && (
          <UserSection>
            <Username variant="body1">{user.username}</Username>
            <IconButton onClick={handleMenu} size="large" color="inherit">
              <UserAvatar sx={{ bgcolor: user.avatarColor || '#1976d2' }}>
                {user.username?.charAt(0).toUpperCase()}
              </UserAvatar>
            </IconButton>
            <StyledMenu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <StyledMenuItem onClick={handleClose}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Profile
              </StyledMenuItem>
              <Divider />
              <StyledMenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </StyledMenuItem>
            </StyledMenu>
          </UserSection>
        )}
      </Toolbar>
    </StyledAppBar>
  );
};

export default memo(Navbar);
