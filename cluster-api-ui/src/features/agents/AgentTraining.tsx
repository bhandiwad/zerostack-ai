import React, { useState, useEffect } from 'react';
import './AgentTraining.css';

interface TrainingData {
  data_id: string;
  title: string;
  data_type: 'conversation' | 'document' | 'faq' | 'troubleshooting_guide' | 'code_snippet' | 'configuration';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  tags: string[];
}

interface AgentPersonalization {
  agent_id: string;
  user_id: string;
  preferences: Record<string, any>;
  custom_knowledge: string[];
  response_style: string;
  specialized_domains: string[];
  created_at: string;
  updated_at: string;
}

const AgentTraining: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'data' | 'personalization' | 'search'>('upload');
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [personalizations, setPersonalizations] = useState<AgentPersonalization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    data_type: 'document' as TrainingData['data_type'],
    content: '',
    tags: '',
    metadata: '{}'
  });

  // Personalization form state
  const [personalizationForm, setPersonalizationForm] = useState({
    agent_id: '',
    response_style: 'professional',
    specialized_domains: '',
    preferences: '{"detail_level": "medium", "tone": "helpful"}'
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    loadTrainingData();
    loadPersonalizations();
  }, []);

  const loadTrainingData = async () => {
    try {
      const response = await fetch('/api/agents/training/data?user_id=current_user');
      if (response.ok) {
        const data = await response.json();
        setTrainingData(data.training_data || []);
      }
    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  const loadPersonalizations = async () => {
    try {
      const response = await fetch('/api/agents/personalizations?user_id=current_user');
      if (response.ok) {
        const data = await response.json();
        setPersonalizations(data.personalizations || []);
      }
    } catch (error) {
      console.error('Error loading personalizations:', error);
    }
  };

  const uploadTrainingData = async () => {
    if (!uploadForm.title.trim() || !uploadForm.content.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/training/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'current_user',
          title: uploadForm.title,
          data_type: uploadForm.data_type,
          content: uploadForm.content,
          tags: uploadForm.tags.split(',').map(t => t.trim()).filter(t => t),
          metadata: uploadForm.metadata ? JSON.parse(uploadForm.metadata) : {}
        }),
      });

      if (response.ok) {
        await loadTrainingData();
        setUploadForm({
          title: '',
          data_type: 'document',
          content: '',
          tags: '',
          metadata: '{}'
        });
        setActiveTab('data');
      }
    } catch (error) {
      console.error('Error uploading training data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTrainingData = async (dataId: string) => {
    if (!confirm('Are you sure you want to delete this training data?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/agents/training/data/${dataId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: 'current_user' }),
      });

      if (response.ok) {
        await loadTrainingData();
      }
    } catch (error) {
      console.error('Error deleting training data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createPersonalization = async () => {
    if (!personalizationForm.agent_id.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/personalization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: personalizationForm.agent_id,
          user_id: 'current_user',
          response_style: personalizationForm.response_style,
          specialized_domains: personalizationForm.specialized_domains.split(',').map(d => d.trim()).filter(d => d),
          preferences: JSON.parse(personalizationForm.preferences)
        }),
      });

      if (response.ok) {
        await loadPersonalizations();
        setPersonalizationForm({
          agent_id: '',
          response_style: 'professional',
          specialized_domains: '',
          preferences: '{"detail_level": "medium", "tone": "helpful"}'
        });
      }
    } catch (error) {
      console.error('Error creating personalization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trainAgent = async (agentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          user_id: 'current_user'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Agent trained successfully with ${data.data_points_used} data points!`);
        await loadPersonalizations();
      }
    } catch (error) {
      console.error('Error training agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchKnowledge = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 'current_user',
          query: searchQuery,
          limit: 10
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error searching knowledge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'processing': return '#ffc107';
      case 'failed': return '#dc3545';
      case 'pending': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getDataTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation': return '💬';
      case 'document': return '📄';
      case 'faq': return '❓';
      case 'troubleshooting_guide': return '🔧';
      case 'code_snippet': return '💻';
      case 'configuration': return '⚙️';
      default: return '📄';
    }
  };

  return (
    <div className="agent-training">
      <div className="training-header">
        <h2>Agent Training & Customization</h2>
        <p>Train agents with your custom data and personalize their behavior</p>
      </div>

      <div className="training-tabs">
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Data
        </button>
        <button
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          Training Data ({trainingData.length})
        </button>
        <button
          className={`tab ${activeTab === 'personalization' ? 'active' : ''}`}
          onClick={() => setActiveTab('personalization')}
        >
          Personalizations ({personalizations.length})
        </button>
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search Knowledge
        </button>
      </div>

      <div className="training-content">
        {/* Upload Data Tab */}
        {activeTab === 'upload' && (
          <div className="upload-section">
            <h3>Upload Training Data</h3>
            <p>Upload documents, conversations, FAQs, or other content to train your agents.</p>
            
            <div className="upload-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Give your training data a descriptive title"
                  />
                </div>
                
                <div className="form-group">
                  <label>Data Type</label>
                  <select
                    value={uploadForm.data_type}
                    onChange={(e) => setUploadForm(prev => ({ 
                      ...prev, 
                      data_type: e.target.value as TrainingData['data_type']
                    }))}
                  >
                    <option value="document">Document</option>
                    <option value="conversation">Conversation</option>
                    <option value="faq">FAQ</option>
                    <option value="troubleshooting_guide">Troubleshooting Guide</option>
                    <option value="code_snippet">Code Snippet</option>
                    <option value="configuration">Configuration</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Paste your content here..."
                  rows={10}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="kubernetes, deployment, troubleshooting"
                  />
                </div>
                
                <div className="form-group">
                  <label>Metadata (JSON)</label>
                  <input
                    type="text"
                    value={uploadForm.metadata}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, metadata: e.target.value }))}
                    placeholder='{"source": "documentation", "version": "1.0"}'
                  />
                </div>
              </div>
              
              <button
                className="btn btn-primary"
                onClick={uploadTrainingData}
                disabled={isLoading || !uploadForm.title.trim() || !uploadForm.content.trim()}
              >
                {isLoading ? 'Uploading...' : 'Upload Training Data'}
              </button>
            </div>
          </div>
        )}

        {/* Training Data Tab */}
        {activeTab === 'data' && (
          <div className="data-section">
            <h3>Your Training Data</h3>
            
            <div className="data-grid">
              {trainingData.map(data => (
                <div key={data.data_id} className="data-card">
                  <div className="data-header">
                    <div className="data-type">
                      <span className="data-icon">{getDataTypeIcon(data.data_type)}</span>
                      <span className="data-type-text">{data.data_type.replace('_', ' ')}</span>
                    </div>
                    <div className="data-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteTrainingData(data.data_id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <h4>{data.title}</h4>
                  
                  <div className="data-meta">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(data.status) }}
                    >
                      {data.status}
                    </span>
                    <span className="data-date">
                      {new Date(data.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {data.tags.length > 0 && (
                    <div className="data-tags">
                      {data.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {trainingData.length === 0 && (
                <div className="empty-state">
                  <p>No training data uploaded yet.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab('upload')}
                  >
                    Upload Your First Data
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Personalization Tab */}
        {activeTab === 'personalization' && (
          <div className="personalization-section">
            <h3>Agent Personalizations</h3>
            
            <div className="personalization-form">
              <h4>Create New Personalization</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Agent ID</label>
                  <select
                    value={personalizationForm.agent_id}
                    onChange={(e) => setPersonalizationForm(prev => ({ 
                      ...prev, 
                      agent_id: e.target.value 
                    }))}
                  >
                    <option value="">Select an agent...</option>
                    <option value="support_l1">L1 Support Agent</option>
                    <option value="support_l2">L2 Support Agent</option>
                    <option value="support_l3">L3 Support Agent</option>
                    <option value="cluster_management">Cluster Management Agent</option>
                    <option value="monitoring">Monitoring Agent</option>
                    <option value="security_scanning">Security Agent</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Response Style</label>
                  <select
                    value={personalizationForm.response_style}
                    onChange={(e) => setPersonalizationForm(prev => ({ 
                      ...prev, 
                      response_style: e.target.value 
                    }))}
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                    <option value="concise">Concise</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Specialized Domains (comma-separated)</label>
                <input
                  type="text"
                  value={personalizationForm.specialized_domains}
                  onChange={(e) => setPersonalizationForm(prev => ({ 
                    ...prev, 
                    specialized_domains: e.target.value 
                  }))}
                  placeholder="kubernetes, docker, networking, security"
                />
              </div>
              
              <div className="form-group">
                <label>Preferences (JSON)</label>
                <textarea
                  value={personalizationForm.preferences}
                  onChange={(e) => setPersonalizationForm(prev => ({ 
                    ...prev, 
                    preferences: e.target.value 
                  }))}
                  placeholder='{"detail_level": "high", "include_examples": true, "tone": "helpful"}'
                  rows={3}
                />
              </div>
              
              <button
                className="btn btn-primary"
                onClick={createPersonalization}
                disabled={isLoading || !personalizationForm.agent_id}
              >
                {isLoading ? 'Creating...' : 'Create Personalization'}
              </button>
            </div>
            
            <div className="personalizations-list">
              <h4>Existing Personalizations</h4>
              
              {personalizations.map(personalization => (
                <div key={`${personalization.agent_id}_${personalization.user_id}`} className="personalization-card">
                  <div className="personalization-header">
                    <h5>{personalization.agent_id.replace('_', ' ').toUpperCase()}</h5>
                    <div className="personalization-actions">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => trainAgent(personalization.agent_id)}
                        disabled={isLoading}
                      >
                        Train Agent
                      </button>
                    </div>
                  </div>
                  
                  <div className="personalization-details">
                    <div className="detail-item">
                      <strong>Response Style:</strong> {personalization.response_style}
                    </div>
                    <div className="detail-item">
                      <strong>Specialized Domains:</strong> {personalization.specialized_domains.join(', ') || 'None'}
                    </div>
                    <div className="detail-item">
                      <strong>Custom Knowledge:</strong> {personalization.custom_knowledge.length} data points
                    </div>
                    <div className="detail-item">
                      <strong>Last Updated:</strong> {new Date(personalization.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {personalizations.length === 0 && (
                <div className="empty-state">
                  <p>No personalizations created yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="search-section">
            <h3>Search Your Knowledge Base</h3>
            
            <div className="search-form">
              <div className="search-input">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your training data..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      searchKnowledge();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={searchKnowledge}
                  disabled={isLoading || !searchQuery.trim()}
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            
            <div className="search-results">
              {searchResults.map((result, index) => (
                <div key={result.data_id || index} className="search-result">
                  <div className="result-header">
                    <h4>{result.title}</h4>
                    <div className="result-meta">
                      <span className="result-type">{getDataTypeIcon(result.data_type)} {result.data_type}</span>
                      <span className="result-score">Score: {result.relevance_score}</span>
                    </div>
                  </div>
                  
                  <div className="result-content">
                    {result.content}
                  </div>
                  
                  {result.tags && result.tags.length > 0 && (
                    <div className="result-tags">
                      {result.tags.map((tag: string) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {searchResults.length === 0 && searchQuery && !isLoading && (
                <div className="empty-state">
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentTraining;
