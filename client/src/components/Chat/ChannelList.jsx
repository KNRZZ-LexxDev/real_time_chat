import React, { useState, useEffect, useCallback, memo } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Fade
} from '@mui/material';
import {
  Add as AddIcon,
  Tag as TagIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import api from '../../services/api';

// ============ STYLED COMPONENTS ============
const ChannelListContainer = styled(Box)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const HeaderContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const HeaderContent = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ScrollableContent = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
});

const SectionContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.5px',
}));

const StyledListItemButton = styled(ListItemButton)(({ theme, selected }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  transition: 'all 0.3s ease',
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: selected 
      ? theme.palette.action.selected 
      : theme.palette.action.hover,
    transform: 'translateX(4px)',
  },
}));

const ChannelInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
}));

const EmptyState = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4, 2),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const CreateButton = styled(IconButton)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'rotate(90deg)',
  },
}));

// ============ CHANNEL ITEM COMPONENT (Memoized) ============
const ChannelItem = memo(({ channel, isSelected, onClick, showJoinButton, onJoin }) => {
  return (
    <ListItem 
      disablePadding
      secondaryAction={
        showJoinButton && (
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              onJoin(channel.id);
            }}
          >
            Join
          </Button>
        )
      }
    >
      <StyledListItemButton selected={isSelected} onClick={() => onClick(channel)}>
        <ListItemIcon>
          <TagIcon color={isSelected ? 'primary' : 'action'} />
        </ListItemIcon>
        <ListItemText
          primary={channel.name}
          secondary={
            <>
              {channel.description && (
                <Typography variant="caption" display="block">
                  {channel.description}
                </Typography>
              )}
              {showJoinButton && (
                <ChannelInfo>
                  <PeopleIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">
                    {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                  </Typography>
                </ChannelInfo>
              )}
            </>
          }
        />
      </StyledListItemButton>
    </ListItem>
  );
});

ChannelItem.displayName = 'ChannelItem';

// ============ MAIN COMPONENT ============
/**
 * Optimized channel list component with styled components
 * Displays available channels and allows creating/joining them
 */
const ChannelList = ({ selectedChannel, onSelectChannel, onChannelUpdate }) => {
  const [channels, setChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChannels();
    fetchMyChannels();
  }, []);

  /**
   * Fetch all available channels
   */
  const fetchChannels = useCallback(async () => {
    try {
      const response = await api.get('/api/channels');
      setChannels(response.data.channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      setError('Failed to load channels');
    }
  }, []);

  /**
   * Fetch user's joined channels
   */
  const fetchMyChannels = useCallback(async () => {
    try {
      const response = await api.get('/api/channels/my');
      setMyChannels(response.data.channels);
    } catch (error) {
      console.error('Error fetching my channels:', error);
      setError('Failed to load your channels');
    }
  }, []);

  /**
   * Refresh all channel lists
   */
  const refreshChannels = useCallback(() => {
    fetchChannels();
    fetchMyChannels();
  }, [fetchChannels, fetchMyChannels]);

  /**
   * Create a new channel
   */
  const handleCreateChannel = useCallback(async () => {
    if (!newChannel.name.trim()) {
      setError('Channel name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/channels', newChannel);
      const createdChannel = response.data.channel;

      setOpenDialog(false);
      setNewChannel({ name: '', description: '' });

      setMyChannels(prev => [createdChannel, ...prev]);
      await refreshChannels();

      onSelectChannel(createdChannel);

      if (onChannelUpdate) {
        onChannelUpdate();
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError(error.response?.data?.error || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  }, [newChannel, refreshChannels, onSelectChannel, onChannelUpdate]);

  /**
   * Join an existing channel
   */
  const handleJoinChannel = useCallback(async (channelId) => {
    try {
      await api.post(`/api/channels/${channelId}/join`);

      const channel = channels.find(c => c.id === channelId);
      
      if (channel) {
        setMyChannels(prev => [...prev, channel]);
        setChannels(prev => prev.map(c => 
          c.id === channelId ? { ...c, is_member: true, member_count: c.member_count + 1 } : c
        ));

        onSelectChannel(channel);
      }

      await refreshChannels();

      if (onChannelUpdate) {
        onChannelUpdate();
      }
    } catch (error) {
      console.error('Error joining channel:', error);
      setError(error.response?.data?.error || 'Failed to join channel');
      refreshChannels();
    }
  }, [channels, refreshChannels, onSelectChannel, onChannelUpdate]);

  /**
   * Handle dialog close
   */
  const handleCloseDialog = useCallback(() => {
    if (!loading) {
      setOpenDialog(false);
      setNewChannel({ name: '', description: '' });
      setError('');
    }
  }, [loading]);

  const availableChannels = channels.filter(c => !c.is_member);

  return (
    <ChannelListContainer>
      {/* Header */}
      <HeaderContainer>
        <HeaderContent>
          <Typography variant="h6">Channels</Typography>
          <CreateButton
            color="primary"
            onClick={() => setOpenDialog(true)}
            title="Create Channel"
          >
            <AddIcon />
          </CreateButton>
        </HeaderContent>
        {error && (
          <Fade in={!!error}>
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>
              {error}
            </Alert>
          </Fade>
        )}
      </HeaderContainer>

      {/* Channel Lists */}
      <ScrollableContent>
        {/* My Channels */}
        <SectionContainer>
          <SectionTitle color="text.secondary">
            MY CHANNELS ({myChannels.length})
          </SectionTitle>
          <List dense>
            {myChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isSelected={selectedChannel?.id === channel.id}
                onClick={onSelectChannel}
              />
            ))}
            {myChannels.length === 0 && (
              <EmptyState>
                <Typography variant="body2">
                  No channels joined yet
                </Typography>
              </EmptyState>
            )}
          </List>
        </SectionContainer>

        <Divider />

        {/* Available Channels */}
        <SectionContainer>
          <SectionTitle color="text.secondary">
            AVAILABLE CHANNELS ({availableChannels.length})
          </SectionTitle>
          <List dense>
            {availableChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isSelected={false}
                onClick={() => {}}
                showJoinButton
                onJoin={handleJoinChannel}
              />
            ))}
          </List>
        </SectionContainer>
      </ScrollableContent>

      {/* Create Channel Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm" 
        fullWidth
        TransitionComponent={Fade}
      >
        <DialogTitle>Create New Channel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Channel Name"
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            margin="normal"
            required
            error={!!error && !newChannel.name}
            helperText={!newChannel.name && error ? 'Channel name is required' : ''}
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={newChannel.description}
            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChannel}
            variant="contained"
            disabled={loading || !newChannel.name.trim()}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </ChannelListContainer>
  );
};

export default memo(ChannelList);
