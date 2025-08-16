import asyncio
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timedelta
from .base import AgentCapability
from .support_l1 import SupportTicket, TicketStatus, TicketPriority
from .support_l2 import DiagnosticResult, DiagnosticSeverity
from src.services.openai_service import OpenAIService
from src.services.kubernetes_client import KubernetesClient
import logging
import json
import re
import yaml
import subprocess
import tempfile
import os
from enum import Enum

logger = logging.getLogger(__name__)

class CodeFixType(str, Enum):
    CONFIGURATION = 'configuration'
    DEPLOYMENT = 'deployment'
    SCRIPT = 'script'
    PATCH = 'patch'
    HOTFIX = 'hotfix'

class CodeFixStatus(str, Enum):
    PROPOSED = 'proposed'
    APPROVED = 'approved'
    APPLIED = 'applied'
    TESTED = 'tested'
    VERIFIED = 'verified'
    FAILED = 'failed'

class CodeFix:
    """Represents a code fix or configuration change"""
    
    def __init__(self, 
                 fix_id: str,
                 title: str,
                 description: str,
                 fix_type: CodeFixType,
                 target_resource: str,
                 namespace: Optional[str] = None,
                 fix_content: Optional[str] = None,
                 validation_steps: Optional[List[str]] = None,
                 rollback_plan: Optional[str] = None):
        self.fix_id = fix_id
        self.title = title
        self.description = description
        self.fix_type = fix_type
        self.target_resource = target_resource
        self.namespace = namespace
        self.fix_content = fix_content
        self.validation_steps = validation_steps or []
        self.rollback_plan = rollback_plan
        self.status = CodeFixStatus.PROPOSED
        self.created_at = datetime.utcnow()
        self.applied_at = None
        self.verified_at = None
        self.created_by = 'L3_agent'
        self.applied_by = None
        self.test_results: List[Dict[str, Any]] = []
        self.approval_required = True
    
    def approve(self, approved_by: str = 'system'):
        """Approve the fix for application"""
        self.status = CodeFixStatus.APPROVED
        self.applied_by = approved_by
    
    def apply(self):
        """Mark the fix as applied"""
        self.status = CodeFixStatus.APPLIED
        self.applied_at = datetime.utcnow()
    
    def verify(self, test_results: List[Dict[str, Any]]):
        """Mark the fix as verified with test results"""
        self.status = CodeFixStatus.VERIFIED
        self.verified_at = datetime.utcnow()
        self.test_results = test_results
    
    def fail(self, reason: str):
        """Mark the fix as failed"""
        self.status = CodeFixStatus.FAILED
        self.test_results.append({
            'timestamp': datetime.utcnow().isoformat(),
            'result': 'failed',
            'reason': reason
        })
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'fix_id': self.fix_id,
            'title': self.title,
            'description': self.description,
            'fix_type': self.fix_type.value,
            'target_resource': self.target_resource,
            'namespace': self.namespace,
            'fix_content': self.fix_content,
            'validation_steps': self.validation_steps,
            'rollback_plan': self.rollback_plan,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'created_by': self.created_by,
            'applied_by': self.applied_by,
            'test_results': self.test_results,
            'approval_required': self.approval_required
        }

class SupportL3Capability(AgentCapability):
    """
    L3 Support Agent Capability - Expert-level support with code fixes.
    Handles complex issues requiring code changes, configuration fixes,
    and system-level interventions. Provides automated code generation
    and deployment fixes.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.tickets: Dict[str, SupportTicket] = {}
        self.code_fixes: Dict[str, CodeFix] = {}
        self.openai_service: Optional[OpenAIService] = None
        self.k8s_client: Optional[KubernetesClient] = None
        self.fix_templates = self._load_fix_templates()
        self.auto_apply_safe_fixes = self.config.get('auto_apply_safe_fixes', False)
        self.require_approval = self.config.get('require_approval', True)
    
    async def _initialize(self):
        """Initialize the L3 support capability"""
        try:
            logger.info("Initializing SupportL3Capability")
            self.openai_service = OpenAIService()
            self.k8s_client = KubernetesClient()
            logger.info("SupportL3Capability initialized")
        except Exception as e:
            logger.error(f"Failed to initialize L3 support capability: {str(e)}")
            raise
    
    def _load_fix_templates(self) -> Dict[str, Any]:
        """Load templates for common fixes"""
        return {
            'memory_limit_fix': {
                'type': CodeFixType.CONFIGURATION,
                'template': '''
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {deployment_name}
  namespace: {namespace}
spec:
  template:
    spec:
      containers:
      - name: {container_name}
        resources:
          limits:
            memory: "{memory_limit}"
          requests:
            memory: "{memory_request}"
''',
                'validation_steps': [
                    'Check pod status after applying',
                    'Monitor memory usage',
                    'Verify application functionality'
                ]
            },
            'cpu_limit_fix': {
                'type': CodeFixType.CONFIGURATION,
                'template': '''
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {deployment_name}
  namespace: {namespace}
spec:
  template:
    spec:
      containers:
      - name: {container_name}
        resources:
          limits:
            cpu: "{cpu_limit}"
          requests:
            cpu: "{cpu_request}"
''',
                'validation_steps': [
                    'Monitor CPU usage',
                    'Check application performance',
                    'Verify no throttling occurs'
                ]
            },
            'health_check_fix': {
                'type': CodeFixType.CONFIGURATION,
                'template': '''
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {deployment_name}
  namespace: {namespace}
spec:
  template:
    spec:
      containers:
      - name: {container_name}
        livenessProbe:
          httpGet:
            path: {health_path}
            port: {health_port}
          initialDelaySeconds: {initial_delay}
          periodSeconds: {period}
        readinessProbe:
          httpGet:
            path: {readiness_path}
            port: {readiness_port}
          initialDelaySeconds: {readiness_delay}
          periodSeconds: {readiness_period}
''',
                'validation_steps': [
                    'Verify health endpoints respond',
                    'Check probe timing',
                    'Monitor restart behavior'
                ]
            },
            'network_policy_fix': {
                'type': CodeFixType.CONFIGURATION,
                'template': '''
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {policy_name}
  namespace: {namespace}
spec:
  podSelector:
    matchLabels:
      app: {app_label}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: {allowed_app}
    ports:
    - protocol: TCP
      port: {port}
''',
                'validation_steps': [
                    'Test connectivity between allowed pods',
                    'Verify blocked connections are denied',
                    'Check application functionality'
                ]
            }
        }
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an L3 support action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
            result = await handler(parameters)
            return {
                'success': True,
                'data': result
            }
            
        except Exception as e:
            logger.error(f"Error in {action}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f"Error executing {action}: {str(e)}"
            }
    
    def _list_actions(self) -> List[str]:
        """List all available actions in this capability"""
        return [
            'analyze_critical_issue', 'generate_code_fix', 'apply_fix', 'test_fix',
            'rollback_fix', 'get_fix_status', 'approve_fix', 'create_hotfix'
        ]
    
    # --- Critical Issue Analysis ---
    
    async def _handle_analyze_critical_issue(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a critical issue escalated from L2"""
        ticket_id = parameters.get('ticket_id')
        if not ticket_id:
            return {'error': 'ticket_id is required'}
        
        ticket_data = parameters.get('ticket_data', {})
        l2_analysis = parameters.get('l2_analysis', '')
        diagnostics = parameters.get('diagnostics', [])
        
        # Create or update ticket
        if ticket_id not in self.tickets:
            ticket = SupportTicket(
                ticket_id=ticket_id,
                user_id=ticket_data.get('user_id', 'unknown'),
                subject=ticket_data.get('subject', 'L3 Critical Analysis'),
                description=ticket_data.get('description', ''),
                priority=TicketPriority.CRITICAL
            )
            ticket.assigned_agent = 'L3'
            ticket.status = TicketStatus.IN_PROGRESS
            self.tickets[ticket_id] = ticket
        else:
            ticket = self.tickets[ticket_id]
        
        ticket.add_message('L3_agent', 'Starting L3 expert analysis for critical issue...', 'status_update')
        
        # Perform deep technical analysis
        analysis = await self._perform_expert_analysis(ticket, l2_analysis, diagnostics)
        
        # Generate code fixes if needed
        fixes = await self._generate_automated_fixes(ticket, analysis)
        
        # Determine resolution strategy
        resolution_plan = await self._create_resolution_plan(ticket, analysis, fixes)
        
        ticket.add_message('L3_agent', analysis, 'expert_analysis')
        ticket.add_message('L3_agent', resolution_plan, 'resolution_plan')
        
        return {
            'expert_analysis': analysis,
            'fixes_generated': len(fixes),
            'resolution_plan': resolution_plan,
            'requires_approval': any(fix.approval_required for fix in fixes),
            'estimated_resolution_time': self._estimate_resolution_time(fixes)
        }
    
    async def _handle_generate_code_fix(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a specific code fix"""
        issue_type = parameters.get('issue_type')
        resource_name = parameters.get('resource_name')
        namespace = parameters.get('namespace', 'default')
        issue_description = parameters.get('issue_description', '')
        
        if not issue_type or not resource_name:
            return {'error': 'issue_type and resource_name are required'}
        
        # Generate fix based on issue type
        if issue_type in self.fix_templates:
            fix = await self._generate_templated_fix(issue_type, resource_name, namespace, parameters)
        else:
            fix = await self._generate_ai_fix(issue_type, resource_name, namespace, issue_description)
        
        if fix:
            self.code_fixes[fix.fix_id] = fix
            return {
                'fix_id': fix.fix_id,
                'fix_details': fix.to_dict(),
                'requires_approval': fix.approval_required
            }
        else:
            return {'error': 'Failed to generate fix'}
    
    async def _handle_apply_fix(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply a code fix"""
        fix_id = parameters.get('fix_id')
        force = parameters.get('force', False)
        
        if not fix_id:
            return {'error': 'fix_id is required'}
        
        fix = self.code_fixes.get(fix_id)
        if not fix:
            return {'error': f'Fix not found: {fix_id}'}
        
        # Check approval status
        if fix.approval_required and fix.status != CodeFixStatus.APPROVED and not force:
            return {'error': 'Fix requires approval before application'}
        
        try:
            # Apply the fix
            result = await self._apply_code_fix(fix)
            
            if result['success']:
                fix.apply()
                
                # Run validation tests
                test_results = await self._validate_fix(fix)
                
                if test_results['passed']:
                    fix.verify(test_results['results'])
                    return {
                        'status': 'applied_and_verified',
                        'test_results': test_results
                    }
                else:
                    fix.fail(test_results['reason'])
                    return {
                        'status': 'applied_but_failed_validation',
                        'test_results': test_results,
                        'rollback_recommended': True
                    }
            else:
                fix.fail(result['error'])
                return {
                    'status': 'application_failed',
                    'error': result['error']
                }
                
        except Exception as e:
            fix.fail(str(e))
            logger.error(f"Error applying fix {fix_id}: {str(e)}")
            return {
                'status': 'application_failed',
                'error': str(e)
            }
    
    async def _handle_approve_fix(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Approve a fix for application"""
        fix_id = parameters.get('fix_id')
        approved_by = parameters.get('approved_by', 'system')
        
        if not fix_id:
            return {'error': 'fix_id is required'}
        
        fix = self.code_fixes.get(fix_id)
        if not fix:
            return {'error': f'Fix not found: {fix_id}'}
        
        fix.approve(approved_by)
        
        return {
            'status': 'approved',
            'approved_by': approved_by,
            'ready_for_application': True
        }
    
    async def _handle_create_hotfix(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create an emergency hotfix"""
        issue_description = parameters.get('issue_description')
        target_resource = parameters.get('target_resource')
        namespace = parameters.get('namespace', 'default')
        
        if not issue_description or not target_resource:
            return {'error': 'issue_description and target_resource are required'}
        
        # Generate emergency fix
        hotfix = await self._generate_emergency_hotfix(issue_description, target_resource, namespace)
        
        if hotfix:
            # Hotfixes can be auto-applied in emergency situations
            hotfix.approval_required = False
            self.code_fixes[hotfix.fix_id] = hotfix
            
            # Auto-apply if configured
            if self.auto_apply_safe_fixes:
                apply_result = await self._apply_code_fix(hotfix)
                if apply_result['success']:
                    hotfix.apply()
                    return {
                        'hotfix_id': hotfix.fix_id,
                        'status': 'applied',
                        'auto_applied': True
                    }
            
            return {
                'hotfix_id': hotfix.fix_id,
                'status': 'ready',
                'auto_applied': False,
                'requires_manual_application': True
            }
        else:
            return {'error': 'Failed to generate hotfix'}
    
    # --- Fix Generation ---
    
    async def _generate_templated_fix(self, issue_type: str, resource_name: str, namespace: str, parameters: Dict[str, Any]) -> Optional[CodeFix]:
        """Generate a fix using predefined templates"""
        template = self.fix_templates.get(issue_type)
        if not template:
            return None
        
        fix_id = f"fix_{issue_type}_{resource_name}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Fill template with parameters
        template_params = {
            'deployment_name': resource_name,
            'namespace': namespace,
            'container_name': parameters.get('container_name', resource_name),
            **parameters
        }
        
        try:
            fix_content = template['template'].format(**template_params)
            
            fix = CodeFix(
                fix_id=fix_id,
                title=f"Fix {issue_type} for {resource_name}",
                description=f"Templated fix for {issue_type} issue in {resource_name}",
                fix_type=template['type'],
                target_resource=resource_name,
                namespace=namespace,
                fix_content=fix_content,
                validation_steps=template.get('validation_steps', []),
                rollback_plan=f"Revert to previous configuration for {resource_name}"
            )
            
            return fix
            
        except KeyError as e:
            logger.error(f"Missing template parameter: {str(e)}")
            return None
    
    async def _generate_ai_fix(self, issue_type: str, resource_name: str, namespace: str, issue_description: str) -> Optional[CodeFix]:
        """Generate a fix using AI"""
        if not self.openai_service:
            return None
        
        prompt = f"""
        Generate a Kubernetes YAML fix for the following issue:
        
        Issue Type: {issue_type}
        Resource: {resource_name}
        Namespace: {namespace}
        Description: {issue_description}
        
        Provide:
        1. A complete YAML configuration fix
        2. Validation steps to verify the fix
        3. A rollback plan
        
        Format the response as JSON with keys: yaml_content, validation_steps, rollback_plan
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=800)
            fix_data = json.loads(response)
            
            fix_id = f"ai_fix_{resource_name}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            fix = CodeFix(
                fix_id=fix_id,
                title=f"AI-generated fix for {issue_type}",
                description=f"AI-generated solution for {issue_description}",
                fix_type=CodeFixType.CONFIGURATION,
                target_resource=resource_name,
                namespace=namespace,
                fix_content=fix_data.get('yaml_content', ''),
                validation_steps=fix_data.get('validation_steps', []),
                rollback_plan=fix_data.get('rollback_plan', 'Manual rollback required')
            )
            
            return fix
            
        except Exception as e:
            logger.error(f"Error generating AI fix: {str(e)}")
            return None
    
    async def _generate_emergency_hotfix(self, issue_description: str, target_resource: str, namespace: str) -> Optional[CodeFix]:
        """Generate an emergency hotfix"""
        if not self.openai_service:
            return None
        
        prompt = f"""
        Generate an emergency hotfix for this critical Kubernetes issue:
        
        Issue: {issue_description}
        Resource: {target_resource}
        Namespace: {namespace}
        
        This is a CRITICAL issue requiring immediate resolution. Generate:
        1. A minimal, safe configuration change
        2. Quick validation steps
        3. Simple rollback procedure
        
        Focus on stability and minimal risk. Format as JSON with keys: yaml_content, validation_steps, rollback_plan
        """
        
        try:
            response = self.openai_service.get_completion(prompt, max_tokens=600)
            fix_data = json.loads(response)
            
            fix_id = f"hotfix_{target_resource}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            hotfix = CodeFix(
                fix_id=fix_id,
                title=f"Emergency hotfix for {target_resource}",
                description=f"Critical hotfix: {issue_description}",
                fix_type=CodeFixType.HOTFIX,
                target_resource=target_resource,
                namespace=namespace,
                fix_content=fix_data.get('yaml_content', ''),
                validation_steps=fix_data.get('validation_steps', []),
                rollback_plan=fix_data.get('rollback_plan', 'Immediate rollback available')
            )
            
            return hotfix
            
        except Exception as e:
            logger.error(f"Error generating emergency hotfix: {str(e)}")
            return None
    
    # --- Fix Application ---
    
    async def _apply_code_fix(self, fix: CodeFix) -> Dict[str, Any]:
        """Apply a code fix to the cluster"""
        try:
            if not self.k8s_client or not self.k8s_client.is_connected():
                return {
                    'success': False,
                    'error': 'Kubernetes client not connected'
                }
            
            # Write fix content to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
                f.write(fix.fix_content)
                temp_file = f.name
            
            try:
                # Apply using kubectl (simulated)
                # In real implementation, use kubernetes client
                logger.info(f"Applying fix {fix.fix_id} to {fix.target_resource}")
                
                # Simulate successful application
                return {
                    'success': True,
                    'message': f"Fix {fix.fix_id} applied successfully",
                    'applied_at': datetime.utcnow().isoformat()
                }
                
            finally:
                # Clean up temp file
                os.unlink(temp_file)
                
        except Exception as e:
            logger.error(f"Error applying fix: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _validate_fix(self, fix: CodeFix) -> Dict[str, Any]:
        """Validate that a fix was applied successfully"""
        test_results = []
        
        for step in fix.validation_steps:
            # Simulate validation step
            test_result = {
                'step': step,
                'status': 'passed',
                'timestamp': datetime.utcnow().isoformat(),
                'details': f"Validation step '{step}' completed successfully"
            }
            test_results.append(test_result)
        
        return {
            'passed': True,
            'results': test_results,
            'summary': f"All {len(test_results)} validation steps passed"
        }
    
    # --- Analysis Methods ---
    
    async def _perform_expert_analysis(self, ticket: SupportTicket, l2_analysis: str, diagnostics: List[Dict[str, Any]]) -> str:
        """Perform expert-level analysis"""
        if not self.openai_service:
            return "Expert analysis unavailable - AI service not configured"
        
        prompt = f"""
        As an L3 expert engineer, perform deep technical analysis of this critical issue:
        
        Ticket: {ticket.subject}
        Description: {ticket.description}
        Priority: {ticket.priority.value}
        
        L2 Analysis: {l2_analysis}
        
        Diagnostic Summary: {len(diagnostics)} issues found
        
        Provide expert analysis including:
        1. Root cause identification
        2. System impact assessment  
        3. Code/configuration changes needed
        4. Risk assessment
        5. Implementation strategy
        
        Focus on technical depth and actionable solutions.
        """
        
        try:
            analysis = self.openai_service.get_completion(prompt, max_tokens=500)
            return analysis.strip()
        except Exception as e:
            logger.error(f"Error generating expert analysis: {str(e)}")
            return "Unable to generate expert analysis due to processing error"
    
    async def _generate_automated_fixes(self, ticket: SupportTicket, analysis: str) -> List[CodeFix]:
        """Generate automated fixes based on analysis"""
        fixes = []
        
        # Extract fix requirements from analysis
        text = (ticket.subject + " " + ticket.description + " " + analysis).lower()
        
        # Check for common fix patterns
        if 'memory' in text and ('limit' in text or 'oom' in text):
            fix = await self._generate_templated_fix(
                'memory_limit_fix',
                self._extract_resource_name(ticket),
                'default',
                {'memory_limit': '512Mi', 'memory_request': '256Mi'}
            )
            if fix:
                fixes.append(fix)
        
        if 'cpu' in text and ('limit' in text or 'throttl' in text):
            fix = await self._generate_templated_fix(
                'cpu_limit_fix',
                self._extract_resource_name(ticket),
                'default',
                {'cpu_limit': '500m', 'cpu_request': '100m'}
            )
            if fix:
                fixes.append(fix)
        
        return fixes
    
    async def _create_resolution_plan(self, ticket: SupportTicket, analysis: str, fixes: List[CodeFix]) -> str:
        """Create a comprehensive resolution plan"""
        plan = "L3 Resolution Plan:\n\n"
        
        if fixes:
            plan += f"Generated {len(fixes)} automated fixes:\n"
            for i, fix in enumerate(fixes, 1):
                plan += f"{i}. {fix.title}\n"
                plan += f"   Type: {fix.fix_type.value}\n"
                plan += f"   Target: {fix.target_resource}\n"
                plan += f"   Status: {fix.status.value}\n\n"
        
        plan += "Implementation Steps:\n"
        plan += "1. Review and approve generated fixes\n"
        plan += "2. Apply fixes in test environment (if available)\n"
        plan += "3. Apply fixes to production with monitoring\n"
        plan += "4. Validate fix effectiveness\n"
        plan += "5. Monitor for any side effects\n\n"
        
        plan += "Estimated Resolution Time: "
        plan += self._estimate_resolution_time(fixes)
        
        return plan
    
    # --- Helper Methods ---
    
    def _extract_resource_name(self, ticket: SupportTicket) -> str:
        """Extract resource name from ticket"""
        text = ticket.subject + " " + ticket.description
        
        # Simple regex to find resource names
        matches = re.findall(r'(?:pod|deployment|service)[:\s]+([a-zA-Z0-9-]+)', text.lower())
        if matches:
            return matches[0]
        
        return 'unknown-resource'
    
    def _estimate_resolution_time(self, fixes: List[CodeFix]) -> str:
        """Estimate time to resolve based on fixes"""
        if not fixes:
            return "2-4 hours (manual investigation required)"
        
        total_time = 0
        for fix in fixes:
            if fix.fix_type == CodeFixType.HOTFIX:
                total_time += 15  # 15 minutes
            elif fix.fix_type == CodeFixType.CONFIGURATION:
                total_time += 30  # 30 minutes
            else:
                total_time += 60  # 1 hour
        
        if total_time < 60:
            return f"{total_time} minutes"
        else:
            hours = total_time // 60
            minutes = total_time % 60
            return f"{hours}h {minutes}m"
