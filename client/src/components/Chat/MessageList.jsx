import React, { useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

/**
 * Message list component
 * Displays chat messages with auto-scroll
 */
const MessageList = ({ messages, typingUsers }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Check if message is from current user
   */
  const isOwnMessage = (messageUserId) => {
    return messageUserId === user?.id;
  };

  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      {messages.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No messages yet. Start the conversation!
          </Typography>
        </Box>
      ) : (
        messages.map((message) => {
          const isOwn = isOwnMessage(message.user_id);
          
          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                gap: 1,
                alignItems: 'flex-start'
              }}
            >
              {/* Avatar */}
              <Avatar
                sx={{
                  bgcolor: message.avatar_color || '#1976d2',
                  width: 36,
                  height: 36
                }}
              >
                {message.username?.charAt(0).toUpperCase()}
              </Avatar>

              {/* Message content */}
              <Box
                sx={{
                  maxWidth: '60%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start'
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, px: 1 }}
                >
                  {isOwn ? 'You' : message.username}
                </Typography>
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    bgcolor: isOwn ? 'primary.main' : 'background.paper',
                    color: isOwn ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                    wordBreak: 'break-word'
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.8,
                      fontSize: '0.7rem'
                    }}
                  >
                    {formatTime(message.created_at)}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          );
        })
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Typography>
        </Box>
      )}

      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
