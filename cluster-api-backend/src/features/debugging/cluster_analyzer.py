"""
AI-Powered Cluster Analysis System
Provides intelligent debugging and proactive issue detection for Kubernetes clusters
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

logger = logging.getLogger(__name__)

class IssueSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class IssueCategory(Enum):
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    NETWORKING = "networking"
    STORAGE = "storage"
    SECURITY = "security"
    PERFORMANCE = "performance"
    CONFIGURATION = "configuration"
    SCALING = "scaling"

@dataclass
class ClusterIssue:
    id: str
    title: str
    description: str
    severity: IssueSeverity
    category: IssueCategory
    affected_resources: List[str]
    recommendations: List[str]
    auto_fixable: bool
    detected_at: datetime
    confidence: float  # 0.0 to 1.0

@dataclass
class ClusterMetrics:
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    pod_count: int
    node_count: int
    failed_pods: int
    pending_pods: int
    network_errors: int
    timestamp: datetime

class AIClusterAnalyzer:
    """AI-powered cluster analysis and debugging system"""
    
    def __init__(self):
        self.llm_openai = None
        self.llm_anthropic = None
        self.analysis_history = []
        self.known_issues = {}
        
    async def initialize_ai_models(self, openai_key: str = None, anthropic_key: str = None):
        """Initialize AI models for analysis"""
        try:
            if openai_key:
                self.llm_openai = ChatOpenAI(
                    model="gpt-4",
                    temperature=0.1,
                    api_key=openai_key
                )
            
            if anthropic_key:
                self.llm_anthropic = ChatAnthropic(
                    model="claude-3-sonnet-20240229",
                    temperature=0.1,
                    api_key=anthropic_key
                )
                
            logger.info("AI models initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize AI models: {str(e)}")
            return False
    
    async def analyze_cluster_health(self, metrics: ClusterMetrics, logs: List[str] = None) -> List[ClusterIssue]:
        """Perform comprehensive cluster health analysis"""
        issues = []
        
        # Rule-based analysis first
        rule_issues = await self._rule_based_analysis(metrics)
        issues.extend(rule_issues)
        
        # AI-powered analysis
        if self.llm_openai or self.llm_anthropic:
            ai_issues = await self._ai_powered_analysis(metrics, logs)
            issues.extend(ai_issues)
        
        # Deduplicate and prioritize issues
        issues = self._deduplicate_issues(issues)
        issues.sort(key=lambda x: (x.severity.value, -x.confidence))
        
        # Store analysis history
        self.analysis_history.append({
            'timestamp': datetime.now(),
            'metrics': metrics,
            'issues_found': len(issues),
            'critical_issues': len([i for i in issues if i.severity == IssueSeverity.CRITICAL])
        })
        
        return issues
    
    async def _rule_based_analysis(self, metrics: ClusterMetrics) -> List[ClusterIssue]:
        """Traditional rule-based analysis for known patterns"""
        issues = []
        
        # CPU exhaustion
        if metrics.cpu_usage > 90:
            issues.append(ClusterIssue(
                id=f"cpu_high_{int(datetime.now().timestamp())}",
                title="High CPU Usage Detected",
                description=f"Cluster CPU usage is at {metrics.cpu_usage:.1f}%, which may cause performance degradation",
                severity=IssueSeverity.HIGH if metrics.cpu_usage > 95 else IssueSeverity.MEDIUM,
                category=IssueCategory.RESOURCE_EXHAUSTION,
                affected_resources=["cluster"],
                recommendations=[
                    "Scale up cluster nodes",
                    "Optimize resource-intensive workloads",
                    "Implement horizontal pod autoscaling"
                ],
                auto_fixable=True,
                detected_at=datetime.now(),
                confidence=0.95
            ))
        
        # Memory exhaustion
        if metrics.memory_usage > 85:
            issues.append(ClusterIssue(
                id=f"memory_high_{int(datetime.now().timestamp())}",
                title="High Memory Usage Detected",
                description=f"Cluster memory usage is at {metrics.memory_usage:.1f}%, approaching critical levels",
                severity=IssueSeverity.CRITICAL if metrics.memory_usage > 95 else IssueSeverity.HIGH,
                category=IssueCategory.RESOURCE_EXHAUSTION,
                affected_resources=["cluster"],
                recommendations=[
                    "Add more memory to nodes",
                    "Optimize memory-intensive applications",
                    "Implement memory limits and requests"
                ],
                auto_fixable=True,
                detected_at=datetime.now(),
                confidence=0.98
            ))
        
        # Failed pods
        if metrics.failed_pods > 0:
            severity = IssueSeverity.CRITICAL if metrics.failed_pods > 5 else IssueSeverity.HIGH
            issues.append(ClusterIssue(
                id=f"failed_pods_{int(datetime.now().timestamp())}",
                title=f"{metrics.failed_pods} Failed Pods Detected",
                description=f"Found {metrics.failed_pods} pods in failed state, indicating application or configuration issues",
                severity=severity,
                category=IssueCategory.CONFIGURATION,
                affected_resources=["pods"],
                recommendations=[
                    "Check pod logs for error details",
                    "Verify resource requirements and limits",
                    "Check node capacity and scheduling constraints"
                ],
                auto_fixable=False,
                detected_at=datetime.now(),
                confidence=1.0
            ))
        
        # Pending pods (scheduling issues)
        if metrics.pending_pods > 0:
            issues.append(ClusterIssue(
                id=f"pending_pods_{int(datetime.now().timestamp())}",
                title=f"{metrics.pending_pods} Pending Pods",
                description=f"Found {metrics.pending_pods} pods stuck in pending state, likely due to resource constraints",
                severity=IssueSeverity.MEDIUM,
                category=IssueCategory.SCALING,
                affected_resources=["pods"],
                recommendations=[
                    "Check node resource availability",
                    "Verify pod resource requests",
                    "Consider adding more nodes to cluster"
                ],
                auto_fixable=True,
                detected_at=datetime.now(),
                confidence=0.9
            ))
        
        return issues
    
    async def _ai_powered_analysis(self, metrics: ClusterMetrics, logs: List[str] = None) -> List[ClusterIssue]:
        """AI-powered analysis using LLM for complex pattern detection"""
        if not (self.llm_openai or self.llm_anthropic):
            return []
        
        try:
            # Prepare context for AI analysis
            context = self._prepare_analysis_context(metrics, logs)
            
            # Choose AI model (prefer OpenAI for this task)
            llm = self.llm_openai if self.llm_openai else self.llm_anthropic
            
            system_prompt = """You are an expert Kubernetes cluster analyst. Analyze the provided cluster metrics and logs to identify potential issues, performance bottlenecks, and optimization opportunities.

Focus on:
1. Subtle patterns that rule-based systems might miss
2. Correlations between different metrics
3. Predictive insights about future issues
4. Root cause analysis for complex problems

Provide your analysis in JSON format with the following structure:
{
  "issues": [
    {
      "title": "Issue title",
      "description": "Detailed description",
      "severity": "critical|high|medium|low|info",
      "category": "resource_exhaustion|networking|storage|security|performance|configuration|scaling",
      "recommendations": ["recommendation1", "recommendation2"],
      "confidence": 0.8
    }
  ]
}"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Analyze this cluster data:\n{context}")
            ]
            
            response = await llm.ainvoke(messages)
            
            # Parse AI response
            ai_issues = self._parse_ai_response(response.content)
            return ai_issues
            
        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}")
            return []
    
    def _prepare_analysis_context(self, metrics: ClusterMetrics, logs: List[str] = None) -> str:
        """Prepare context string for AI analysis"""
        context = f"""
Cluster Metrics (as of {metrics.timestamp}):
- CPU Usage: {metrics.cpu_usage}%
- Memory Usage: {metrics.memory_usage}%
- Disk Usage: {metrics.disk_usage}%
- Total Pods: {metrics.pod_count}
- Total Nodes: {metrics.node_count}
- Failed Pods: {metrics.failed_pods}
- Pending Pods: {metrics.pending_pods}
- Network Errors: {metrics.network_errors}
"""
        
        if logs:
            context += "\nRecent Logs:\n"
            for log in logs[-10:]:  # Last 10 log entries
                context += f"- {log}\n"
        
        # Add historical context if available
        if self.analysis_history:
            context += "\nRecent Analysis History:\n"
            for analysis in self.analysis_history[-3:]:
                context += f"- {analysis['timestamp']}: {analysis['issues_found']} issues found\n"
        
        return context
    
    def _parse_ai_response(self, response_content: str) -> List[ClusterIssue]:
        """Parse AI response and convert to ClusterIssue objects"""
        try:
            # Extract JSON from response
            start_idx = response_content.find('{')
            end_idx = response_content.rfind('}') + 1
            json_str = response_content[start_idx:end_idx]
            
            data = json.loads(json_str)
            issues = []
            
            for issue_data in data.get('issues', []):
                issue = ClusterIssue(
                    id=f"ai_{int(datetime.now().timestamp())}_{len(issues)}",
                    title=issue_data.get('title', 'AI-Detected Issue'),
                    description=issue_data.get('description', ''),
                    severity=IssueSeverity(issue_data.get('severity', 'medium')),
                    category=IssueCategory(issue_data.get('category', 'performance')),
                    affected_resources=['cluster'],
                    recommendations=issue_data.get('recommendations', []),
                    auto_fixable=False,  # AI issues require human review
                    detected_at=datetime.now(),
                    confidence=float(issue_data.get('confidence', 0.7))
                )
                issues.append(issue)
            
            return issues
            
        except Exception as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            return []
    
    def _deduplicate_issues(self, issues: List[ClusterIssue]) -> List[ClusterIssue]:
        """Remove duplicate issues based on title and category"""
        seen = set()
        unique_issues = []
        
        for issue in issues:
            key = (issue.title, issue.category.value)
            if key not in seen:
                seen.add(key)
                unique_issues.append(issue)
        
        return unique_issues
    
    async def get_fix_recommendations(self, issue: ClusterIssue) -> Dict[str, Any]:
        """Get detailed fix recommendations for a specific issue"""
        if not issue.auto_fixable:
            return {
                'auto_fixable': False,
                'manual_steps': issue.recommendations,
                'estimated_time': 'Manual intervention required'
            }
        
        # Generate automated fix steps
        fix_steps = []
        estimated_time = "5-10 minutes"
        
        if issue.category == IssueCategory.RESOURCE_EXHAUSTION:
            if "cpu" in issue.title.lower():
                fix_steps = [
                    "kubectl top nodes",
                    "kubectl get hpa",
                    "kubectl scale deployment <deployment-name> --replicas=<new-count>",
                    "kubectl apply -f horizontal-pod-autoscaler.yaml"
                ]
            elif "memory" in issue.title.lower():
                fix_steps = [
                    "kubectl top pods --sort-by=memory",
                    "kubectl describe nodes",
                    "kubectl apply -f memory-optimized-config.yaml"
                ]
        
        elif issue.category == IssueCategory.SCALING:
            fix_steps = [
                "kubectl get pods -o wide",
                "kubectl describe nodes",
                "kubectl cordon <node-name>",
                "kubectl drain <node-name> --ignore-daemonsets"
            ]
        
        return {
            'auto_fixable': True,
            'fix_steps': fix_steps,
            'estimated_time': estimated_time,
            'risk_level': 'low' if issue.confidence > 0.8 else 'medium'
        }
    
    async def predict_future_issues(self, historical_metrics: List[ClusterMetrics]) -> List[Dict[str, Any]]:
        """Predict potential future issues based on historical trends"""
        if len(historical_metrics) < 3:
            return []
        
        predictions = []
        
        # Analyze CPU trend
        cpu_values = [m.cpu_usage for m in historical_metrics[-10:]]
        if len(cpu_values) >= 3:
            cpu_trend = (cpu_values[-1] - cpu_values[0]) / len(cpu_values)
            if cpu_trend > 2:  # Increasing by 2% per measurement
                predictions.append({
                    'type': 'cpu_exhaustion',
                    'probability': min(0.9, cpu_trend / 10),
                    'estimated_time': '2-4 hours',
                    'description': 'CPU usage trending upward, may reach critical levels'
                })
        
        # Analyze memory trend
        memory_values = [m.memory_usage for m in historical_metrics[-10:]]
        if len(memory_values) >= 3:
            memory_trend = (memory_values[-1] - memory_values[0]) / len(memory_values)
            if memory_trend > 1.5:
                predictions.append({
                    'type': 'memory_exhaustion',
                    'probability': min(0.95, memory_trend / 8),
                    'estimated_time': '1-3 hours',
                    'description': 'Memory usage increasing steadily, intervention may be needed'
                })
        
        return predictions

# Global analyzer instance
cluster_analyzer = AIClusterAnalyzer()
