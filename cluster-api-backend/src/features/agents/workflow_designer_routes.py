"""
Workflow Designer API Routes
Provides REST endpoints for visual workflow creation, validation, and management
"""
from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any, List
import json
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

workflow_designer_bp = Blueprint('workflow_designer', __name__, url_prefix='/api/workflow-designer')

# In-memory storage for workflows (in production, this would be a database)
saved_workflows = {}
workflow_templates = {
    'support_escalation': {
        'id': 'support_escalation',
        'name': 'Support Escalation',
        'description': 'Automated support ticket escalation workflow',
        'category': 'Support',
        'nodes': [
            {'id': 'start', 'type': 'start', 'position': {'x': 100, 'y': 200}, 'data': {'label': 'Start'}},
            {'id': 'l1', 'type': 'agent', 'position': {'x': 300, 'y': 200}, 'data': {'label': 'L1 Support', 'agentType': 'l1_support'}},
            {'id': 'check', 'type': 'condition', 'position': {'x': 500, 'y': 200}, 'data': {'label': 'Can Resolve?', 'condition': 'resolution_confidence > 0.8'}},
            {'id': 'l2', 'type': 'agent', 'position': {'x': 500, 'y': 350}, 'data': {'label': 'L2 Support', 'agentType': 'l2_support'}},
            {'id': 'end', 'type': 'end', 'position': {'x': 700, 'y': 200}, 'data': {'label': 'End'}}
        ],
        'connections': [
            {'id': 'c1', 'source': 'start', 'target': 'l1'},
            {'id': 'c2', 'source': 'l1', 'target': 'check'},
            {'id': 'c3', 'source': 'check', 'target': 'end'},
            {'id': 'c4', 'source': 'check', 'target': 'l2'},
            {'id': 'c5', 'source': 'l2', 'target': 'end'}
        ],
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    },
    'cluster_deployment': {
        'id': 'cluster_deployment',
        'name': 'Cluster Deployment',
        'description': 'Automated cluster deployment and validation workflow',
        'category': 'Operations',
        'nodes': [
            {'id': 'start', 'type': 'start', 'position': {'x': 100, 'y': 200}, 'data': {'label': 'Start'}},
            {'id': 'validate', 'type': 'action', 'position': {'x': 300, 'y': 200}, 'data': {'label': 'Validate Config', 'action': 'validate_cluster_config'}},
            {'id': 'deploy', 'type': 'agent', 'position': {'x': 500, 'y': 200}, 'data': {'label': 'Deploy Cluster', 'agentType': 'cluster_ops'}},
            {'id': 'monitor', 'type': 'agent', 'position': {'x': 700, 'y': 200}, 'data': {'label': 'Monitor Health', 'agentType': 'monitoring'}},
            {'id': 'end', 'type': 'end', 'position': {'x': 900, 'y': 200}, 'data': {'label': 'End'}}
        ],
        'connections': [
            {'id': 'c1', 'source': 'start', 'target': 'validate'},
            {'id': 'c2', 'source': 'validate', 'target': 'deploy'},
            {'id': 'c3', 'source': 'deploy', 'target': 'monitor'},
            {'id': 'c4', 'source': 'monitor', 'target': 'end'}
        ],
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }
}

@workflow_designer_bp.route('/templates', methods=['GET'])
def get_workflow_templates():
    """Get all available workflow templates"""
    try:
        return jsonify({
            "status": "success",
            "templates": list(workflow_templates.values())
        })
    except Exception as e:
        logger.error(f"Failed to get workflow templates: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/templates/<template_id>', methods=['GET'])
def get_workflow_template(template_id: str):
    """Get a specific workflow template"""
    try:
        if template_id not in workflow_templates:
            return jsonify({
                "status": "error",
                "message": "Template not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "template": workflow_templates[template_id]
        })
    except Exception as e:
        logger.error(f"Failed to get workflow template {template_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/workflows', methods=['POST'])
def save_workflow():
    """Save a custom workflow"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'nodes', 'connections']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400
        
        # Generate workflow ID
        workflow_id = data.get('id', str(uuid.uuid4()))
        
        # Create workflow object
        workflow = {
            'id': workflow_id,
            'name': data['name'],
            'description': data.get('description', ''),
            'category': data.get('category', 'Custom'),
            'nodes': data['nodes'],
            'connections': data['connections'],
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Save workflow
        saved_workflows[workflow_id] = workflow
        
        return jsonify({
            "status": "success",
            "message": "Workflow saved successfully",
            "workflow_id": workflow_id,
            "workflow": workflow
        })
        
    except Exception as e:
        logger.error(f"Failed to save workflow: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/workflows', methods=['GET'])
def get_saved_workflows():
    """Get all saved workflows"""
    try:
        return jsonify({
            "status": "success",
            "workflows": list(saved_workflows.values())
        })
    except Exception as e:
        logger.error(f"Failed to get saved workflows: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/workflows/<workflow_id>', methods=['GET'])
def get_workflow(workflow_id: str):
    """Get a specific workflow"""
    try:
        if workflow_id not in saved_workflows:
            return jsonify({
                "status": "error",
                "message": "Workflow not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "workflow": saved_workflows[workflow_id]
        })
    except Exception as e:
        logger.error(f"Failed to get workflow {workflow_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/workflows/<workflow_id>', methods=['PUT'])
def update_workflow(workflow_id: str):
    """Update an existing workflow"""
    try:
        if workflow_id not in saved_workflows:
            return jsonify({
                "status": "error",
                "message": "Workflow not found"
            }), 404
        
        data = request.get_json()
        workflow = saved_workflows[workflow_id]
        
        # Update workflow fields
        workflow.update({
            'name': data.get('name', workflow['name']),
            'description': data.get('description', workflow['description']),
            'category': data.get('category', workflow['category']),
            'nodes': data.get('nodes', workflow['nodes']),
            'connections': data.get('connections', workflow['connections']),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        return jsonify({
            "status": "success",
            "message": "Workflow updated successfully",
            "workflow": workflow
        })
        
    except Exception as e:
        logger.error(f"Failed to update workflow {workflow_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/workflows/<workflow_id>', methods=['DELETE'])
def delete_workflow(workflow_id: str):
    """Delete a workflow"""
    try:
        if workflow_id not in saved_workflows:
            return jsonify({
                "status": "error",
                "message": "Workflow not found"
            }), 404
        
        del saved_workflows[workflow_id]
        
        return jsonify({
            "status": "success",
            "message": "Workflow deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Failed to delete workflow {workflow_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/validate', methods=['POST'])
def validate_workflow():
    """Validate a workflow structure"""
    try:
        data = request.get_json()
        
        nodes = data.get('nodes', [])
        connections = data.get('connections', [])
        
        validation_errors = []
        validation_warnings = []
        
        # Check for start and end nodes
        start_nodes = [n for n in nodes if n.get('type') == 'start']
        end_nodes = [n for n in nodes if n.get('type') == 'end']
        
        if len(start_nodes) == 0:
            validation_errors.append("Workflow must have at least one start node")
        elif len(start_nodes) > 1:
            validation_warnings.append("Workflow has multiple start nodes")
        
        if len(end_nodes) == 0:
            validation_errors.append("Workflow must have at least one end node")
        
        # Check for orphaned nodes
        node_ids = {n['id'] for n in nodes}
        connected_nodes = set()
        
        for conn in connections:
            if conn.get('source') not in node_ids:
                validation_errors.append(f"Connection references non-existent source node: {conn.get('source')}")
            if conn.get('target') not in node_ids:
                validation_errors.append(f"Connection references non-existent target node: {conn.get('target')}")
            
            connected_nodes.add(conn.get('source'))
            connected_nodes.add(conn.get('target'))
        
        orphaned_nodes = node_ids - connected_nodes
        if orphaned_nodes and len(nodes) > 1:
            validation_warnings.append(f"Orphaned nodes detected: {', '.join(orphaned_nodes)}")
        
        # Check for circular dependencies (basic check)
        def has_cycle(connections, start_node):
            visited = set()
            path = set()
            
            def dfs(node):
                if node in path:
                    return True
                if node in visited:
                    return False
                
                visited.add(node)
                path.add(node)
                
                for conn in connections:
                    if conn.get('source') == node:
                        if dfs(conn.get('target')):
                            return True
                
                path.remove(node)
                return False
            
            return dfs(start_node)
        
        for start_node in start_nodes:
            if has_cycle(connections, start_node['id']):
                validation_errors.append("Workflow contains circular dependencies")
                break
        
        # Validate node configurations
        for node in nodes:
            node_type = node.get('type')
            node_data = node.get('data', {})
            
            if node_type == 'agent' and not node_data.get('agentType'):
                validation_warnings.append(f"Agent node '{node.get('id')}' missing agent type")
            
            if node_type == 'condition' and not node_data.get('condition'):
                validation_warnings.append(f"Condition node '{node.get('id')}' missing condition logic")
            
            if node_type == 'action' and not node_data.get('action'):
                validation_warnings.append(f"Action node '{node.get('id')}' missing action definition")
        
        is_valid = len(validation_errors) == 0
        
        return jsonify({
            "status": "success",
            "valid": is_valid,
            "errors": validation_errors,
            "warnings": validation_warnings,
            "summary": {
                "total_nodes": len(nodes),
                "total_connections": len(connections),
                "start_nodes": len(start_nodes),
                "end_nodes": len(end_nodes),
                "orphaned_nodes": len(orphaned_nodes)
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to validate workflow: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/execute', methods=['POST'])
def execute_workflow():
    """Execute a workflow (integration with existing workflow system)"""
    try:
        data = request.get_json()
        
        workflow_name = data.get('name', 'custom_workflow')
        nodes = data.get('nodes', [])
        connections = data.get('connections', [])
        
        # Convert visual workflow to executable format
        # This is a simplified conversion - in practice, you'd need more sophisticated logic
        
        # Find start node
        start_nodes = [n for n in nodes if n.get('type') == 'start']
        if not start_nodes:
            return jsonify({
                "status": "error",
                "message": "No start node found in workflow"
            }), 400
        
        # Build execution plan
        execution_plan = []
        current_node = start_nodes[0]['id']
        visited = set()
        
        while current_node and current_node not in visited:
            visited.add(current_node)
            
            # Find current node
            node = next((n for n in nodes if n['id'] == current_node), None)
            if not node:
                break
            
            # Add to execution plan
            if node['type'] != 'start':
                execution_plan.append({
                    'node_id': node['id'],
                    'type': node['type'],
                    'data': node['data']
                })
            
            # Find next node
            next_connections = [c for c in connections if c.get('source') == current_node]
            if next_connections:
                current_node = next_connections[0].get('target')
            else:
                break
        
        # For now, return the execution plan
        # In a full implementation, this would integrate with the existing workflow system
        return jsonify({
            "status": "success",
            "message": "Workflow execution plan generated",
            "execution_plan": execution_plan,
            "result": {
                "workflow_name": workflow_name,
                "steps_planned": len(execution_plan),
                "estimated_duration": f"{len(execution_plan) * 2}s"
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to execute workflow: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/node-types', methods=['GET'])
def get_node_types():
    """Get available node types and their configurations"""
    try:
        node_types = [
            {
                'type': 'start',
                'label': 'Start',
                'icon': '▶️',
                'color': '#28a745',
                'description': 'Entry point for the workflow',
                'properties': ['label']
            },
            {
                'type': 'agent',
                'label': 'Agent',
                'icon': '🤖',
                'color': '#007bff',
                'description': 'AI agent that performs tasks',
                'properties': ['label', 'agentType'],
                'agentTypes': ['coordinator', 'l1_support', 'l2_support', 'l3_support', 'cluster_ops', 'monitoring']
            },
            {
                'type': 'condition',
                'label': 'Condition',
                'icon': '❓',
                'color': '#ffc107',
                'description': 'Decision point based on conditions',
                'properties': ['label', 'condition']
            },
            {
                'type': 'action',
                'label': 'Action',
                'icon': '⚡',
                'color': '#17a2b8',
                'description': 'Performs a specific action',
                'properties': ['label', 'action']
            },
            {
                'type': 'end',
                'label': 'End',
                'icon': '⏹️',
                'color': '#dc3545',
                'description': 'End point for the workflow',
                'properties': ['label']
            }
        ]
        
        return jsonify({
            "status": "success",
            "node_types": node_types
        })
        
    except Exception as e:
        logger.error(f"Failed to get node types: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@workflow_designer_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for workflow designer"""
    try:
        return jsonify({
            "status": "healthy",
            "message": "Workflow designer is operational",
            "templates_available": len(workflow_templates),
            "saved_workflows": len(saved_workflows)
        })
        
    except Exception as e:
        logger.error(f"Workflow designer health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
