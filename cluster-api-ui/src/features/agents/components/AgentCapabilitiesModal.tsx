import React from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Agent } from '../types';

interface AgentCapabilitiesModalProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  borderRadius: '8px',
  boxShadow: 24,
  p: 3,
};

export const AgentCapabilitiesModal: React.FC<AgentCapabilitiesModalProps> = ({ open, onClose, agent }) => {
  if (!agent) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="agent-capabilities-modal-title"
      aria-describedby="agent-capabilities-modal-description"
    >
      <Box sx={modalStyle}>
        <Typography id="agent-capabilities-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          {agent.name} - Capabilities
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <Divider sx={{ mb: 2 }} />
        <Box id="agent-capabilities-modal-description" sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {agent.capabilities && agent.capabilities.length > 0 ? (
            <List>
              {agent.capabilities.map((cap) => (
                <ListItem key={cap.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={<Typography variant="subtitle1">{cap.name}</Typography>}
                    secondary={cap.description || 'No description available.'}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              No capabilities configured for this agent.
            </Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
};
