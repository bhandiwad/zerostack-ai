import asyncio
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timedelta
from .base import AgentCapability
from .support_l1 import SupportTicket, TicketStatus, TicketPriority
from src.services.openai_service import OpenAIService
from src.services.kubernetes_client import KubernetesClient
import logging
import json
import re
import yaml
from enum import Enum

logger = logging.getLogger(__name__)

class DiagnosticSeverity(str, Enum):
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'

class DiagnosticResult:
    """Represents a diagnostic analysis result"""
    
    def __init__(self, 
                 diagnostic_id: str,
                 title: str,
                 description: str,
                 severity: DiagnosticSeverity,
                 resource_type: Optional[str] = None,
                 resource_name: Optional[str] = None,
                 namespace: Optional[str] = None,
                 evidence: Optional[List[str]] = None,
                 recommendations: Optional[List[str]] = None):
        self.diagnostic_id = diagnostic_id
        self.title = title
        self.description = description
        self.severity = severity
        self.resource_type = resource_type
        self.resource_name = resource_name
        self.namespace = namespace
        self.evidence = evidence or []
        self.recommendations = recommendations or []
        self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'diagnostic_id': self.diagnostic_id,
            'title': self.title,
            'description': self.description,
            'severity': self.severity.value,
            'resource_type': self.resource_type,
            'resource_name': self.resource_name,
            'namespace': self.namespace,
            'evidence': self.evidence,
            'recommendations': self.recommendations,
            'timestamp': self.timestamp.isoformat()
        }

class SupportL2Capability(AgentCapability):
    """
    L2 Support Agent Capability - Advanced technical support.
    Handles complex issues through automated log analysis, debugging,
    and system diagnostics. Escalates to L3 for code-level fixes.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.tickets: Dict[str, SupportTicket] = {}
        self.diagnostics: Dict[str, List[DiagnosticResult]] = {}
        self.openai_service: Optional[OpenAIService] = None
        self.k8s_client: Optional[KubernetesClient] = None
        self.log_patterns = self._load_log_patterns()
        self.escalation_triggers = [
            'code bug', 'application error', 'memory leak', 'deadlock',
            'race condition', 'integration failure', 'api bug',
            'performance regression', 'data corruption'
        ]
    
    async def _initialize(self):
        """Initialize the L2 support capability"""
        try:
            logger.info("Initializing SupportL2Capability")
            self.openai_service = OpenAIService()
            self.k8s_client = KubernetesClient()
            logger.info("SupportL2Capability initialized")
        except Exception as e:
            logger.error(f"Failed to initialize L2 support capability: {str(e)}")
            raise
    
    def _load_log_patterns(self) -> Dict[str, Any]:
        """Load common log patterns for automated analysis"""
        return {
            'error_patterns': [
                {
                    'pattern': r'ERROR.*OutOfMemoryError',
                    'severity': DiagnosticSeverity.CRITICAL,
                    'title': 'Out of Memory Error',
                    'description': 'Application is running out of memory',
                    'recommendations': [
                        'Increase memory limits for the container',
                        'Check for memory leaks in the application',
                        'Review memory usage patterns'
                    ]
                },
                {
                    'pattern': r'ERROR.*Connection refused',
                    'severity': DiagnosticSeverity.ERROR,
                    'title': 'Connection Refused',
                    'description': 'Service is unable to connect to dependency',
                    'recommendations': [
                        'Check if target service is running',
                        'Verify network connectivity',
                        'Review service discovery configuration'
                    ]
                },
                {
                    'pattern': r'ERROR.*CrashLoopBackOff',
                    'severity': DiagnosticSeverity.CRITICAL,
                    'title': 'Crash Loop Back Off',
                    'description': 'Pod is repeatedly crashing and restarting',
                    'recommendations': [
                        'Check application logs for startup errors',
                        'Verify configuration and environment variables',
                        'Review resource limits and requests'
                    ]
                },
                {
                    'pattern': r'WARN.*disk space',
                    'severity': DiagnosticSeverity.WARNING,
                    'title': 'Low Disk Space',
                    'description': 'Node is running low on disk space',
                    'recommendations': [
                        'Clean up unused images and containers',
                        'Review log retention policies',
                        'Consider adding more storage'
                    ]
                }
            ],
            'performance_patterns': [
                {
                    'pattern': r'WARN.*high CPU usage',
                    'severity': DiagnosticSeverity.WARNING,
                    'title': 'High CPU Usage',
                    'description': 'CPU usage is above normal thresholds',
                    'recommendations': [
                        'Review CPU limits and requests',
                        'Check for CPU-intensive operations',
                        'Consider horizontal scaling'
                    ]
                },
                {
                    'pattern': r'WARN.*slow query',
                    'severity': DiagnosticSeverity.WARNING,
                    'title': 'Slow Database Queries',
                    'description': 'Database queries are taking longer than expected',
                    'recommendations': [
                        'Review database indexes',
                        'Optimize query performance',
                        'Check database resource allocation'
                    ]
                }
            ]
        }
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an L2 support action"""
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
            'analyze_ticket', 'run_diagnostics', 'analyze_logs', 'analyze_events',
            'get_diagnostics', 'escalate_to_l3', 'provide_solution'
        ]
    
    # --- Ticket Analysis ---
    
    async def _handle_analyze_ticket(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a ticket escalated from L1"""
        ticket_id = parameters.get('ticket_id')
        if not ticket_id:
            return {'error': 'ticket_id is required'}
        
        # In a real implementation, this would receive the ticket from L1
        # For now, we'll simulate receiving ticket data
        ticket_data = parameters.get('ticket_data', {})
        
        # Create or update ticket
        if ticket_id not in self.tickets:
            ticket = SupportTicket(
                ticket_id=ticket_id,
                user_id=ticket_data.get('user_id', 'unknown'),
                subject=ticket_data.get('subject', 'L2 Analysis Required'),
                description=ticket_data.get('description', ''),
                priority=TicketPriority(ticket_data.get('priority', 'medium'))
            )
            ticket.assigned_agent = 'L2'
            ticket.status = TicketStatus.IN_PROGRESS
            self.tickets[ticket_id] = ticket
        else:
            ticket = self.tickets[ticket_id]
        
        # Start comprehensive analysis
        ticket.add_message('L2_agent', 'Starting L2 technical analysis...', 'status_update')
        
        # Run automated diagnostics
        diagnostics = await self._run_comprehensive_diagnostics(ticket)
        
        # Generate technical analysis
        analysis = await self._generate_technical_analysis(ticket, diagnostics)
        
        # Determine next steps
        if self._should_escalate_to_l3(ticket, diagnostics):
            ticket.escalate("Requires code-level investigation or fixes", "L3")
            ticket.add_message('L2_agent', analysis, 'technical_analysis')
            ticket.add_message('system', "Escalating to L3 for code-level resolution", 'escalation')
        else:
            # Provide solution
            solution = await self._generate_solution(ticket, diagnostics)
            ticket.add_message('L2_agent', solution, 'solution')
            if self._is_solution_complete(solution):
                ticket.resolve("Issue resolved through L2 technical analysis")
        
        return {
            'analysis': analysis,
            'diagnostics_count': len(diagnostics),
            'status': ticket.status.value,
            'escalated_to_l3': ticket.status == TicketStatus.ESCALATED
        }
    
    async def _handle_run_diagnostics(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Run diagnostic checks on specified resources"""
        resource_type = parameters.get('resource_type')
        resource_name = parameters.get('resource_name')
        namespace = parameters.get('namespace', 'default')
        
        diagnostics = []
        
        if resource_type == 'pod':
            diagnostics.extend(await self._diagnose_pod(resource_name, namespace))
        elif resource_type == 'deployment':
            diagnostics.extend(await self._diagnose_deployment(resource_name, namespace))
        elif resource_type == 'service':
            diagnostics.extend(await self._diagnose_service(resource_name, namespace))
        elif resource_type == 'node':
            diagnostics.extend(await self._diagnose_node(resource_name))
        else:
            # Run cluster-wide diagnostics
            diagnostics.extend(await self._diagnose_cluster())
        
        return {
            'diagnostics': [d.to_dict() for d in diagnostics],
            'count': len(diagnostics),
            'critical_issues': len([d for d in diagnostics if d.severity == DiagnosticSeverity.CRITICAL])
        }
    
    async def _handle_analyze_logs(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze logs for patterns and issues"""
        resource_type = parameters.get('resource_type', 'pod')
        resource_name = parameters.get('resource_name')
        namespace = parameters.get('namespace', 'default')
        lines = parameters.get('lines', 100)
        
        if not resource_name:
            return {'error': 'resource_name is required'}
        
        try:
            # Get logs from Kubernetes
            logs = await self._get_resource_logs(resource_type, resource_name, namespace, lines)
            
            # Analyze logs for patterns
            analysis_results = self._analyze_log_patterns(logs)
            
            # Generate AI-powered insights
            ai_insights = await self._generate_log_insights(logs)
            
            return {
                'log_analysis': analysis_results,
                'ai_insights': ai_insights,
                'log_lines_analyzed': len(logs.split('\n')) if logs else 0
            }
            
        except Exception as e:
            logger.error(f"Error analyzing logs: {str(e)}")
            return {'error': f'Failed to analyze logs: {str(e)}'}
    
    async def _handle_analyze_events(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze Kubernetes events for issues"""
        namespace = parameters.get('namespace')
        resource_name = parameters.get('resource_name')
        
        try:
            events = await self._get_kubernetes_events(namespace, resource_name)
            analysis = self._analyze_events(events)
            
            return {
                'events_analyzed': len(events),
                'warnings': analysis['warnings'],
                'errors': analysis['errors'],
                'recommendations': analysis['recommendations']
            }
            
        except Exception as e:
            logger.error(f"Error analyzing events: {str(e)}")
            return {'error': f'Failed to analyze events: {str(e)}'}
    
    # --- Diagnostic Methods ---
    
    async def _run_comprehensive_diagnostics(self, ticket: SupportTicket) -> List[DiagnosticResult]:
        """Run comprehensive diagnostics for a ticket"""
        diagnostics = []
        
        # Extract resource information from ticket
        resources = self._extract_resources_from_ticket(ticket)
        
        for resource in resources:
            if resource['type'] == 'pod':
                diagnostics.extend(await self._diagnose_pod(resource['name'], resource.get('namespace', 'default')))
            elif resource['type'] == 'deployment':
                diagnostics.extend(await self._diagnose_deployment(resource['name'], resource.get('namespace', 'default')))
        
        # If no specific resources, run general diagnostics
        if not diagnostics:
            diagnostics.extend(await self._diagnose_cluster())
        
        # Store diagnostics for this ticket
        self.diagnostics[ticket.ticket_id] = diagnostics
        
        return diagnostics
    
    async def _diagnose_pod(self, pod_name: str, namespace: str) -> List[DiagnosticResult]:
        """Diagnose issues with a specific pod"""
        diagnostics = []
        
        try:
            if not self.k8s_client or not self.k8s_client.is_connected():
                return [DiagnosticResult(
                    diagnostic_id=f"pod_diag_{datetime.utcnow().timestamp()}",
                    title="Kubernetes Connection Error",
                    description="Cannot connect to Kubernetes cluster for diagnostics",
                    severity=DiagnosticSeverity.ERROR
                )]
            
            # Get pod details
            pod_info = await self._get_pod_details(pod_name, namespace)
            
            # Check pod status
            if pod_info.get('status') != 'Running':
                diagnostics.append(DiagnosticResult(
                    diagnostic_id=f"pod_status_{pod_name}",
                    title="Pod Not Running",
                    description=f"Pod {pod_name} is in {pod_info.get('status')} state",
                    severity=DiagnosticSeverity.ERROR,
                    resource_type='pod',
                    resource_name=pod_name,
                    namespace=namespace,
                    recommendations=[
                        "Check pod events for startup issues",
                        "Verify image availability",
                        "Review resource requests and limits"
                    ]
                ))
            
            # Check restart count
            restart_count = pod_info.get('restart_count', 0)
            if restart_count > 5:
                diagnostics.append(DiagnosticResult(
                    diagnostic_id=f"pod_restarts_{pod_name}",
                    title="High Restart Count",
                    description=f"Pod {pod_name} has restarted {restart_count} times",
                    severity=DiagnosticSeverity.WARNING,
                    resource_type='pod',
                    resource_name=pod_name,
                    namespace=namespace,
                    recommendations=[
                        "Check application logs for crash causes",
                        "Review health check configuration",
                        "Verify resource allocation"
                    ]
                ))
            
            # Analyze pod logs
            logs = await self._get_resource_logs('pod', pod_name, namespace, 50)
            if logs:
                log_diagnostics = self._analyze_log_patterns(logs)
                for pattern_result in log_diagnostics.get('pattern_matches', []):
                    diagnostics.append(DiagnosticResult(
                        diagnostic_id=f"log_pattern_{pod_name}_{len(diagnostics)}",
                        title=pattern_result['title'],
                        description=pattern_result['description'],
                        severity=DiagnosticSeverity(pattern_result['severity']),
                        resource_type='pod',
                        resource_name=pod_name,
                        namespace=namespace,
                        evidence=[pattern_result['matched_line']],
                        recommendations=pattern_result['recommendations']
                    ))
            
        except Exception as e:
            logger.error(f"Error diagnosing pod {pod_name}: {str(e)}")
            diagnostics.append(DiagnosticResult(
                diagnostic_id=f"pod_diag_error_{pod_name}",
                title="Diagnostic Error",
                description=f"Failed to diagnose pod {pod_name}: {str(e)}",
                severity=DiagnosticSeverity.ERROR
            ))
        
        return diagnostics
    
    async def _diagnose_deployment(self, deployment_name: str, namespace: str) -> List[DiagnosticResult]:
        """Diagnose issues with a deployment"""
        diagnostics = []
        
        try:
            # Simulate deployment analysis
            diagnostics.append(DiagnosticResult(
                diagnostic_id=f"deploy_analysis_{deployment_name}",
                title="Deployment Analysis",
                description=f"Analyzed deployment {deployment_name}",
                severity=DiagnosticSeverity.INFO,
                resource_type='deployment',
                resource_name=deployment_name,
                namespace=namespace
            ))
            
        except Exception as e:
            logger.error(f"Error diagnosing deployment {deployment_name}: {str(e)}")
        
        return diagnostics
    
    async def _diagnose_cluster(self) -> List[DiagnosticResult]:
        """Run general cluster diagnostics"""
        diagnostics = []
        
        # Simulate cluster health check
        diagnostics.append(DiagnosticResult(
            diagnostic_id=f"cluster_health_{datetime.utcnow().timestamp()}",
            title="Cluster Health Check",
            description="General cluster health analysis completed",
            severity=DiagnosticSeverity.INFO,
            recommendations=[
                "Monitor resource usage trends",
                "Review security policies",
                "Check for pending updates"
            ]
        ))
        
        return diagnostics
    
    # --- Log Analysis ---
    
    def _analyze_log_patterns(self, logs: str) -> Dict[str, Any]:
        """Analyze logs against known patterns"""
        results = {
            'pattern_matches': [],
            'error_count': 0,
            'warning_count': 0,
            'summary': ''
        }
        
        if not logs:
            return results
        
        log_lines = logs.split('\n')
        
        # Check against error patterns
        for pattern_config in self.log_patterns['error_patterns']:
            pattern = re.compile(pattern_config['pattern'], re.IGNORECASE)
            for line in log_lines:
                if pattern.search(line):
                    results['pattern_matches'].append({
                        'title': pattern_config['title'],
                        'description': pattern_config['description'],
                        'severity': pattern_config['severity'].value,
                        'matched_line': line.strip(),
                        'recommendations': pattern_config['recommendations']
                    })
                    if pattern_config['severity'] == DiagnosticSeverity.ERROR:
                        results['error_count'] += 1
                    elif pattern_config['severity'] == DiagnosticSeverity.WARNING:
                        results['warning_count'] += 1
        
        # Check against performance patterns
        for pattern_config in self.log_patterns['performance_patterns']:
            pattern = re.compile(pattern_config['pattern'], re.IGNORECASE)
            for line in log_lines:
                if pattern.search(line):
                    results['pattern_matches'].append({
                        'title': pattern_config['title'],
                        'description': pattern_config['description'],
                        'severity': pattern_config['severity'].value,
                        'matched_line': line.strip(),
                        'recommendations': pattern_config['recommendations']
                    })
                    results['warning_count'] += 1
        
        # Generate summary
        if results['pattern_matches']:
            results['summary'] = f"Found {len(results['pattern_matches'])} pattern matches: {results['error_count']} errors, {results['warning_count']} warnings"
        else:
            results['summary'] = "No known issue patterns detected in logs"
        
        return results
    
    async def _generate_log_insights(self, logs: str) -> str:
        """Generate AI-powered insights from logs"""
        if not self.openai_service or not logs:
            return "Unable to generate AI insights"
        
        # Take last 20 lines for analysis
        log_lines = logs.split('\n')[-20:]
        log_sample = '\n'.join(log_lines)
        
        prompt = f"""
        Analyze the following Kubernetes application logs and provide insights:
        
        {log_sample}
        
        Identify:
        1. Any errors or warnings
        2. Performance issues
        3. Potential root causes
        4. Recommended actions
        
        Provide a concise technical analysis in 2-3 sentences.
        """
        
        try:
            insights = self.openai_service.get_completion(prompt, max_tokens=200)
            return insights.strip()
        except Exception as e:
            logger.error(f"Error generating log insights: {str(e)}")
            return "Unable to generate AI insights due to processing error"
    
    # --- AI Analysis ---
    
    async def _generate_technical_analysis(self, ticket: SupportTicket, diagnostics: List[DiagnosticResult]) -> str:
        """Generate comprehensive technical analysis"""
        if not self.openai_service:
            return "Technical analysis unavailable - AI service not configured"
        
        # Prepare diagnostic summary
        diagnostic_summary = ""
        if diagnostics:
            critical_count = len([d for d in diagnostics if d.severity == DiagnosticSeverity.CRITICAL])
            error_count = len([d for d in diagnostics if d.severity == DiagnosticSeverity.ERROR])
            warning_count = len([d for d in diagnostics if d.severity == DiagnosticSeverity.WARNING])
            
            diagnostic_summary = f"Diagnostics: {critical_count} critical, {error_count} errors, {warning_count} warnings\n"
            
            for diag in diagnostics[:3]:  # Top 3 issues
                diagnostic_summary += f"- {diag.title}: {diag.description}\n"
        
        prompt = f"""
        As an L2 technical support engineer, analyze this Kubernetes support ticket:
        
        Subject: {ticket.subject}
        Description: {ticket.description}
        Priority: {ticket.priority.value}
        
        {diagnostic_summary}
        
        Provide a technical analysis including:
        1. Root cause assessment
        2. Impact analysis
        3. Technical recommendations
        4. Whether this requires L3 escalation
        
        Keep the analysis technical but concise (under 300 words).
        """
        
        try:
            analysis = self.openai_service.get_completion(prompt, max_tokens=400)
            return analysis.strip()
        except Exception as e:
            logger.error(f"Error generating technical analysis: {str(e)}")
            return "Unable to generate technical analysis due to processing error"
    
    # --- Helper Methods ---
    
    def _extract_resources_from_ticket(self, ticket: SupportTicket) -> List[Dict[str, str]]:
        """Extract resource names and types from ticket description"""
        resources = []
        text = (ticket.subject + " " + ticket.description).lower()
        
        # Simple regex patterns to extract resource names
        pod_matches = re.findall(r'pod[:\s]+([a-zA-Z0-9-]+)', text)
        deployment_matches = re.findall(r'deployment[:\s]+([a-zA-Z0-9-]+)', text)
        
        for pod in pod_matches:
            resources.append({'type': 'pod', 'name': pod})
        
        for deployment in deployment_matches:
            resources.append({'type': 'deployment', 'name': deployment})
        
        return resources
    
    def _should_escalate_to_l3(self, ticket: SupportTicket, diagnostics: List[DiagnosticResult]) -> bool:
        """Determine if ticket should be escalated to L3"""
        text = (ticket.subject + " " + ticket.description).lower()
        
        # Check for L3 escalation triggers
        if any(trigger in text for trigger in self.escalation_triggers):
            return True
        
        # Check if we have critical issues that might need code fixes
        critical_diagnostics = [d for d in diagnostics if d.severity == DiagnosticSeverity.CRITICAL]
        if len(critical_diagnostics) > 2:
            return True
        
        # Check ticket priority
        if ticket.priority == TicketPriority.CRITICAL:
            return True
        
        return False
    
    async def _get_resource_logs(self, resource_type: str, resource_name: str, namespace: str, lines: int) -> str:
        """Get logs from a Kubernetes resource"""
        try:
            if not self.k8s_client or not self.k8s_client.is_connected():
                return "Unable to retrieve logs - Kubernetes client not connected"
            
            # Simulate log retrieval
            return f"Sample logs for {resource_type} {resource_name} in {namespace}\nINFO: Application started\nWARN: High memory usage detected\nERROR: Connection timeout to database"
            
        except Exception as e:
            logger.error(f"Error getting logs: {str(e)}")
            return f"Error retrieving logs: {str(e)}"
    
    async def _get_pod_details(self, pod_name: str, namespace: str) -> Dict[str, Any]:
        """Get detailed pod information"""
        # Simulate pod details
        return {
            'status': 'Running',
            'restart_count': 2,
            'ready': '1/1',
            'node': 'node-1'
        }
    
    async def _generate_solution(self, ticket: SupportTicket, diagnostics: List[DiagnosticResult]) -> str:
        """Generate a solution for the ticket"""
        if not diagnostics:
            return "No specific issues detected. Please provide more details about the problem."
        
        # Compile recommendations from diagnostics
        all_recommendations = []
        for diag in diagnostics:
            all_recommendations.extend(diag.recommendations)
        
        # Remove duplicates
        unique_recommendations = list(set(all_recommendations))
        
        solution = "Based on the technical analysis, here are the recommended solutions:\n\n"
        for i, rec in enumerate(unique_recommendations[:5], 1):
            solution += f"{i}. {rec}\n"
        
        solution += "\nPlease try these solutions and let us know if the issue persists."
        
        return solution
    
    def _is_solution_complete(self, solution: str) -> bool:
        """Check if the solution is comprehensive enough to resolve the ticket"""
        # Simple heuristic: if solution has multiple recommendations, consider it complete
        return len(solution.split('\n')) > 3
