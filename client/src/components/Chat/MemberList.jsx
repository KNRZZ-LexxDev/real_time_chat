import React, { useState, useEffect, useCallback, memo } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  RemoveCircleOutline as RemoveIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import socketService from '../../services/socket';

// ============ STYLED COMPONENTS ============
const MemberListContainer = styled(Box)({
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

const MemberItem = styled(ListItem)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const MemberAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  border: `2px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[2],
}));

const MemberInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const ScrollableList = styled(Box)({
  flex: 1,
  overflowY: 'auto',
});

const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  padding: 32,
});

// ============ MEMBER ITEM COMPONENT (Memoized) ============
const MemberItemComponent = memo(({ 
  member, 
  isCreator, 
  isCurrentUser, 
  canRemove, 
  onRemove 
}) => {
  return (
    <MemberItem
      secondaryAction={
        canRemove && (
          <IconButton
            edge="end"
            color="error"
            onClick={() => onRemove(member)}
            title="Remove member"
          >
            <RemoveIcon />
          </IconButton>
        )
      }
    >
      <ListItemAvatar>
        <MemberAvatar sx={{ bgcolor: member.avatar_color || '#1976d2' }}>
          {member.username.charAt(0).toUpperCase()}
        </MemberAvatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <MemberInfo>
            <Typography variant="body1">
              {member.username}
              {isCurrentUser && ' (You)'}
            </Typography>
            {member.is_creator && (
              <Chip label="Creator" size="small" color="primary" />
            )}
          </MemberInfo>
        }
        secondary={`Joined ${new Date(member.joined_at).toLocaleDateString()}`}
      />
    </MemberItem>
  );
});

MemberItemComponent.displayName = 'MemberItemComponent';

// ============ MAIN COMPONENT ============
/**
 * Optimized member list component with styled components
 * Displays channel members with search and removal functionality
 */
const MemberList = ({ channelId, channelCreatorId, onMemberRemoved }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeDialog, setRemoveDialog] = useState({ open: false, member: null });
  const [loading, setLoading] = useState(true);

  const isCreator = user?.id === channelCreatorId;

  /**
   * Fetch channel members
   */
  const fetchMembers = useCallback(async () => {
    if (!channelId) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/channels/${channelId}/members`);
      setMembers(response.data.members);
      console.log('✅ Loaded members:', response.data.members.length);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /**
   * Remove user from channel
   */
  const handleRemoveMember = useCallback(async () => {
    const { member } = removeDialog;
    if (!member) return;

    try {
      await api.delete(`/api/channels/${channelId}/members/${member.id}`);
      
      setMembers(prev => prev.filter(m => m.id !== member.id));

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('kick_user_from_channel', {
          channelId,
          kickedUserId: member.id
        });
      }

      if (onMemberRemoved) {
        onMemberRemoved(member.id);
      }

      setRemoveDialog({ open: false, member: null });
    } catch (error) {
      console.error('Error removing member:', error);
      fetchMembers();
    }
  }, [removeDialog, channelId, onMemberRemoved, fetchMembers]);

  /**
   * Open remove confirmation dialog
   */
  const handleOpenRemoveDialog = useCallback((member) => {
    setRemoveDialog({ open: true, member });
  }, []);

  /**
   * Close remove dialog
   */
  const handleCloseRemoveDialog = useCallback(() => {
    setRemoveDialog({ open: false, member: null });
  }, []);

  /**
   * Filter members by search query
   */
  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <MemberListContainer>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </MemberListContainer>
    );
  }

  return (
    <MemberListContainer>
      {/* Header */}
      <HeaderContainer>
        <Typography variant="h6" gutterBottom>
          Members ({members.length})
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </HeaderContainer>

      {/* Members list */}
      <ScrollableList>
        <List>
          {filteredMembers.map((member) => (
            <MemberItemComponent
              key={member.id}
              member={member}
              isCreator={member.is_creator}
              isCurrentUser={member.id === user?.id}
              canRemove={isCreator && !member.is_creator && member.id !== user?.id}
              onRemove={handleOpenRemoveDialog}
            />
          ))}
        </List>
      </ScrollableList>

      {/* Remove confirmation dialog */}
      <Dialog
        open={removeDialog.open}
        onClose={handleCloseRemoveDialog}
        TransitionComponent={Fade}
      >
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <strong>{removeDialog.member?.username}</strong> from
            this channel? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveDialog}>Cancel</Button>
          <Button onClick={handleRemoveMember} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </MemberListContainer>
  );
};

export default memo(MemberList);
