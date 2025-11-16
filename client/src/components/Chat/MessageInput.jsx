import React, { useState, useRef, useCallback, memo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, TextField, IconButton, Paper } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

// ============ STYLED COMPONENTS ============
const InputContainer = styled(Paper)(({ theme, disabled }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  gap: theme.spacing(1),
  backgroundColor: disabled 
    ? theme.palette.action.disabledBackground 
    : theme.palette.background.paper,
  transition: 'background-color 0.3s ease',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(3),
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: theme.shadows[2],
    },
    '&.Mui-focused': {
      boxShadow: theme.shadows[4],
    },
  },
}));

const SendButton = styled(IconButton)(({ theme }) => ({
  alignSelf: 'flex-end',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

// ============ MAIN COMPONENT ============
/**
 * Optimized message input component with styled components
 * Handles message composition, sending, and typing indicators
 */
const MessageInput = ({ onSendMessage, onTyping, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  /**
   * Handle input change with typing indicator
   */
  const handleChange = useCallback((e) => {
    if (disabled) return;

    const value = e.target.value;
    setMessage(value);

    // Emit typing start
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  }, [disabled, isTyping, onTyping]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (disabled || !message.trim()) return;

    onSendMessage(message.trim());
    setMessage('');
    setIsTyping(false);
    onTyping(false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [disabled, message, onSendMessage, onTyping]);

  /**
   * Handle Enter key press (Shift+Enter for new line)
   */
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <InputContainer 
      component="form" 
      onSubmit={handleSubmit}
      elevation={3}
      disabled={disabled}
    >
      <StyledTextField
        fullWidth
        placeholder={disabled ? "You cannot send messages" : "Type your message... (Shift+Enter for new line)"}
        value={message}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        variant="outlined"
        size="small"
        autoComplete="off"
        multiline
        maxRows={4}
        disabled={disabled}
      />
      <SendButton
        type="submit"
        color="primary"
        disabled={!message.trim() || disabled}
      >
        <SendIcon />
      </SendButton>
    </InputContainer>
  );
};

export default memo(MessageInput);
