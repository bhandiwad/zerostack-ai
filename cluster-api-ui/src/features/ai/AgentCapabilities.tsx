import React, { useState, useEffect } from 'react';
import './AgentCapabilities.css';

interface Capability {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  version: string;
  lastUpdated: string;
  actions: string[];
  parameters: any[];
}

const AgentCapabilities: React.FC = () => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for all existing agent capabilities
    const mockCapabilities: Capability[] = [
      {
        id: 'cluster_management',
        name: 'Cluster Management',
        description: 'Manages Kubernetes clusters, nodes, and resources with automated operations',
        type: 'Infrastructure',
        status: 'active',
        version: '2.1.0',
        lastUpdated: '2024-01-15T10:30:00Z',
        actions: ['create_cluster', 'delete_cluster', 'scale_nodes', 'drain_node', 'cordon_node'],
        parameters: ['cluster_name', 'node_count', 'instance_type']
      },
      {
        id: 'monitoring',
        name: 'Monitoring & Metrics',
        description: 'Collects and analyzes cluster metrics, health checks, and performance data',
        type: 'Observability',
        status: 'active',
        version: '1.8.3',
        lastUpdated: '2024-01-14T15:45:00Z',
        actions: ['collect_metrics', 'health_check', 'alert_management', 'dashboard_update'],
        parameters: ['metric_interval', 'alert_thresholds', 'retention_period']
      },
      {
        id: 'automation',
        name: 'Task Automation',
        description: 'Automates routine tasks, workflows, and operational procedures',
        type: 'Operations',
        status: 'active',
        version: '3.0.1',
        lastUpdated: '2024-01-13T09:20:00Z',
        actions: ['schedule_task', 'execute_workflow', 'rollback_changes', 'validate_config'],
        parameters: ['schedule_cron', 'workflow_template', 'approval_required']
      },
      {
        id: 'suggestions',
        name: 'AI Suggestions',
        description: 'Provides intelligent recommendations and optimization suggestions',
        type: 'Intelligence',
        status: 'active',
        version: '2.5.0',
        lastUpdated: '2024-01-12T14:10:00Z',
        actions: ['analyze_cluster', 'recommend_optimizations', 'cost_analysis', 'security_review'],
        parameters: ['analysis_depth', 'recommendation_type', 'cost_threshold']
      },
      {
        id: 'security_scanning',
        name: 'Security Scanning',
        description: 'Performs security scans, vulnerability assessments, and compliance checks',
        type: 'Security',
        status: 'active',
        version: '1.9.2',
        lastUpdated: '2024-01-11T11:30:00Z',
        actions: ['vulnerability_scan', 'compliance_check', 'policy_validation', 'security_report'],
        parameters: ['scan_depth', 'compliance_framework', 'report_format']
      },
      {
        id: 'auto_scaling',
        name: 'Auto Scaling',
        description: 'Intelligent auto-scaling with predictive analytics and ML-based forecasting',
        type: 'Infrastructure',
        status: 'active',
        version: '2.2.0',
        lastUpdated: '2024-01-10T16:00:00Z',
        actions: ['scale_up', 'scale_down', 'predict_load', 'optimize_resources'],
        parameters: ['min_replicas', 'max_replicas', 'target_cpu', 'prediction_window']
      },
      {
        id: 'support_l1',
        name: 'L1 Support Agent',
        description: 'First-level support with FAQ handling and basic troubleshooting',
        type: 'Support',
        status: 'active',
        version: '1.5.0',
        lastUpdated: '2024-01-09T13:15:00Z',
        actions: ['handle_faq', 'basic_troubleshoot', 'escalate_ticket', 'knowledge_search'],
        parameters: ['escalation_keywords', 'response_templates', 'knowledge_base']
      },
      {
        id: 'support_l2',
        name: 'L2 Support Agent',
        description: 'Advanced technical support with log analysis and diagnostics',
        type: 'Support',
        status: 'active',
        version: '1.7.1',
        lastUpdated: '2024-01-08T10:45:00Z',
        actions: ['analyze_logs', 'diagnose_issues', 'technical_analysis', 'escalate_l3'],
        parameters: ['log_retention', 'analysis_patterns', 'diagnostic_tools']
      },
      {
        id: 'support_l3',
        name: 'L3 Support Agent',
        description: 'Expert-level support with automated code fixes and advanced troubleshooting',
        type: 'Support',
        status: 'active',
        version: '2.0.0',
        lastUpdated: '2024-01-07T12:30:00Z',
        actions: ['code_analysis', 'automated_fixes', 'expert_diagnosis', 'pagerduty_escalation'],
        parameters: ['fix_templates', 'approval_workflow', 'rollback_strategy']
      },
      {
        id: 'logging',
        name: 'Logging & Audit',
        description: 'Centralized logging, audit trails, and compliance reporting',
        type: 'Observability',
        status: 'active',
        version: '1.6.0',
        lastUpdated: '2024-01-06T14:20:00Z',
        actions: ['collect_logs', 'audit_trail', 'compliance_report', 'log_analysis'],
        parameters: ['log_level', 'retention_policy', 'audit_scope']
      },
      {
        id: 'backup',
        name: 'Backup & Recovery',
        description: 'Automated backup operations and disaster recovery procedures',
        type: 'Operations',
        status: 'active',
        version: '1.4.2',
        lastUpdated: '2024-01-05T09:10:00Z',
        actions: ['create_backup', 'restore_data', 'verify_backup', 'schedule_backup'],
        parameters: ['backup_schedule', 'retention_days', 'storage_location']
      },
      {
        id: 'agent_training',
        name: 'Agent Training',
        description: 'Manages agent training data, personalizations, and knowledge base',
        type: 'Intelligence',
        status: 'active',
        version: '1.2.0',
        lastUpdated: '2024-01-04T11:50:00Z',
        actions: ['upload_training_data', 'create_personalization', 'train_agent', 'search_knowledge'],
        parameters: ['training_type', 'personalization_config', 'knowledge_scope']
      }
    ];

    setCapabilities(mockCapabilities);
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'inactive': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Infrastructure': return '🏗️';
      case 'Observability': return '👁️';
      case 'Operations': return '⚙️';
      case 'Intelligence': return '🧠';
      case 'Security': return '🔒';
      case 'Support': return '🎫';
      default: return '🔧';
    }
  };

  if (loading) {
    return <div className="capabilities-loading">Loading capabilities...</div>;
  }

  return (
    <div className="agent-capabilities">
      <div className="capabilities-header">
        <h2>🔧 Agent Capabilities</h2>
        <p>Manage and monitor all available agent capabilities</p>
      </div>

      <div className="capabilities-content">
        <div className="capabilities-grid">
          {capabilities.map((capability) => (
            <div 
              key={capability.id} 
              className={`capability-card ${selectedCapability?.id === capability.id ? 'selected' : ''}`}
              onClick={() => setSelectedCapability(capability)}
            >
              <div className="capability-header">
                <div className="capability-icon">
                  {getTypeIcon(capability.type)}
                </div>
                <div className="capability-info">
                  <h3>{capability.name}</h3>
                  <span className="capability-type">{capability.type}</span>
                </div>
                <div 
                  className="capability-status"
                  style={{ backgroundColor: getStatusColor(capability.status) }}
                >
                  {capability.status}
                </div>
              </div>
              <p className="capability-description">{capability.description}</p>
              <div className="capability-meta">
                <span className="capability-version">v{capability.version}</span>
                <span className="capability-actions">{capability.actions.length} actions</span>
              </div>
            </div>
          ))}
        </div>

        {selectedCapability && (
          <div className="capability-details">
            <div className="details-header">
              <h3>{getTypeIcon(selectedCapability.type)} {selectedCapability.name}</h3>
              <div 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(selectedCapability.status) }}
              >
                {selectedCapability.status}
              </div>
            </div>
            
            <div className="details-content">
              <div className="detail-section">
                <h4>Description</h4>
                <p>{selectedCapability.description}</p>
              </div>

              <div className="detail-section">
                <h4>Available Actions</h4>
                <div className="actions-list">
                  {selectedCapability.actions.map((action, index) => (
                    <span key={index} className="action-tag">{action}</span>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h4>Configuration Parameters</h4>
                <div className="parameters-list">
                  {selectedCapability.parameters.map((param, index) => (
                    <span key={index} className="parameter-tag">{param}</span>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h4>Metadata</h4>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Version:</span>
                    <span className="metadata-value">{selectedCapability.version}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Type:</span>
                    <span className="metadata-value">{selectedCapability.type}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Last Updated:</span>
                    <span className="metadata-value">
                      {new Date(selectedCapability.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCapabilities;
