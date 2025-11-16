import React, { useState, useEffect, useCallback, memo } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MemberList from './MemberList';
import api from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

// ============ STYLED COMPONENTS ============
const ChatRoomContainer = styled(Box)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const HeaderPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'readOnly',
})(({ theme, readOnly }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: readOnly ? theme.palette.error.light : theme.palette.background.paper,
  transition: 'background-color 0.3s ease',
  borderRadius: 0,
}));

const HeaderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const ChannelTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const MainContent = styled(Box)({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
});

const MessagesArea = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const EmptyStateContainer = styled(Box)({
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const MembersDrawer = styled(Drawer)(({ theme }) => ({
  width: 280,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 280,
  },
}));

// ============ MAIN COMPONENT ============
/**
 * Optimized chat room component with styled components
 * Manages real-time messaging and member interactions
 */
const ChatRoom = ({ channel, onBack, onChannelRemoved }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(!isMobile);
  const [notification, setNotification] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });
  const [membersKey, setMembersKey] = useState(0);
  const [canSendMessages, setCanSendMessages] = useState(true);

  /**
   * Load channel messages
   */
  const loadMessages = useCallback(async () => {
    if (!channel) return;

    try {
      const response = await api.get(`/api/channels/${channel.id}/messages`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (error.response?.status === 403) {
        showNotification('You are not a member of this channel', 'error');
        handleForceLeave();
      }
    }
  }, [channel]);

  /**
   * Join channel via socket
   */
  const joinChannel = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket && channel) {
      socket.emit('join_channel', channel.id);
      console.log('✅ Joined channel:', channel.id);
      setCanSendMessages(true);
    }
  }, [channel]);

  /**
   * Leave channel via socket
   */
  const leaveChannel = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket && channel) {
      socket.emit('leave_channel', channel.id);
      console.log('❌ Left channel:', channel.id);
    }
  }, [channel]);

  /**
   * Handle forced removal from channel
   */
  const handleForceLeave = useCallback(() => {
    console.log('🚫 Forced to leave channel:', channel?.id);
    
    setCanSendMessages(false);
    leaveChannel();
    
    if (onChannelRemoved) {
      onChannelRemoved(channel?.id);
    }

    setTimeout(() => {
      onBack();
    }, 2000);
  }, [channel, leaveChannel, onBack, onChannelRemoved]);

  /**
   * Handle new message from socket
   */
  const handleNewMessage = useCallback((message) => {
    console.log('📨 New message received:', message);
    setMessages((prev) => {
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  /**
   * Handle user typing event
   */
  const handleUserTyping = useCallback(({ username, isTyping }) => {
    if (username === user?.username) return;

    if (isTyping) {
      setTypingUsers((prev) =>
        prev.includes(username) ? prev : [...prev, username]
      );
    } else {
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    }
  }, [user]);

  /**
   * Handle user joined notification
   */
  const handleUserJoined = useCallback(({ username }) => {
    if (username !== user?.username) {
      showNotification(`${username} joined the channel`, 'info');
      setMembersKey(prev => prev + 1);
    }
  }, [user]);

  /**
   * Handle user left notification
   */
  const handleUserLeft = useCallback(({ username }) => {
    showNotification(`${username} left the channel`, 'info');
    setMembersKey(prev => prev + 1);
  }, []);

  /**
   * Handle user kicked event
   */
  const handleUserKicked = useCallback(({ userId }) => {
    console.log('🚫 User kicked event:', userId, 'My ID:', user?.id);
    
    if (userId === user?.id) {
      showNotification('You have been removed from this channel', 'error');
      handleForceLeave();
    } else {
      setMembersKey(prev => prev + 1);
    }
  }, [user, handleForceLeave]);

  /**
   * Handle forced leave from server
   */
  const handleForceLeaveEvent = useCallback(({ channelId }) => {
    if (channelId === channel?.id) {
      console.log('🚫 Received force_leave_channel for:', channelId);
      showNotification('You are no longer a member of this channel', 'error');
      handleForceLeave();
    }
  }, [channel, handleForceLeave]);

  /**
   * Handle member removed notification
   */
  const handleMemberRemovedNotification = useCallback(() => {
    setMembersKey(prev => prev + 1);
  }, []);

  /**
   * Handle socket error
   */
  const handleSocketError = useCallback(({ message }) => {
    console.error('Socket error:', message);
    showNotification(message, 'error');
    
    if (message.includes('not a member')) {
      handleForceLeave();
    }
  }, [handleForceLeave]);

  /**
   * Setup socket listeners
   */
  useEffect(() => {
    if (!channel) return;

    loadMessages();
    joinChannel();

    const socket = socketService.getSocket();
    if (!socket) {
      console.error('❌ Socket not connected');
      return;
    }

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('user_kicked', handleUserKicked);
    socket.on('force_leave_channel', handleForceLeaveEvent);
    socket.on('member_removed_notification', handleMemberRemovedNotification);
    socket.on('error', handleSocketError);

    console.log('✅ Socket listeners registered for channel:', channel.id);

    return () => {
      leaveChannel();
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('user_kicked', handleUserKicked);
      socket.off('force_leave_channel', handleForceLeaveEvent);
      socket.off('member_removed_notification', handleMemberRemovedNotification);
      socket.off('error', handleSocketError);
      
      setMessages([]);
      setTypingUsers([]);
      
      console.log('🧹 Cleaned up socket listeners');
    };
  }, [
    channel,
    loadMessages,
    joinChannel,
    leaveChannel,
    handleNewMessage,
    handleUserTyping,
    handleUserJoined,
    handleUserLeft,
    handleUserKicked,
    handleForceLeaveEvent,
    handleMemberRemovedNotification,
    handleSocketError
  ]);

  /**
   * Send message
   */
  const handleSendMessage = useCallback((content) => {
    if (!canSendMessages) {
      showNotification('You cannot send messages in this channel', 'error');
      return;
    }

    const socket = socketService.getSocket();
    if (socket && channel) {
      console.log('📤 Sending message:', content);
      socket.emit('send_message', {
        channelId: channel.id,
        content
      });
    }
  }, [channel, canSendMessages]);

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback((isTyping) => {
    if (!canSendMessages) return;

    const socket = socketService.getSocket();
    if (socket && channel) {
      socket.emit('typing', {
        channelId: channel.id,
        isTyping
      });
    }
  }, [channel, canSendMessages]);

  /**
   * Show notification
   */
  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  /**
   * Handle member removed by creator
   */
  const handleMemberRemovedByCreator = useCallback((removedUserId) => {
    const socket = socketService.getSocket();
    if (socket && channel) {
      socket.emit('kick_user_from_channel', {
        channelId: channel.id,
        kickedUserId: removedUserId
      });
    }
    setMembersKey(prev => prev + 1);
  }, [channel]);

  /**
   * Toggle member drawer
   */
  const toggleMemberDrawer = useCallback(() => {
    setMemberDrawerOpen(prev => !prev);
  }, []);

  /**
   * Close notification
   */
  const handleCloseNotification = useCallback(() => {
    setNotification({ open: false, message: '', severity: 'info' });
  }, []);

  if (!channel) {
    return (
      <EmptyStateContainer>
        <Typography variant="h6" color="text.secondary">
          Select a channel to start chatting 💬
        </Typography>
      </EmptyStateContainer>
    );
  }

  return (
    <ChatRoomContainer>
      {/* Header */}
      <HeaderPaper elevation={2} readOnly={!canSendMessages}>
        <HeaderContent>
          {isMobile && (
            <IconButton onClick={onBack}>
              <MenuIcon />
            </IconButton>
          )}
          <ChannelTitle variant="h6">
            # {channel.name}
            {!canSendMessages && (
              <Typography variant="caption" color="error">
                (Read Only)
              </Typography>
            )}
          </ChannelTitle>
        </HeaderContent>
        <IconButton
          onClick={toggleMemberDrawer}
          color={memberDrawerOpen ? 'primary' : 'default'}
        >
          <PeopleIcon />
        </IconButton>
      </HeaderPaper>

      {/* Main content */}
      <MainContent>
        {/* Messages area */}
        <MessagesArea>
          <MessageList messages={messages} typingUsers={typingUsers} />
          <MessageInput 
            onSendMessage={handleSendMessage} 
            onTyping={handleTyping}
            disabled={!canSendMessages}
          />
        </MessagesArea>

        {/* Members drawer */}
        <MembersDrawer
          anchor="right"
          open={memberDrawerOpen}
          onClose={() => setMemberDrawerOpen(false)}
          variant={isMobile ? 'temporary' : 'persistent'}
        >
          <MemberList 
            key={membersKey}
            channelId={channel.id} 
            channelCreatorId={channel.creator_id}
            onMemberRemoved={handleMemberRemovedByCreator}
          />
        </MembersDrawer>
      </MainContent>

      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={notification.severity} 
          onClose={handleCloseNotification}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ChatRoomContainer>
  );
};

export default memo(ChatRoom);
