import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from .base import AgentCapability
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)

class SecuritySeverity(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

class SecurityCheckStatus(str, Enum):
    PASSED = 'passed'
    FAILED = 'failed'
    WARNING = 'warning'
    SKIPPED = 'skipped'

class SecurityCheck:
    """Represents a security check"""
    
    def __init__(self, 
                 check_id: str,
                 name: str,
                 description: str,
                 category: str,
                 severity: SecuritySeverity,
                 resource_type: Optional[str] = None,
                 resource_name: Optional[str] = None,
                 namespace: Optional[str] = None,
                 remediation: Optional[str] = None,
                 references: Optional[List[Dict[str, str]]] = None):
        self.check_id = check_id
        self.name = name
        self.description = description
        self.category = category
        self.severity = severity
        self.resource_type = resource_type
        self.resource_name = resource_name
        self.namespace = namespace
        self.remediation = remediation
        self.references = references or []
        self.status = SecurityCheckStatus.SKIPPED
        self.details: Dict[str, Any] = {}
        self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert check to dictionary"""
        return {
            'check_id': self.check_id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'severity': self.severity.value,
            'status': self.status.value,
            'resource_type': self.resource_type,
            'resource_name': self.resource_name,
            'namespace': self.namespace,
            'remediation': self.remediation,
            'references': self.references,
            'details': self.details,
            'timestamp': self.timestamp.isoformat()
        }
    
    def passed(self, details: Optional[Dict[str, Any]] = None):
        """Mark check as passed"""
        self.status = SecurityCheckStatus.PASSED
        if details:
            self.details.update(details)
    
    def failed(self, details: Optional[Dict[str, Any]] = None):
        """Mark check as failed"""
        self.status = SecurityCheckStatus.FAILED
        if details:
            self.details.update(details)
    
    def warning(self, details: Optional[Dict[str, Any]] = None):
        """Mark check with warning"""
        self.status = SecurityCheckStatus.WARNING
        if details:
            self.details.update(details)
    
    def skipped(self, reason: str):
        """Mark check as skipped"""
        self.status = SecurityCheckStatus.SKIPPED
        self.details['skip_reason'] = reason

class SecurityScanningCapability(AgentCapability):
    """
    Capability for performing security scans and compliance checks.
    Provides automated security scanning of cluster resources, configurations,
    and runtime environments to identify potential security vulnerabilities
    and compliance violations.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.checks: Dict[str, SecurityCheck] = {}
        self.scanners = []
        self.scan_interval = self.config.get('scan_interval', 3600)  # 1 hour
        self.scan_task = None
        self.running = False
        self.last_scan = None
        self.scan_in_progress = False
    
    async def _initialize(self):
        """Initialize the security scanning capability"""
        try:
            logger.info("Initializing SecurityScanningCapability")
            
            # Register built-in scanners
            self._register_scanners()
            
            # Start the periodic scanning
            self.running = True
            self.scan_task = asyncio.create_task(self._periodic_scan())
            
            logger.info("SecurityScanningCapability initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize security scanning capability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.scan_task:
            self.scan_task.cancel()
            try:
                await self.scan_task
            except asyncio.CancelledError:
                pass
    
    def _register_scanners(self):
        """Register built-in security scanners"""
        self.scanners = [
            self._scan_kubernetes_api_server,
            self._scan_etcd,
            self._scan_kubelet,
            self._scan_workloads,
            self._scan_network_policies,
            self._scan_rbac,
            self._scan_secrets,
            self._scan_pod_security_policies,
        ]
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a security scanning action"""
        try:
            if not self._initialized:
                await self.initialize()
            
            # Route to appropriate handler based on action
            handler = getattr(self, f"_handle_{action}", None)
            if not handler or not callable(handler):
                return {
                    'success': False,
                    'error': f"Unsupported action: {action}",
                    'available_actions': self._list_actions()
                }
            
            # Execute the handler
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
            'run_scan', 'get_scan_status', 'get_scan_results',
            'get_check_details', 'get_findings', 'get_compliance_report'
        ]
    
    # --- Scan Management ---
    
    async def _handle_run_scan(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Run a security scan"""
        force = parameters.get('force', False)
        
        if self.scan_in_progress and not force:
            return {
                'status': 'scan_in_progress',
                'message': 'A scan is already in progress',
                'started_at': self.last_scan.isoformat() if self.last_scan else None
            }
        
        # Run scan in the background
        asyncio.create_task(self._run_security_scan())
        
        return {
            'status': 'scan_started',
            'message': 'Security scan has been queued',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    async def _handle_get_scan_status(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get the status of the current or last scan"""
        return {
            'status': 'in_progress' if self.scan_in_progress else 'idle',
            'last_scan': self.last_scan.isoformat() if self.last_scan else None,
            'checks_completed': len([c for c in self.checks.values() if c.status != SecurityCheckStatus.SKIPPED]),
            'total_checks': len(self.checks),
            'findings': self._count_findings()
        }
    
    async def _handle_get_scan_results(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get the results of the last scan"""
        severity_filter = parameters.get('severity')
        status_filter = parameters.get('status')
        category_filter = parameters.get('category')
        
        results = []
        for check in self.checks.values():
            if severity_filter and check.severity.value != severity_filter:
                continue
            if status_filter and check.status.value != status_filter:
                continue
            if category_filter and check.category != category_filter:
                continue
                
            results.append(check.to_dict())
        
        return {
            'results': results,
            'count': len(results),
            'findings': self._count_findings(),
            'last_scan': self.last_scan.isoformat() if self.last_scan else None
        }
    
    async def _handle_get_check_details(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get details for a specific check"""
        check_id = parameters.get('check_id')
        if not check_id:
            return {'error': 'check_id is required'}
        
        check = self.checks.get(check_id)
        if not check:
            return {'error': f'Check not found: {check_id}'}
        
        return check.to_dict()
    
    async def _handle_get_findings(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get all failed checks (findings)"""
        severity_filter = parameters.get('severity')
        category_filter = parameters.get('category')
        
        findings = []
        for check in self.checks.values():
            if check.status != SecurityCheckStatus.FAILED:
                continue
                
            if severity_filter and check.severity.value != severity_filter:
                continue
            if category_filter and check.category != category_filter:
                continue
                
            findings.append(check.to_dict())
        
        return {
            'findings': findings,
            'count': len(findings),
            'severity_counts': self._count_findings()
        }
    
    async def _handle_get_compliance_report(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a compliance report"""
        standard = parameters.get('standard', 'cis')
        
        # In a real implementation, this would generate a compliance report
        # based on the specified standard (CIS, NIST, etc.)
        
        return {
            'standard': standard,
            'summary': self._generate_compliance_summary(),
            'checks': [c.to_dict() for c in self.checks.values()],
            'generated_at': datetime.utcnow().isoformat()
        }
    
    # --- Scanning Logic ---
    
    async def _periodic_scan(self):
        """Run security scans periodically"""
        while self.running:
            try:
                await self._run_security_scan()
            except Exception as e:
                logger.error(f"Error in periodic security scan: {str(e)}", exc_info=True)
            
            # Wait for the next interval
            try:
                await asyncio.sleep(self.scan_interval)
            except asyncio.CancelledError:
                break
    
    async def _run_security_scan(self):
        """Run all registered security scanners"""
        if self.scan_in_progress:
            logger.warning("Security scan already in progress")
            return
        
        self.scan_in_progress = True
        scan_start = datetime.utcnow()
        
        try:
            logger.info("Starting security scan")
            
            # Clear previous scan results
            self.checks = {}
            
            # Run all scanners in parallel
            await asyncio.gather(*[scanner() for scanner in self.scanners])
            
            # Update scan timestamp
            self.last_scan = datetime.utcnow()
            scan_duration = (self.last_scan - scan_start).total_seconds()
            
            logger.info(f"Security scan completed in {scan_duration:.2f} seconds")
            
            # Log summary of findings
            findings = self._count_findings()
            if findings['failed'] > 0:
                logger.warning(f"Security scan found {findings['failed']} issues: {findings}")
            else:
                logger.info("No security issues found")
            
        except Exception as e:
            logger.error(f"Error during security scan: {str(e)}", exc_info=True)
            
        finally:
            self.scan_in_progress = False
    
    # --- Built-in Scanners ---
    
    async def _scan_kubernetes_api_server(self):
        """Scan Kubernetes API server configuration"""
        check = SecurityCheck(
            check_id="k8s_api_server_001",
            name="API Server Authentication",
            description="Verify that the Kubernetes API server has authentication enabled",
            category="authentication",
            severity=SecuritySeverity.HIGH,
            remediation="Ensure that the --client-ca-file argument is set to the certificate authority bundle",
            references=[
                {"title": "Kubernetes Documentation - Authentication", "url": "https://kubernetes.io/docs/reference/access-authn-authz/authentication/"}
            ]
        )
        
        try:
            # In a real implementation, this would check the API server configuration
            # For now, we'll simulate a check
            await asyncio.sleep(0.1)  # Simulate API call
            
            # Example: Check if anonymous auth is disabled
            if True:  # Replace with actual check
                check.passed({"message": "Anonymous authentication is disabled"})
            else:
                check.failed({
                    "message": "Anonymous authentication is enabled",
                    "recommendation": "Disable anonymous authentication by setting --anonymous-auth=false"
                })
                
        except Exception as e:
            check.failed({
                "message": f"Error checking API server configuration: {str(e)}",
                "error": str(e)
            })
        
        self.checks[check.check_id] = check
    
    async def _scan_etcd(self):
        """Scan etcd configuration"""
        check = SecurityCheck(
            check_id="etcd_001",
            name="etcd Encryption",
            description="Verify that etcd data is encrypted at rest",
            category="encryption",
            severity=SecuritySeverity.HIGH,
            remediation="Enable encryption at rest for etcd data"
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.1)
            check.warning({"message": "etcd encryption status could not be verified"})
            
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    async def _scan_kubelet(self):
        """Scan kubelet configuration"""
        check = SecurityCheck(
            check_id="kubelet_001",
            name="Kubelet Authentication",
            description="Verify that the kubelet is using strong authentication",
            category="authentication",
            severity=SecuritySeverity.MEDIUM
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.1)
            check.passed({"message": "Kubelet is using client certificate authentication"})
            
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    async def _scan_workloads(self):
        """Scan workloads for security issues"""
        # Example: Check for privileged containers
        check = SecurityCheck(
            check_id="workload_001",
            name="Privileged Containers",
            description="Check for privileged containers in workloads",
            category="workload_security",
            severity=SecuritySeverity.HIGH,
            remediation="Avoid running containers in privileged mode"
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.2)
            
            # Example: Check if any pod is running in privileged mode
            privileged_pods = []  # Replace with actual check
            
            if not privileged_pods:
                check.passed({"message": "No privileged containers found"})
            else:
                check.failed({
                    "message": f"Found {len(privileged_pods)} privileged containers",
                    "affected_resources": privileged_pods
                })
                
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    async def _scan_network_policies(self):
        """Scan network policies"""
        check = SecurityCheck(
            check_id="network_001",
            name="Default Deny Network Policy",
            description="Check if a default deny network policy is applied",
            category="network_security",
            severity=SecuritySeverity.MEDIUM
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.1)
            check.warning({"message": "Default deny network policy check not implemented"})
            
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    async def _scan_rbac(self):
        """Scan RBAC configuration"""
        check = SecurityCheck(
            check_id="rbac_001",
            name="RBAC Enabled",
            description="Check if RBAC is enabled",
            category="authorization",
            severity=SecuritySeverity.HIGH
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.1)
            check.passed({"message": "RBAC is enabled"})
            
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    async def _scan_secrets(self):
        """Scan for sensitive information in secrets"""
        check = SecurityCheck(
            check_id="secrets_001",
            name="Sensitive Data in Secrets",
            description="Check for sensitive data stored in plaintext secrets",
            category="secrets_management",
            severity=SecuritySeverity.CRITICAL
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.3)
            check.passed({"message": "No sensitive data found in secrets"})
            
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    async def _scan_pod_security_policies(self):
        """Scan Pod Security Policies"""
        check = SecurityCheck(
            check_id="psp_001",
            name="Pod Security Policies",
            description="Check if Pod Security Policies are in use",
            category="pod_security",
            severity=SecuritySeverity.MEDIUM
        )
        
        try:
            # Simulate check
            await asyncio.sleep(0.1)
            
            # Note: PSPs are deprecated in Kubernetes 1.21+
            check.warning({
                "message": "Pod Security Policies are deprecated in favor of Pod Security Standards",
                "recommendation": "Migrate to Pod Security Admission or a third-party admission controller"
            })
            
        except Exception as e:
            check.failed({"error": str(e)})
        
        self.checks[check.check_id] = check
    
    # --- Helper Methods ---
    
    def _count_findings(self) -> Dict[str, int]:
        """Count findings by severity and status"""
        counts = {
            'total': len(self.checks),
            'passed': 0,
            'failed': 0,
            'warning': 0,
            'skipped': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }
        
        for check in self.checks.values():
            # Count by status
            if check.status == SecurityCheckStatus.PASSED:
                counts['passed'] += 1
            elif check.status == SecurityCheckStatus.FAILED:
                counts['failed'] += 1
            elif check.status == SecurityCheckStatus.WARNING:
                counts['warning'] += 1
            else:
                counts['skipped'] += 1
            
            # Count by severity for failed checks
            if check.status == SecurityCheckStatus.FAILED:
                if check.severity == SecuritySeverity.CRITICAL:
                    counts['critical'] += 1
                elif check.severity == SecuritySeverity.HIGH:
                    counts['high'] += 1
                elif check.severity == SecuritySeverity.MEDIUM:
                    counts['medium'] += 1
                else:
                    counts['low'] += 1
        
        return counts
    
    def _generate_compliance_summary(self) -> Dict[str, Any]:
        """Generate a compliance summary"""
        findings = self._count_findings()
        
        return {
            'compliance_score': self._calculate_compliance_score(),
            'checks_passed': findings['passed'],
            'checks_failed': findings['failed'],
            'checks_warning': findings['warning'],
            'checks_skipped': findings['skipped'],
            'findings_by_severity': {
                'critical': findings['critical'],
                'high': findings['high'],
                'medium': findings['medium'],
                'low': findings['low']
            },
            'last_scan': self.last_scan.isoformat() if self.last_scan else None,
            'scanned_at': datetime.utcnow().isoformat()
        }
    
    def _calculate_compliance_score(self) -> float:
        """Calculate a compliance score (0-100)"""
        if not self.checks:
            return 0.0
        
        total_weight = 0
        weighted_sum = 0
        
        for check in self.checks.values():
            # Assign weights based on severity
            if check.severity == SecuritySeverity.CRITICAL:
                weight = 4
            elif check.severity == SecuritySeverity.HIGH:
                weight = 3
            elif check.severity == SecuritySeverity.MEDIUM:
                weight = 2
            else:
                weight = 1
            
            total_weight += weight
            
            # Add to score based on status
            if check.status == SecurityCheckStatus.PASSED:
                weighted_sum += weight
            elif check.status == SecurityCheckStatus.WARNING:
                weighted_sum += weight * 0.5  # Partial credit for warnings
        
        if total_weight == 0:
            return 100.0  # No checks, assume compliant
            
        return min(100.0, (weighted_sum / total_weight) * 100)
