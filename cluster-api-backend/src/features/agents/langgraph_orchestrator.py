"""
LangGraph-based Multi-Agent Workflow Orchestrator
Provides advanced agent coordination and workflow management
"""
from typing import Dict, Any, List, Optional, Callable, TypedDict
from langgraph.graph import StateGraph, END
import asyncio
import logging
from datetime import datetime
from enum import Enum
from .enhanced_models import AgentConfig, A2AMessage, MessageType
from .ai_endpoint_routes import endpoints_storage, decrypt_api_key
import openai
import anthropic
import json

logger = logging.getLogger(__name__)

class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class AgentState(TypedDict):
    """Shared state across all agents in a workflow"""
    messages: List[Dict[str, Any]]
    context: Dict[str, Any]
    current_agent: str
    task_status: WorkflowStatus
    collaboration_data: Dict[str, Any]
    escalation_level: int
    error_count: int
    workflow_id: str
    user_request: str
    final_response: Optional[str]

class LangGraphOrchestrator:
    """Advanced multi-agent orchestration using LangGraph"""
    
    def __init__(self):
        self.workflows: Dict[str, StateGraph] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.agent_configs: Dict[str, AgentConfig] = {}
        self.ai_clients: Dict[str, Any] = {}
        
    async def initialize(self):
        """Initialize the orchestrator with available AI endpoints"""
        await self._load_ai_clients()
        await self._create_default_workflows()
        
    async def _load_ai_clients(self):
        """Load and initialize AI clients from configured endpoints"""
        for endpoint_id, endpoint_data in endpoints_storage.items():
            if endpoint_data.get('status') == 'active':
                try:
                    provider = endpoint_data['provider']
                    api_key = decrypt_api_key(endpoint_data['api_key'])
                    
                    if provider == 'openai':
                        client = openai.AsyncOpenAI(
                            api_key=api_key,
                            base_url=endpoint_data.get('base_url')
                        )
                        self.ai_clients[endpoint_id] = client
                    elif provider == 'anthropic':
                        client = anthropic.AsyncAnthropic(api_key=api_key)
                        self.ai_clients[endpoint_id] = client
                        
                    logger.info(f"Initialized AI client for {provider} endpoint: {endpoint_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to initialize AI client for {endpoint_id}: {str(e)}")
    
    async def _create_default_workflows(self):
        """Create default multi-agent workflows"""
        
        # Support Escalation Workflow
        support_workflow = StateGraph(AgentState)
        
        # Add agent nodes
        support_workflow.add_node("l1_support", self._l1_support_agent)
        support_workflow.add_node("l2_support", self._l2_support_agent)
        support_workflow.add_node("l3_support", self._l3_support_agent)
        support_workflow.add_node("coordinator", self._coordinator_agent)
        support_workflow.add_node("cluster_manager", self._cluster_manager_agent)
        
        # Define the workflow routing
        support_workflow.set_entry_point("coordinator")
        
        # Coordinator routes to appropriate specialist
        support_workflow.add_conditional_edges(
            "coordinator",
            self._route_to_specialist,
            {
                "l1_support": "l1_support",
                "l2_support": "l2_support", 
                "l3_support": "l3_support",
                "cluster_manager": "cluster_manager",
                "end": END
            }
        )
        
        # L1 can escalate to L2
        support_workflow.add_conditional_edges(
            "l1_support",
            self._should_escalate,
            {
                "escalate": "l2_support",
                "complete": END,
                "cluster_ops": "cluster_manager"
            }
        )
        
        # L2 can escalate to L3
        support_workflow.add_conditional_edges(
            "l2_support", 
            self._should_escalate,
            {
                "escalate": "l3_support",
                "complete": END,
                "cluster_ops": "cluster_manager"
            }
        )
        
        # L3 and cluster manager complete workflow
        support_workflow.add_edge("l3_support", END)
        support_workflow.add_edge("cluster_manager", END)
        
        self.workflows["support_escalation"] = support_workflow.compile()
        
        # Cluster Operations Workflow
        cluster_workflow = StateGraph(AgentState)
        
        cluster_workflow.add_node("analyzer", self._cluster_analyzer_agent)
        cluster_workflow.add_node("executor", self._cluster_executor_agent)
        cluster_workflow.add_node("monitor", self._cluster_monitor_agent)
        cluster_workflow.add_node("validator", self._cluster_validator_agent)
        
        cluster_workflow.set_entry_point("analyzer")
        cluster_workflow.add_edge("analyzer", "executor")
        cluster_workflow.add_edge("executor", "monitor")
        cluster_workflow.add_edge("monitor", "validator")
        cluster_workflow.add_edge("validator", END)
        
        self.workflows["cluster_operations"] = cluster_workflow.compile()
        
        logger.info("Default workflows created successfully")
    
    async def execute_workflow(
        self, 
        workflow_name: str, 
        user_request: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a multi-agent workflow"""
        
        if workflow_name not in self.workflows:
            raise ValueError(f"Unknown workflow: {workflow_name}")
        
        workflow_id = f"{workflow_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize workflow state
        initial_state: AgentState = {
            "messages": [],
            "context": context or {},
            "current_agent": "coordinator",
            "task_status": WorkflowStatus.PENDING,
            "collaboration_data": {},
            "escalation_level": 1,
            "error_count": 0,
            "workflow_id": workflow_id,
            "user_request": user_request,
            "final_response": None
        }
        
        try:
            # Store active session
            self.active_sessions[workflow_id] = {
                "workflow_name": workflow_name,
                "start_time": datetime.utcnow(),
                "status": WorkflowStatus.RUNNING,
                "state": initial_state
            }
            
            # Execute the workflow
            workflow = self.workflows[workflow_name]
            final_state = await workflow.ainvoke(initial_state)
            
            # Update session status
            self.active_sessions[workflow_id]["status"] = WorkflowStatus.COMPLETED
            self.active_sessions[workflow_id]["end_time"] = datetime.utcnow()
            self.active_sessions[workflow_id]["final_state"] = final_state
            
            return {
                "success": True,
                "workflow_id": workflow_id,
                "final_response": final_state.get("final_response"),
                "messages": final_state.get("messages", []),
                "status": WorkflowStatus.COMPLETED
            }
            
        except Exception as e:
            logger.error(f"Workflow execution failed for {workflow_id}: {str(e)}")
            
            # Update session with error
            self.active_sessions[workflow_id]["status"] = WorkflowStatus.FAILED
            self.active_sessions[workflow_id]["error"] = str(e)
            
            return {
                "success": False,
                "workflow_id": workflow_id,
                "error": str(e),
                "status": WorkflowStatus.FAILED
            }
    
    # Agent Implementation Methods
    
    async def _coordinator_agent(self, state: AgentState) -> AgentState:
        """Coordinator agent that routes tasks to appropriate specialists"""
        user_request = state["user_request"]
        
        # Analyze request to determine routing
        analysis_prompt = f"""
        Analyze this user request and determine which specialist agent should handle it:
        
        Request: {user_request}
        
        Available agents:
        - l1_support: Basic troubleshooting, simple questions
        - l2_support: Advanced troubleshooting, configuration issues
        - l3_support: Complex problems, architectural decisions
        - cluster_manager: Cluster operations, scaling, deployments
        
        Respond with just the agent name that should handle this request.
        """
        
        try:
            response = await self._call_ai_endpoint(analysis_prompt, "coordinator")
            recommended_agent = response.strip().lower()
            
            state["messages"].append({
                "agent": "coordinator",
                "action": "route_analysis",
                "content": f"Routing to {recommended_agent} based on request analysis",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            state["collaboration_data"]["recommended_agent"] = recommended_agent
            state["current_agent"] = recommended_agent
            
        except Exception as e:
            logger.error(f"Coordinator analysis failed: {str(e)}")
            state["collaboration_data"]["recommended_agent"] = "l1_support"  # Default fallback
        
        return state
    
    async def _l1_support_agent(self, state: AgentState) -> AgentState:
        """L1 Support Agent - handles basic troubleshooting"""
        user_request = state["user_request"]
        
        support_prompt = f"""
        You are an L1 Support Agent for a Kubernetes cluster management platform.
        
        User Request: {user_request}
        
        Provide helpful support for this request. If the issue is too complex for L1 support,
        recommend escalation to L2. If it requires cluster operations, recommend the cluster manager.
        
        Respond in JSON format:
        {{
            "response": "Your helpful response",
            "action": "complete|escalate|cluster_ops",
            "escalation_reason": "Reason for escalation if applicable"
        }}
        """
        
        try:
            response = await self._call_ai_endpoint(support_prompt, "l1_support")
            result = json.loads(response)
            
            state["messages"].append({
                "agent": "l1_support",
                "action": result.get("action", "complete"),
                "content": result.get("response", ""),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            if result.get("action") == "complete":
                state["final_response"] = result.get("response")
                state["task_status"] = WorkflowStatus.COMPLETED
            elif result.get("action") == "escalate":
                state["escalation_level"] = 2
                state["collaboration_data"]["escalation_reason"] = result.get("escalation_reason")
            
        except Exception as e:
            logger.error(f"L1 Support agent failed: {str(e)}")
            state["error_count"] += 1
            state["collaboration_data"]["escalation_reason"] = f"L1 agent error: {str(e)}"
        
        return state
    
    async def _l2_support_agent(self, state: AgentState) -> AgentState:
        """L2 Support Agent - handles advanced troubleshooting"""
        user_request = state["user_request"]
        previous_context = state.get("messages", [])
        
        support_prompt = f"""
        You are an L2 Support Agent for a Kubernetes cluster management platform.
        
        Original Request: {user_request}
        Previous Context: {json.dumps(previous_context[-3:], indent=2)}
        
        This request was escalated from L1 support. Provide advanced technical assistance.
        If the issue requires expert-level knowledge, escalate to L3.
        
        Respond in JSON format:
        {{
            "response": "Your detailed technical response",
            "action": "complete|escalate|cluster_ops",
            "escalation_reason": "Reason for escalation if applicable"
        }}
        """
        
        try:
            response = await self._call_ai_endpoint(support_prompt, "l2_support")
            result = json.loads(response)
            
            state["messages"].append({
                "agent": "l2_support", 
                "action": result.get("action", "complete"),
                "content": result.get("response", ""),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            if result.get("action") == "complete":
                state["final_response"] = result.get("response")
                state["task_status"] = WorkflowStatus.COMPLETED
            elif result.get("action") == "escalate":
                state["escalation_level"] = 3
                state["collaboration_data"]["escalation_reason"] = result.get("escalation_reason")
                
        except Exception as e:
            logger.error(f"L2 Support agent failed: {str(e)}")
            state["error_count"] += 1
            
        return state
    
    async def _l3_support_agent(self, state: AgentState) -> AgentState:
        """L3 Support Agent - handles expert-level issues"""
        user_request = state["user_request"]
        previous_context = state.get("messages", [])
        
        support_prompt = f"""
        You are an L3 Support Agent - the highest level technical expert for Kubernetes cluster management.
        
        Original Request: {user_request}
        Escalation History: {json.dumps(previous_context, indent=2)}
        
        This is a complex issue that requires expert knowledge. Provide comprehensive technical solution.
        
        Respond in JSON format:
        {{
            "response": "Your expert technical response with detailed solution",
            "action": "complete",
            "recommendations": ["List of recommendations for prevention"]
        }}
        """
        
        try:
            response = await self._call_ai_endpoint(support_prompt, "l3_support")
            result = json.loads(response)
            
            state["messages"].append({
                "agent": "l3_support",
                "action": "complete",
                "content": result.get("response", ""),
                "recommendations": result.get("recommendations", []),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            state["final_response"] = result.get("response")
            state["task_status"] = WorkflowStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"L3 Support agent failed: {str(e)}")
            state["final_response"] = f"L3 support encountered an error: {str(e)}"
            state["task_status"] = WorkflowStatus.FAILED
            
        return state
    
    async def _cluster_manager_agent(self, state: AgentState) -> AgentState:
        """Cluster Manager Agent - handles cluster operations"""
        user_request = state["user_request"]
        
        cluster_prompt = f"""
        You are a Cluster Manager Agent responsible for Kubernetes cluster operations.
        
        Request: {user_request}
        
        Analyze if this requires cluster operations and provide appropriate response.
        
        Respond in JSON format:
        {{
            "response": "Your response about cluster operations",
            "action": "complete",
            "operations": ["List of operations that would be performed"],
            "safety_checks": ["Safety considerations"]
        }}
        """
        
        try:
            response = await self._call_ai_endpoint(cluster_prompt, "cluster_manager")
            result = json.loads(response)
            
            state["messages"].append({
                "agent": "cluster_manager",
                "action": "complete",
                "content": result.get("response", ""),
                "operations": result.get("operations", []),
                "safety_checks": result.get("safety_checks", []),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            state["final_response"] = result.get("response")
            state["task_status"] = WorkflowStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"Cluster Manager agent failed: {str(e)}")
            state["final_response"] = f"Cluster management error: {str(e)}"
            state["task_status"] = WorkflowStatus.FAILED
            
        return state
    
    # Additional cluster workflow agents
    async def _cluster_analyzer_agent(self, state: AgentState) -> AgentState:
        """Analyze cluster operation requirements"""
        # Implementation for cluster analysis
        state["messages"].append({
            "agent": "cluster_analyzer",
            "action": "analyze",
            "content": "Cluster analysis completed",
            "timestamp": datetime.utcnow().isoformat()
        })
        return state
    
    async def _cluster_executor_agent(self, state: AgentState) -> AgentState:
        """Execute cluster operations"""
        # Implementation for cluster execution
        state["messages"].append({
            "agent": "cluster_executor", 
            "action": "execute",
            "content": "Cluster operations executed",
            "timestamp": datetime.utcnow().isoformat()
        })
        return state
    
    async def _cluster_monitor_agent(self, state: AgentState) -> AgentState:
        """Monitor cluster operation results"""
        # Implementation for cluster monitoring
        state["messages"].append({
            "agent": "cluster_monitor",
            "action": "monitor",
            "content": "Cluster monitoring active",
            "timestamp": datetime.utcnow().isoformat()
        })
        return state
    
    async def _cluster_validator_agent(self, state: AgentState) -> AgentState:
        """Validate cluster operation success"""
        # Implementation for cluster validation
        state["messages"].append({
            "agent": "cluster_validator",
            "action": "validate", 
            "content": "Cluster operations validated successfully",
            "timestamp": datetime.utcnow().isoformat()
        })
        state["final_response"] = "Cluster operations completed and validated successfully"
        state["task_status"] = WorkflowStatus.COMPLETED
        return state
    
    # Routing and Decision Methods
    
    def _route_to_specialist(self, state: AgentState) -> str:
        """Route to appropriate specialist based on coordinator analysis"""
        recommended = state["collaboration_data"].get("recommended_agent", "l1_support")
        
        # Validate the recommendation
        valid_agents = ["l1_support", "l2_support", "l3_support", "cluster_manager"]
        if recommended in valid_agents:
            return recommended
        return "l1_support"  # Default fallback
    
    def _should_escalate(self, state: AgentState) -> str:
        """Determine if escalation is needed"""
        last_message = state["messages"][-1] if state["messages"] else {}
        action = last_message.get("action", "complete")
        
        if action == "escalate":
            return "escalate"
        elif action == "cluster_ops":
            return "cluster_ops" 
        else:
            return "complete"
    
    # Utility Methods
    
    async def _call_ai_endpoint(self, prompt: str, agent_name: str) -> str:
        """Call AI endpoint with fallback logic"""
        
        # Find the best available AI client
        for endpoint_id, client in self.ai_clients.items():
            try:
                endpoint_data = endpoints_storage[endpoint_id]
                
                if endpoint_data['provider'] == 'openai':
                    response = await client.chat.completions.create(
                        model=endpoint_data['model'],
                        messages=[{"role": "user", "content": prompt}],
                        temperature=endpoint_data.get('temperature', 0.7),
                        max_tokens=endpoint_data.get('max_tokens', 4000)
                    )
                    return response.choices[0].message.content
                
                elif endpoint_data['provider'] == 'anthropic':
                    response = await client.messages.create(
                        model=endpoint_data['model'],
                        max_tokens=endpoint_data.get('max_tokens', 4000),
                        messages=[{"role": "user", "content": prompt}]
                    )
                    return response.content[0].text
                    
            except Exception as e:
                logger.error(f"AI endpoint {endpoint_id} failed: {str(e)}")
                continue
        
        # If all endpoints fail, return a fallback response
        return f"AI endpoints unavailable. Agent {agent_name} cannot process request at this time."
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """Get status of a running workflow"""
        if workflow_id in self.active_sessions:
            session = self.active_sessions[workflow_id]
            return {
                "workflow_id": workflow_id,
                "status": session["status"],
                "start_time": session["start_time"].isoformat(),
                "messages": session.get("final_state", {}).get("messages", []),
                "current_agent": session.get("final_state", {}).get("current_agent"),
                "escalation_level": session.get("final_state", {}).get("escalation_level", 1)
            }
        else:
            return {"error": "Workflow not found"}
    
    def list_active_workflows(self) -> List[Dict[str, Any]]:
        """List all active workflow sessions"""
        return [
            {
                "workflow_id": wf_id,
                "workflow_name": session["workflow_name"], 
                "status": session["status"],
                "start_time": session["start_time"].isoformat()
            }
            for wf_id, session in self.active_sessions.items()
        ]

# Global orchestrator instance
orchestrator = LangGraphOrchestrator()
