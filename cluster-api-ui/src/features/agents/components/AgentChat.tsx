import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme, styled } from '@mui/material/styles';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Tooltip, 
  List, 
  ListItem, 
  ListItemAvatar, 
  Avatar, 
  Collapse 
} from '@mui/material';
import { 
  Send as SendIcon, 
  Person as UserIcon, 
  SmartToy as AgentIcon, 
  Refresh as RefreshIcon, 
  Close as CloseIcon 
} from '@mui/icons-material';
import { Agent, AgentMessage, Conversation } from '../types';
import { useAgentContext } from '../context/AgentContext';

// Styled components
const MessageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

interface AgentChatProps {
  agent: Agent;
  onClose?: () => void;
  className?: string;
}

const AgentChat: React.FC<AgentChatProps> = ({ agent, onClose, className }) => {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    sendMessage, 
    messages, 
    loadingMessages, 
    currentConversation,
    createConversation,
    selectConversation
  } = useAgentContext();
  
  const [conversation, setConversation] = useState<Conversation | null>(currentConversation);

  useEffect(() => {
    if (!currentConversation && agent) {
      const loadConversation = async () => {
        const newConv = await createConversation(agent.id);
        setConversation(newConv);
        if (newConv) {
          selectConversation(newConv.id);
        }
      };
      loadConversation();
    } else if (currentConversation) {
      setConversation(currentConversation);
    }
  }, [currentConversation, agent, createConversation, selectConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !conversation || isLoading) return;
    
    const messageToSend = message;
    setMessage('');
    setIsLoading(true);
    setError(null);
    
    try {
      setIsTyping(true);
      let dots = '';
      const typingInterval = setInterval(() => {
        dots = dots.length >= 3 ? '' : dots + '.';
        setTypingIndicator(`Agent is typing${dots}`);
      }, 500);
      
      await sendMessage(agent.id, messageToSend, conversation.id);
      
      clearInterval(typingInterval);
      setTypingIndicator('');
      setIsTyping(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', error);
      
      setTypingIndicator('');
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  }, [agent.id, conversation, message, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  const formatMessageTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <MessageContainer className={className}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={2}
        borderBottom={`1px solid ${theme.palette.divider}`}
        bgcolor="background.paper"
      >
        <Box display="flex" alignItems="center">
          <AgentIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">
            {agent.name}
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Refresh">
            <IconButton size="small" color="inherit" onClick={() => window.location.reload()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {onClose && (
            <Tooltip title="Close">
              <IconButton size="small" color="inherit" onClick={onClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Collapse in={!!error}>
        <Alert severity="error" onClose={handleCloseError} sx={{ m: 1 }}>
          {error}
        </Alert>
      </Collapse>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <List>
          {messages.map((msg: AgentMessage, index: number) => (
            <ListItem key={msg.id || index} sx={{ py: 1 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: msg.sender === 'user' ? 'primary.main' : 'secondary.main' }}>
                  {msg.sender === 'user' ? <UserIcon /> : <AgentIcon />}
                </Avatar>
              </ListItemAvatar>
              <Paper 
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: msg.sender === 'user' 
                    ? theme.palette.primary.light
                    : theme.palette.background.default,
                  color: msg.sender === 'user' 
                    ? theme.palette.primary.contrastText
                    : theme.palette.text.primary,
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  wordWrap: 'break-word',
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                  {formatMessageTime(msg.timestamp)}
                </Typography>
              </Paper>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
          {(isTyping || loadingMessages) && (
            <ListItem sx={{ py: 1 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <AgentIcon />
                </Avatar>
              </ListItemAvatar>
              <Box display="flex" alignItems="center">
                <Paper 
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: theme.palette.grey[200],
                    color: theme.palette.text.primary,
                    textAlign: 'left',
                  }}
                >
                  <Box display="flex" alignItems="center">
                    <Box 
                      sx={{
                        display: 'inline-block',
                        '& > div': {
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: theme.palette.text.secondary,
                          margin: '0 2px',
                          animation: 'typing 1.4s infinite ease-in-out',
                          '&:nth-of-type(1)': { animationDelay: '0s' },
                          '&:nth-of-type(2)': { animationDelay: '0.2s' },
                          '&:nth-of-type(3)': { animationDelay: '0.4s' },
                        },
                        '@keyframes typing': {
                          '0%, 60%, 100%': { transform: 'translateY(0)' },
                          '30%': { transform: 'translateY(-4px)' },
                        },
                      }}
                    >
                      <div />
                      <div />
                      <div />
                    </Box>
                    <Typography variant="body2" ml={1}>
                      {typingIndicator || 'Agent is typing'}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </ListItem>
          )}
        </List>
      </Box>

      <Box 
        component="form" 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        display="flex"
        p={2}
        borderTop={`1px solid ${theme.palette.divider}`}
        bgcolor="background.paper"
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            opacity: isTyping ? 1 : 0,
            transition: 'opacity 0.3s ease',
          },
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isTyping}
          inputRef={inputRef}
          InputProps={{
            sx: {
              borderRadius: '24px',
              backgroundColor: theme.palette.background.paper,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              '&.Mui-focused': {
                backgroundColor: theme.palette.background.paper,
              },
            },
            endAdornment: (
              <IconButton
                type="submit"
                color="primary"
                disabled={!message.trim() || isLoading || isTyping}
                sx={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            ),
          }}
        />
      </Box>
    </MessageContainer>
  );
};

export default AgentChat;
