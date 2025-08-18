import React, { useState } from 'react';
import WorkflowOrchestrator from './WorkflowOrchestrator';
import WorkflowDesigner from '../../features/ai/WorkflowDesigner';
import WorkflowTester from '../../features/ai/WorkflowTester';
import './WorkflowManagement.css';

const WorkflowManagement = () => {
  const [activeTab, setActiveTab] = useState('templates');

  const tabs = [
    {
      id: 'templates',
      label: 'Quick Actions',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
      </svg>,
      description: 'Execute predefined workflow templates'
    },
    {
      id: 'designer',
      label: 'Custom Designer',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2,2V4H4V2H2M20,2V4H22V2H20M2,10V12H4V10H2M20,10V12H22V10H20M2,18V20H4V18H2M20,18V20H22V18H20M8,2V4H16V2H8M8,18V20H16V18H8M2,6V8H4V6H2M20,6V8H22V6H20M2,14V16H4V14H2M20,14V16H22V14H20M6,2V4H8V2H6M16,2V4H18V2H16M6,18V20H8V18H6M16,18V20H18V18H16M10,2V4H14V2H10M10,18V20H14V18H10Z"/>
      </svg>,
      description: 'Create custom workflows visually'
    },
    {
      id: 'testing',
      label: 'System Testing',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8L10,17Z"/>
      </svg>,
      description: 'Test and debug workflows'
    }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'templates':
        return <WorkflowOrchestrator />;
      case 'designer':
        return <WorkflowDesigner />;
      case 'testing':
        return <WorkflowTester />;
      default:
        return <WorkflowOrchestrator />;
    }
  };

  return (
    <div className="workflow-management">
      <div className="workflow-header">
        <h1 style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '12px'}}>
            <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5A2,2 0 0,0 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,9H14V4H19V9Z"/>
          </svg>
          Workflow Management
        </h1>
        <p>Comprehensive multi-agent workflow orchestration and management</p>
      </div>

      <div className="workflow-tabs">
        <div className="tab-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <div className="tab-content">
                <span className="tab-label">{tab.label}</span>
                <span className="tab-description">{tab.description}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="tab-content-area">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default WorkflowManagement;
