import React, { useState, useEffect, useRef } from 'react';
import './SupportTickets.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  agent_tier?: 'L1' | 'L2' | 'L3';
  metadata?: {
    escalation_reason?: string;
    diagnostic_results?: any;
    code_fixes?: string[];
    pagerduty_incident?: string;
  };
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  current_tier: 'L1' | 'L2' | 'L3';
  created_at: Date;
  updated_at: Date;
  messages: Message[];
  pagerduty_incident?: string;
  assigned_agent?: string;
}

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTickets = async () => {
    try {
      const response = await fetch('/api/support/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const createTicket = async () => {
    if (!newTicketForm.title.trim() || !newTicketForm.description.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTicketForm.title,
          description: newTicketForm.description,
          priority: newTicketForm.priority,
          user_id: 'current_user' // In real app, get from auth
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadTickets();
        setShowNewTicketModal(false);
        setNewTicketForm({ title: '', description: '', priority: 'medium' });
        
        // Auto-select the new ticket
        const newTicket = tickets.find(t => t.id === data.ticket_id);
        if (newTicket) {
          setSelectedTicket(newTicket);
        }
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage,
          user_id: 'current_user'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the selected ticket with new messages
        const updatedTicket = { ...selectedTicket };
        if (data.user_message) {
          updatedTicket.messages.push(data.user_message);
        }
        if (data.agent_response) {
          updatedTicket.messages.push(data.agent_response);
        }
        
        setSelectedTicket(updatedTicket);
        setNewMessage('');
        
        // Update tickets list
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? updatedTicket : t
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const escalateTicket = async (ticketId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadTickets();
        // Refresh selected ticket if it's the one being escalated
        if (selectedTicket?.id === ticketId) {
          const updatedTicket = tickets.find(t => t.id === ticketId);
          if (updatedTicket) {
            setSelectedTicket(updatedTicket);
          }
        }
      }
    } catch (error) {
      console.error('Error escalating ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'L1': return '#17a2b8';
      case 'L2': return '#fd7e14';
      case 'L3': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="support-tickets">
      <div className="tickets-header">
        <h2>Support Tickets</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowNewTicketModal(true)}
        >
          New Ticket
        </button>
      </div>

      <div className="tickets-container">
        {/* Tickets List */}
        <div className="tickets-list">
          <div className="tickets-list-header">
            <h3>Tickets ({tickets.length})</h3>
          </div>
          
          <div className="tickets-items">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className={`ticket-item ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="ticket-header">
                  <span className="ticket-title">{ticket.title}</span>
                  <div className="ticket-badges">
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                    >
                      {ticket.priority.toUpperCase()}
                    </span>
                    <span 
                      className="tier-badge"
                      style={{ backgroundColor: getTierColor(ticket.current_tier) }}
                    >
                      {ticket.current_tier}
                    </span>
                  </div>
                </div>
                
                <div className="ticket-meta">
                  <span className="ticket-status">{ticket.status}</span>
                  <span className="ticket-time">{formatTimestamp(ticket.updated_at)}</span>
                </div>
                
                <div className="ticket-preview">
                  {ticket.description.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="ticket-details">
          {selectedTicket ? (
            <>
              <div className="ticket-details-header">
                <div className="ticket-info">
                  <h3>{selectedTicket.title}</h3>
                  <div className="ticket-meta-details">
                    <span>Status: <strong>{selectedTicket.status}</strong></span>
                    <span>Priority: <strong style={{ color: getPriorityColor(selectedTicket.priority) }}>
                      {selectedTicket.priority.toUpperCase()}
                    </strong></span>
                    <span>Current Tier: <strong style={{ color: getTierColor(selectedTicket.current_tier) }}>
                      {selectedTicket.current_tier}
                    </strong></span>
                    {selectedTicket.pagerduty_incident && (
                      <span>PagerDuty: <strong>{selectedTicket.pagerduty_incident}</strong></span>
                    )}
                  </div>
                </div>
                
                <div className="ticket-actions">
                  {selectedTicket.current_tier !== 'L3' && (
                    <button
                      className="btn btn-warning"
                      onClick={() => escalateTicket(selectedTicket.id)}
                      disabled={isLoading}
                    >
                      Escalate to {selectedTicket.current_tier === 'L1' ? 'L2' : 'L3'}
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {selectedTicket.messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.sender === 'user' ? 'user-message' : 'agent-message'}`}
                  >
                    <div className="message-header">
                      <span className="message-sender">
                        {message.sender === 'user' ? 'You' : `${message.agent_tier} Agent`}
                      </span>
                      <span className="message-time">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <div className="message-content">
                      {message.content}
                    </div>

                    {/* Show metadata for agent messages */}
                    {message.sender === 'agent' && message.metadata && (
                      <div className="message-metadata">
                        {message.metadata.escalation_reason && (
                          <div className="metadata-item">
                            <strong>Escalation Reason:</strong> {message.metadata.escalation_reason}
                          </div>
                        )}
                        
                        {message.metadata.diagnostic_results && (
                          <div className="metadata-item">
                            <strong>Diagnostics:</strong>
                            <pre>{JSON.stringify(message.metadata.diagnostic_results, null, 2)}</pre>
                          </div>
                        )}
                        
                        {message.metadata.code_fixes && message.metadata.code_fixes.length > 0 && (
                          <div className="metadata-item">
                            <strong>Code Fixes Applied:</strong>
                            <ul>
                              {message.metadata.code_fixes.map((fix, index) => (
                                <li key={index}>{fix}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {message.metadata.pagerduty_incident && (
                          <div className="metadata-item">
                            <strong>PagerDuty Incident:</strong> {message.metadata.pagerduty_incident}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <div className="message-input">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={sendMessage}
                    disabled={isLoading || !newMessage.trim()}
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-ticket-selected">
              <h3>Select a ticket to view details</h3>
              <p>Choose a ticket from the list to start viewing the conversation and managing the support case.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Support Ticket</h3>
              <button 
                className="modal-close"
                onClick={() => setShowNewTicketModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={newTicketForm.title}
                  onChange={(e) => setNewTicketForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of the issue"
                />
              </div>
              
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newTicketForm.priority}
                  onChange={(e) => setNewTicketForm(prev => ({ 
                    ...prev, 
                    priority: e.target.value as 'low' | 'medium' | 'high' | 'critical'
                  }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the issue, including steps to reproduce, expected behavior, and any error messages"
                  rows={5}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowNewTicketModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={createTicket}
                disabled={isLoading || !newTicketForm.title.trim() || !newTicketForm.description.trim()}
              >
                {isLoading ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
