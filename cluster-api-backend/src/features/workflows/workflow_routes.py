"""
LangGraph Workflow Routes
REST API endpoints for advanced multi-agent workflow orchestration
"""

import asyncio
import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify

from .langgraph_orchestrator import langgraph_orchestrator

logger = logging.getLogger(__name__)

workflow_bp = Blueprint('workflows', __name__)

@workflow_bp.route('/workflows/templates', methods=['GET'])
def list_workflow_templates():
    """List all available workflow templates"""
    try:
        templates = langgraph_orchestrator.list_workflow_templates()
        return jsonify({
            'success': True,
            'templates': templates,
            'count': len(templates)
        })
    except Exception as e:
        logger.error(f"Failed to list templates: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/templates/create-defaults', methods=['POST'])
def create_default_templates():
    """Create default workflow templates"""
    try:
        # Initialize orchestrator
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Create default templates
        k8s_template = loop.run_until_complete(
            langgraph_orchestrator.create_kubernetes_troubleshooting_workflow()
        )
        
        optimization_template = loop.run_until_complete(
            langgraph_orchestrator.create_deployment_optimization_workflow()
        )
        
        loop.close()
        
        return jsonify({
            'success': True,
            'templates_created': [k8s_template, optimization_template],
            'message': 'Default workflow templates created successfully'
        })
        
    except Exception as e:
        logger.error(f"Failed to create default templates: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/execute', methods=['POST'])
def execute_workflow():
    """Execute a workflow from template"""
    try:
        data = request.get_json()
        template_id = data.get('template_id')
        input_data = data.get('input_data', {})
        
        if not template_id:
            return jsonify({
                'success': False,
                'error': 'template_id is required'
            }), 400
        
        # Execute workflow
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        workflow_id = loop.run_until_complete(
            langgraph_orchestrator.execute_workflow(template_id, input_data)
        )
        
        loop.close()
        
        return jsonify({
            'success': True,
            'workflow_id': workflow_id,
            'message': 'Workflow execution started'
        })
        
    except Exception as e:
        logger.error(f"Failed to execute workflow: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/<workflow_id>/status', methods=['GET'])
def get_workflow_status(workflow_id):
    """Get status of a specific workflow"""
    try:
        status = langgraph_orchestrator.get_workflow_status(workflow_id)
        
        if not status:
            return jsonify({
                'success': False,
                'error': 'Workflow not found'
            }), 404
        
        return jsonify({
            'success': True,
            'workflow': status
        })
        
    except Exception as e:
        logger.error(f"Failed to get workflow status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/types', methods=['GET'])
def get_workflow_types():
    """Get available workflow types"""
    try:
        workflow_types = [
            {
                'name': 'troubleshooting',
                'description': 'AI-powered Kubernetes troubleshooting workflow',
                'parameters': ['issue_description', 'cluster_context']
            },
            {
                'name': 'optimization',
                'description': 'Cluster resource optimization workflow',
                'parameters': ['optimization_goals', 'resource_constraints']
            },
            {
                'name': 'deployment',
                'description': 'Automated deployment workflow',
                'parameters': ['deployment_config', 'target_environment']
            },
            {
                'name': 'monitoring',
                'description': 'Cluster monitoring and alerting setup',
                'parameters': ['monitoring_scope', 'alert_thresholds']
            }
        ]
        
        return jsonify({
            'success': True,
            'workflow_types': workflow_types,
            'count': len(workflow_types)
        })
        
    except Exception as e:
        logger.error(f"Failed to get workflow types: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/active', methods=['GET'])
def list_active_workflows():
    """List all active workflows"""
    try:
        active_workflows = langgraph_orchestrator.list_active_workflows()
        
        return jsonify({
            'success': True,
            'workflows': active_workflows,
            'count': len(active_workflows)
        })
        
    except Exception as e:
        logger.error(f"Failed to list active workflows: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/design/create', methods=['POST'])
def create_workflow_from_design():
    """Create a LangGraph workflow from visual design"""
    try:
        data = request.get_json()
        workflow_design = data.get('workflow_design')
        
        if not workflow_design:
            return jsonify({
                'success': False,
                'error': 'workflow_design is required'
            }), 400
        
        # Create workflow using LangGraph orchestrator
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        workflow_id = loop.run_until_complete(
            langgraph_orchestrator.create_workflow_from_design(workflow_design)
        )
        
        return jsonify({
            'success': True,
            'workflow_id': workflow_id,
            'message': 'Custom workflow created successfully'
        })
        
    except Exception as e:
        logger.error(f"Failed to create workflow from design: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/design/execute', methods=['POST'])
def execute_custom_workflow():
    """Execute a custom designed workflow"""
    try:
        data = request.get_json()
        workflow_id = data.get('workflow_id')
        input_data = data.get('input_data', {})
        
        if not workflow_id:
            return jsonify({
                'success': False,
                'error': 'workflow_id is required'
            }), 400
        
        # Execute the custom workflow
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        execution_id = loop.run_until_complete(
            langgraph_orchestrator.execute_workflow(workflow_id, input_data)
        )
        
        return jsonify({
            'success': True,
            'execution_id': execution_id,
            'message': 'Custom workflow execution started'
        })
        
    except Exception as e:
        logger.error(f"Failed to execute custom workflow: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@workflow_bp.route('/workflows/initialize', methods=['POST'])
def initialize_orchestrator():
    """Initialize the workflow orchestrator"""
    try:
        # Initialize the orchestrator with default templates
        langgraph_orchestrator.initialize_default_templates()
        
        return jsonify({
            'success': True,
            'message': 'Orchestrator initialized successfully',
            'templates_count': len(langgraph_orchestrator.workflow_templates)
        })
        
    except Exception as e:
        logger.error(f"Failed to initialize orchestrator: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
