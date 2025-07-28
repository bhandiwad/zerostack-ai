import React, { useState, useRef, useEffect } from 'react';
import { useTheme, styled, keyframes } from '@mui/material/styles';
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
  Paper,
  Avatar,
  Button,
  CircularProgress,
  Collapse,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as UserIcon,
  SmartToy as AgentIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import { Agent, AgentMessage, Conversation } from '../types';
import { useAgents } from '../context/AgentContext';
import { agentService } from '../services/AgentService';

// Animation for message entry
const messageIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components
const MessageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const MessagesList = styled(List)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '3px',
  },
});

const StatusIndicator = styled('span', {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive: boolean }>(({ isActive, theme }) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: isActive ? theme.palette.success.main : theme.palette.grey[400],
  marginRight: '8px',
  display: 'inline-block',
}));

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
    currentConversation, 
    sendMessage, 
    selectConversation,
    loading: isAgentsLoading,
    createConversation,
  } = useAgents();
  
  const [conversation, setConversation] = useState<Conversation | null>(currentConversation);

  // Update local conversation when current conversation changes
  useEffect(() => {
    if (currentConversation) {
      setConversation(currentConversation);
    }
  }, [currentConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation || isLoading) return;
    
    const messageToSend = message;
    setMessage('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Show typing indicator
      setIsTyping(true);
      let dots = '';
      const typingInterval = setInterval(() => {
        dots = dots.length >= 3 ? '' : dots + '.';
        setTypingIndicator(`Agent is typing${dots}`);
      }, 500);
      
      // Send message and wait for response
      const response = await sendMessage(messageToSend, conversation.id);
      
      // Clear typing indicator
      clearInterval(typingInterval);
      setTypingIndicator('');
      setIsTyping(false);
      
      // If this was a new conversation, update the current conversation
      if (response && typeof response === 'object' && 'id' in response && response.id !== conversation.id) {
        const newConversation = await agentService.getConversation(response.id);
        if (newConversation) {
          setConversation(newConversation);
          selectConversation(newConversation.id);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', error);
      
      // Clear typing indicator on error
      setTypingIndicator('');
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Header */}
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

      {/* Messages Area */}
      <Box 
        flexGrow={1} 
        p={2} 
        overflow="auto"
        bgcolor="background.default"
        position="relative"
      >
        {/* Error Alert */}
        <Collapse in={!!error}>
          <Alert 
            severity="error" 
            onClose={handleCloseError}
            sx={{ mb: 2 }}
            icon={<ErrorIcon />}
          >
            {error}
          </Alert>
        </Collapse>
        
        {/* Loading Indicator */}
        {isAgentsLoading && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        <List sx={{ width: '100%', maxWidth: '100%' }}>
          {!conversation?.messages?.length && !isTyping ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
              color="text.secondary"
              textAlign="center"
              p={4}
            >
              <AgentIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Start a conversation with {agent.name}
              </Typography>
              <Typography variant="body2">
                Ask a question or request assistance with your tasks.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={async () => {
                  try {
                    const newConversation = await createConversation(agent.id, `Chat with ${agent.name}`);
                    setConversation(newConversation);
                    selectConversation(newConversation.id);
                  } catch (error) {
                    console.error('Error creating conversation:', error);
                    setError('Failed to create conversation. Please try again.');
                  }
                }}
                startIcon={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                    <StatusIndicator isActive={true} />
                    <span>Start Chatting</span>
                  </Box>
                }
                sx={{ mt: 2 }}
              >
                Start New Chat
              </Button>
            </Box>
          ) : (
            <>
              {conversation?.messages?.map((msg) => (
                <React.Fragment key={msg.id}>
                  <ListItem 
                    alignItems="flex-start"
                    sx={{
                      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                      textAlign: msg.sender === 'user' ? 'right' : 'left',
                    }}
                  >
                    <ListItemAvatar 
                      sx={{
                        minWidth: 40,
                        marginLeft: msg.sender === 'user' ? 1 : 0,
                        marginRight: msg.sender === 'user' ? 0 : 1,
                      }}
                    >
                      {msg.sender === 'user' ? (
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <UserIcon />
                        </Avatar>
                      ) : (
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <AgentIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <Box
                      maxWidth="70%"
                      sx={{
                        ml: msg.sender === 'user' ? 0 : 1,
                        mr: msg.sender === 'user' ? 1 : 0,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: 
                            msg.sender === 'user' 
                              ? theme.palette.primary.main 
                              : theme.palette.grey[200],
                          color: 
                            msg.sender === 'user' 
                              ? theme.palette.primary.contrastText 
                              : theme.palette.text.primary,
                          textAlign: 'left',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body2" component="div">
                          {msg.content}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          display="block" 
                          mt={0.5}
                          sx={{
                            opacity: 0.7,
                            textAlign: 'right',
                            color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                          }}
                        >
                          {formatMessageTime(msg.timestamp)}
                        </Typography>
                      </Paper>
                    </Box>
                  </ListItem>
                  <Box ref={messagesEndRef} />
                </React.Fragment>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <ListItem alignItems="flex-start">
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <AgentIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <Box maxWidth="70%">
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
            </>
          )}
        </List>
      </Box>

      {/* Input Area */}
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
