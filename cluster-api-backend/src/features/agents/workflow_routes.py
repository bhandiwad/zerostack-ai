"""
Workflow Execution API Routes
Provides REST endpoints for executing and managing LangGraph workflows
"""
from flask import Blueprint, request, jsonify
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import asyncio
from .langgraph_orchestrator import orchestrator, WorkflowStatus

logger = logging.getLogger(__name__)

workflow_bp = Blueprint('workflows', __name__)

@workflow_bp.route('/api/workflows/execute', methods=['POST'])
def execute_workflow():
    """Execute a multi-agent workflow"""
    try:
        data = request.get_json()
        
        workflow_name = data.get('workflow_name', 'support_escalation')
        user_request = data.get('user_request')
        context = data.get('context', {})
        
        if not user_request:
            return jsonify({
                'success': False,
                'error': 'user_request is required'
            }), 400
        
        # Run async workflow execution
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                orchestrator.execute_workflow(workflow_name, user_request, context)
            )
        finally:
            loop.close()
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/api/workflows/status/<workflow_id>', methods=['GET'])
def get_workflow_status(workflow_id: str):
    """Get status of a specific workflow"""
    try:
        status = orchestrator.get_workflow_status(workflow_id)
        
        if 'error' in status:
            return jsonify({
                'success': False,
                'error': status['error']
            }), 404
        
        return jsonify({
            'success': True,
            'workflow': status
        })
        
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/api/workflows/active', methods=['GET'])
def list_active_workflows():
    """List all active workflows"""
    try:
        workflows = orchestrator.list_active_workflows()
        
        return jsonify({
            'success': True,
            'workflows': workflows,
            'count': len(workflows)
        })
        
    except Exception as e:
        logger.error(f"Error listing workflows: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/api/workflows/types', methods=['GET'])
def get_workflow_types():
    """Get available workflow types"""
    try:
        workflow_types = [
            {
                'name': 'support_escalation',
                'display_name': 'Support Escalation',
                'description': 'Multi-level support with L1/L2/L3 escalation',
                'agents': ['coordinator', 'l1_support', 'l2_support', 'l3_support', 'cluster_manager'],
                'use_cases': ['Technical support', 'Troubleshooting', 'Issue resolution']
            },
            {
                'name': 'cluster_operations',
                'display_name': 'Cluster Operations',
                'description': 'Automated cluster management and operations',
                'agents': ['analyzer', 'executor', 'monitor', 'validator'],
                'use_cases': ['Cluster scaling', 'Deployments', 'Configuration changes']
            }
        ]
        
        return jsonify({
            'success': True,
            'workflow_types': workflow_types
        })
        
    except Exception as e:
        logger.error(f"Error getting workflow types: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/api/workflows/initialize', methods=['POST'])
def initialize_orchestrator():
    """Initialize the workflow orchestrator"""
    try:
        # Run async initialization
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(orchestrator.initialize())
        finally:
            loop.close()
        
        return jsonify({
            'success': True,
            'message': 'Orchestrator initialized successfully'
        })
        
    except Exception as e:
        logger.error(f"Error initializing orchestrator: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/api/workflows/test', methods=['POST'])
def test_workflow():
    """Test workflow execution with a simple request"""
    try:
        test_request = "I'm having trouble accessing my Kubernetes dashboard. Can you help?"
        
        # Run async workflow execution
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                orchestrator.execute_workflow('support_escalation', test_request, {'test': True})
            )
        finally:
            loop.close()
        
        return jsonify({
            'success': True,
            'test_result': result,
            'message': 'Workflow test completed'
        })
        
    except Exception as e:
        logger.error(f"Error testing workflow: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
