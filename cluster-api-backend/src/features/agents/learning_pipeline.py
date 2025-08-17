"""
Learning Pipeline for Automated Agent Improvement
Analyzes agent interactions and automatically improves performance
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
from .vector_memory import memory_system
from .enhanced_models import AgentLearningData

logger = logging.getLogger(__name__)

@dataclass
class LearningInsight:
    """Represents a learning insight for agent improvement"""
    insight_id: str
    agent_id: str
    insight_type: str  # 'pattern', 'improvement', 'failure_analysis', 'optimization'
    description: str
    confidence_score: float
    supporting_data: Dict[str, Any]
    recommended_actions: List[str]
    impact_estimate: str  # 'low', 'medium', 'high'
    created_at: datetime

@dataclass
class PerformancePattern:
    """Represents a discovered performance pattern"""
    pattern_id: str
    pattern_type: str
    description: str
    frequency: int
    success_rate: float
    avg_response_time: float
    common_contexts: List[str]
    improvement_suggestions: List[str]

class LearningPipeline:
    """Automated learning pipeline for agent improvement"""
    
    def __init__(self, model_storage_path: str = "./learning_models"):
        self.model_storage_path = model_storage_path
        os.makedirs(model_storage_path, exist_ok=True)
        
        self.insights: List[LearningInsight] = []
        self.patterns: List[PerformancePattern] = []
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.clustering_model = None
        self.learning_history: List[Dict[str, Any]] = []
        
    async def analyze_agent_performance(self, agent_id: str, days_back: int = 30) -> List[LearningInsight]:
        """Analyze agent performance and generate learning insights"""
        try:
            # Get agent performance data
            insights_data = await memory_system.get_agent_performance_insights(agent_id, days_back)
            
            if 'error' in insights_data:
                logger.warning(f"No performance data available for agent {agent_id}")
                return []
            
            # Get interaction contexts for deeper analysis
            contexts = await memory_system.retrieve_relevant_context(
                query=f"agent {agent_id} interactions",
                agent_id=agent_id,
                limit=100
            )
            
            insights = []
            
            # Analyze success rate patterns
            success_rate = insights_data.get('success_rate', 0)
            if success_rate < 85:
                insight = await self._analyze_failure_patterns(agent_id, contexts, insights_data)
                if insight:
                    insights.append(insight)
            
            # Analyze response time patterns
            avg_response_time = insights_data.get('average_response_time', 0)
            if avg_response_time > 3.0:
                insight = await self._analyze_performance_bottlenecks(agent_id, contexts, insights_data)
                if insight:
                    insights.append(insight)
            
            # Analyze escalation patterns
            escalation_dist = insights_data.get('escalation_distribution', {})
            if escalation_dist.get('3', 0) > escalation_dist.get('1', 0):
                insight = await self._analyze_escalation_patterns(agent_id, contexts, insights_data)
                if insight:
                    insights.append(insight)
            
            # Discover task type optimization opportunities
            task_dist = insights_data.get('task_type_distribution', {})
            if task_dist:
                insight = await self._analyze_task_optimization(agent_id, task_dist, contexts)
                if insight:
                    insights.append(insight)
            
            # Store insights
            self.insights.extend(insights)
            
            # Log learning activity
            self.learning_history.append({
                'agent_id': agent_id,
                'analysis_date': datetime.utcnow().isoformat(),
                'insights_generated': len(insights),
                'performance_metrics': insights_data
            })
            
            logger.info(f"Generated {len(insights)} learning insights for agent {agent_id}")
            return insights
            
        except Exception as e:
            logger.error(f"Failed to analyze agent performance for {agent_id}: {str(e)}")
            return []
    
    async def _analyze_failure_patterns(
        self, 
        agent_id: str, 
        contexts: List[Dict[str, Any]], 
        performance_data: Dict[str, Any]
    ) -> Optional[LearningInsight]:
        """Analyze failure patterns to identify improvement opportunities"""
        try:
            failed_interactions = [
                ctx for ctx in contexts 
                if not ctx.get('metadata', {}).get('success', True)
            ]
            
            if len(failed_interactions) < 3:
                return None
            
            # Extract failure reasons and patterns
            failure_texts = [ctx.get('content', '') for ctx in failed_interactions]
            
            if not failure_texts:
                return None
            
            # Vectorize failure descriptions
            try:
                failure_vectors = self.vectorizer.fit_transform(failure_texts)
                
                # Cluster similar failures
                n_clusters = min(3, len(failed_interactions))
                kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                clusters = kmeans.fit_predict(failure_vectors)
                
                # Analyze most common failure cluster
                cluster_counts = np.bincount(clusters)
                main_cluster = np.argmax(cluster_counts)
                main_cluster_failures = [
                    failed_interactions[i] for i, c in enumerate(clusters) if c == main_cluster
                ]
                
                # Generate recommendations
                recommendations = []
                if len(main_cluster_failures) > len(failed_interactions) * 0.5:
                    recommendations.append("Focus training on the most common failure pattern")
                    recommendations.append("Review and update knowledge base for frequent failure scenarios")
                
                # Analyze task types in failures
                task_types = [
                    ctx.get('metadata', {}).get('task_type', 'unknown') 
                    for ctx in main_cluster_failures
                ]
                common_task = max(set(task_types), key=task_types.count) if task_types else 'unknown'
                
                if common_task != 'unknown':
                    recommendations.append(f"Improve capabilities for {common_task} tasks")
                
                return LearningInsight(
                    insight_id=f"failure_analysis_{agent_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    agent_id=agent_id,
                    insight_type='failure_analysis',
                    description=f"Identified {len(main_cluster_failures)} similar failure patterns, primarily in {common_task} tasks",
                    confidence_score=min(0.9, len(main_cluster_failures) / len(failed_interactions)),
                    supporting_data={
                        'total_failures': len(failed_interactions),
                        'main_cluster_size': len(main_cluster_failures),
                        'common_task_type': common_task,
                        'failure_rate': (100 - performance_data.get('success_rate', 0))
                    },
                    recommended_actions=recommendations,
                    impact_estimate='high' if len(main_cluster_failures) > 5 else 'medium',
                    created_at=datetime.utcnow()
                )
                
            except Exception as e:
                logger.warning(f"Failed to vectorize failure texts: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to analyze failure patterns: {str(e)}")
            return None
    
    async def _analyze_performance_bottlenecks(
        self, 
        agent_id: str, 
        contexts: List[Dict[str, Any]], 
        performance_data: Dict[str, Any]
    ) -> Optional[LearningInsight]:
        """Analyze performance bottlenecks and suggest optimizations"""
        try:
            slow_interactions = [
                ctx for ctx in contexts 
                if ctx.get('metadata', {}).get('response_time', 0) > 5.0
            ]
            
            if len(slow_interactions) < 2:
                return None
            
            # Analyze common characteristics of slow interactions
            slow_task_types = [
                ctx.get('metadata', {}).get('task_type', 'unknown') 
                for ctx in slow_interactions
            ]
            
            recommendations = []
            supporting_data = {
                'slow_interactions_count': len(slow_interactions),
                'avg_response_time': performance_data.get('average_response_time', 0),
                'total_interactions': performance_data.get('total_interactions', 0)
            }
            
            # Identify most problematic task type
            if slow_task_types:
                common_slow_task = max(set(slow_task_types), key=slow_task_types.count)
                if common_slow_task != 'unknown':
                    recommendations.append(f"Optimize processing for {common_slow_task} tasks")
                    recommendations.append("Consider caching frequently accessed data")
                    supporting_data['problematic_task_type'] = common_slow_task
            
            # Check if escalation is causing delays
            escalation_dist = performance_data.get('escalation_distribution', {})
            if escalation_dist.get('2', 0) + escalation_dist.get('3', 0) > escalation_dist.get('1', 0):
                recommendations.append("Improve L1 capabilities to reduce escalations")
                recommendations.append("Implement faster escalation decision logic")
            
            recommendations.append("Review AI endpoint response times")
            recommendations.append("Implement response caching for common queries")
            
            return LearningInsight(
                insight_id=f"performance_bottleneck_{agent_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                agent_id=agent_id,
                insight_type='optimization',
                description=f"Identified performance bottlenecks affecting {len(slow_interactions)} interactions",
                confidence_score=min(0.8, len(slow_interactions) / max(len(contexts), 1)),
                supporting_data=supporting_data,
                recommended_actions=recommendations,
                impact_estimate='high' if performance_data.get('average_response_time', 0) > 10 else 'medium',
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze performance bottlenecks: {str(e)}")
            return None
    
    async def _analyze_escalation_patterns(
        self, 
        agent_id: str, 
        contexts: List[Dict[str, Any]], 
        performance_data: Dict[str, Any]
    ) -> Optional[LearningInsight]:
        """Analyze escalation patterns to improve L1/L2 capabilities"""
        try:
            escalated_interactions = [
                ctx for ctx in contexts 
                if ctx.get('metadata', {}).get('escalation_level', 1) > 1
            ]
            
            if len(escalated_interactions) < 2:
                return None
            
            # Analyze what causes escalations
            escalation_reasons = []
            for ctx in escalated_interactions:
                content = ctx.get('content', '').lower()
                if 'complex' in content or 'advanced' in content:
                    escalation_reasons.append('complexity')
                elif 'error' in content or 'failed' in content:
                    escalation_reasons.append('technical_issue')
                elif 'policy' in content or 'permission' in content:
                    escalation_reasons.append('policy_issue')
                else:
                    escalation_reasons.append('unknown')
            
            # Generate recommendations based on escalation patterns
            recommendations = []
            supporting_data = {
                'escalated_interactions': len(escalated_interactions),
                'escalation_distribution': performance_data.get('escalation_distribution', {}),
                'escalation_reasons': dict(zip(*np.unique(escalation_reasons, return_counts=True)))
            }
            
            reason_counts = supporting_data['escalation_reasons']
            most_common_reason = max(reason_counts.keys(), key=reason_counts.get) if reason_counts else 'unknown'
            
            if most_common_reason == 'complexity':
                recommendations.append("Enhance L1 agent with more advanced problem-solving capabilities")
                recommendations.append("Provide additional training data for complex scenarios")
            elif most_common_reason == 'technical_issue':
                recommendations.append("Improve technical troubleshooting knowledge base")
                recommendations.append("Add more diagnostic capabilities to L1 agent")
            elif most_common_reason == 'policy_issue':
                recommendations.append("Update policy knowledge base")
                recommendations.append("Implement policy decision tree for L1 agent")
            
            recommendations.append("Implement escalation prediction to proactively route complex queries")
            
            return LearningInsight(
                insight_id=f"escalation_analysis_{agent_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                agent_id=agent_id,
                insight_type='improvement',
                description=f"High escalation rate detected ({len(escalated_interactions)} escalations), primarily due to {most_common_reason}",
                confidence_score=min(0.85, len(escalated_interactions) / max(len(contexts), 1)),
                supporting_data=supporting_data,
                recommended_actions=recommendations,
                impact_estimate='high',
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze escalation patterns: {str(e)}")
            return None
    
    async def _analyze_task_optimization(
        self, 
        agent_id: str, 
        task_distribution: Dict[str, int], 
        contexts: List[Dict[str, Any]]
    ) -> Optional[LearningInsight]:
        """Analyze task type distribution to identify optimization opportunities"""
        try:
            if not task_distribution:
                return None
            
            total_tasks = sum(task_distribution.values())
            if total_tasks < 5:
                return None
            
            # Find most common task type
            most_common_task = max(task_distribution.keys(), key=task_distribution.get)
            most_common_count = task_distribution[most_common_task]
            
            # Analyze performance for most common task
            task_contexts = [
                ctx for ctx in contexts 
                if ctx.get('metadata', {}).get('task_type') == most_common_task
            ]
            
            if not task_contexts:
                return None
            
            # Calculate success rate for this task type
            successful_tasks = sum(
                1 for ctx in task_contexts 
                if ctx.get('metadata', {}).get('success', True)
            )
            task_success_rate = (successful_tasks / len(task_contexts)) * 100
            
            # Calculate average response time for this task type
            response_times = [
                ctx.get('metadata', {}).get('response_time', 0) 
                for ctx in task_contexts
            ]
            avg_task_response_time = np.mean(response_times) if response_times else 0
            
            recommendations = []
            supporting_data = {
                'most_common_task': most_common_task,
                'task_frequency': most_common_count,
                'task_percentage': (most_common_count / total_tasks) * 100,
                'task_success_rate': task_success_rate,
                'task_avg_response_time': avg_task_response_time,
                'total_task_types': len(task_distribution)
            }
            
            # Generate specific recommendations
            if task_success_rate < 90:
                recommendations.append(f"Focus improvement efforts on {most_common_task} tasks (low success rate)")
                recommendations.append("Analyze failed cases and update training data")
            
            if avg_task_response_time > 3.0:
                recommendations.append(f"Optimize response time for {most_common_task} tasks")
                recommendations.append("Consider specialized handling for frequent task types")
            
            if (most_common_count / total_tasks) > 0.6:
                recommendations.append(f"Create specialized agent or workflow for {most_common_task} tasks")
                recommendations.append("Implement task-specific optimizations")
            
            if not recommendations:
                recommendations.append("Performance is good for most common tasks")
                recommendations.append("Consider expanding capabilities to handle more task types")
            
            impact = 'high' if (most_common_count / total_tasks) > 0.5 else 'medium'
            
            return LearningInsight(
                insight_id=f"task_optimization_{agent_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                agent_id=agent_id,
                insight_type='optimization',
                description=f"Task analysis shows {most_common_task} represents {(most_common_count/total_tasks)*100:.1f}% of workload",
                confidence_score=min(0.9, most_common_count / total_tasks),
                supporting_data=supporting_data,
                recommended_actions=recommendations,
                impact_estimate=impact,
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze task optimization: {str(e)}")
            return None
    
    async def discover_performance_patterns(self, agent_ids: List[str] = None) -> List[PerformancePattern]:
        """Discover performance patterns across agents"""
        try:
            if not agent_ids:
                # Get all active agents from memory system
                stats = await memory_system.get_memory_stats()
                # This is a simplified approach - in practice, you'd get agent IDs from the system
                agent_ids = ['coordinator', 'l1_support', 'l2_support', 'l3_support']
            
            patterns = []
            
            for agent_id in agent_ids:
                try:
                    # Get contexts for pattern analysis
                    contexts = await memory_system.retrieve_relevant_context(
                        query=f"agent {agent_id} patterns",
                        agent_id=agent_id,
                        limit=50
                    )
                    
                    if len(contexts) < 5:
                        continue
                    
                    # Analyze response time patterns
                    response_times = [
                        ctx.get('metadata', {}).get('response_time', 0) 
                        for ctx in contexts
                    ]
                    
                    if response_times:
                        avg_response_time = np.mean(response_times)
                        if avg_response_time > 2.0:
                            pattern = PerformancePattern(
                                pattern_id=f"slow_response_{agent_id}",
                                pattern_type='performance_issue',
                                description=f"Agent {agent_id} shows consistently slow response times",
                                frequency=len([t for t in response_times if t > 3.0]),
                                success_rate=0.0,  # Will be calculated separately
                                avg_response_time=avg_response_time,
                                common_contexts=[ctx.get('content', '')[:100] for ctx in contexts[:3]],
                                improvement_suggestions=[
                                    "Optimize AI endpoint selection",
                                    "Implement response caching",
                                    "Review processing logic"
                                ]
                            )
                            patterns.append(pattern)
                    
                    # Analyze success patterns
                    successful_contexts = [
                        ctx for ctx in contexts 
                        if ctx.get('metadata', {}).get('success', True)
                    ]
                    
                    success_rate = len(successful_contexts) / len(contexts) if contexts else 0
                    
                    if success_rate < 0.8:
                        pattern = PerformancePattern(
                            pattern_id=f"low_success_{agent_id}",
                            pattern_type='quality_issue',
                            description=f"Agent {agent_id} shows low success rate pattern",
                            frequency=len(contexts) - len(successful_contexts),
                            success_rate=success_rate,
                            avg_response_time=np.mean(response_times) if response_times else 0,
                            common_contexts=[ctx.get('content', '')[:100] for ctx in contexts[:3]],
                            improvement_suggestions=[
                                "Review and update training data",
                                "Improve capability matching",
                                "Enhance error handling"
                            ]
                        )
                        patterns.append(pattern)
                
                except Exception as e:
                    logger.warning(f"Failed to analyze patterns for agent {agent_id}: {str(e)}")
                    continue
            
            self.patterns.extend(patterns)
            logger.info(f"Discovered {len(patterns)} performance patterns")
            return patterns
            
        except Exception as e:
            logger.error(f"Failed to discover performance patterns: {str(e)}")
            return []
    
    async def generate_improvement_recommendations(self, agent_id: str) -> Dict[str, Any]:
        """Generate comprehensive improvement recommendations for an agent"""
        try:
            # Get recent insights for the agent
            agent_insights = [
                insight for insight in self.insights 
                if insight.agent_id == agent_id and 
                (datetime.utcnow() - insight.created_at).days <= 7
            ]
            
            if not agent_insights:
                # Generate new insights
                agent_insights = await self.analyze_agent_performance(agent_id)
            
            # Categorize recommendations
            recommendations = {
                'high_priority': [],
                'medium_priority': [],
                'low_priority': [],
                'quick_wins': [],
                'long_term': []
            }
            
            for insight in agent_insights:
                priority = insight.impact_estimate
                actions = insight.recommended_actions
                
                if priority == 'high':
                    recommendations['high_priority'].extend(actions)
                elif priority == 'medium':
                    recommendations['medium_priority'].extend(actions)
                else:
                    recommendations['low_priority'].extend(actions)
                
                # Categorize by implementation complexity
                for action in actions:
                    if any(word in action.lower() for word in ['cache', 'update', 'review']):
                        recommendations['quick_wins'].append(action)
                    elif any(word in action.lower() for word in ['implement', 'create', 'develop']):
                        recommendations['long_term'].append(action)
            
            # Remove duplicates
            for category in recommendations:
                recommendations[category] = list(set(recommendations[category]))
            
            # Add summary statistics
            summary = {
                'total_insights': len(agent_insights),
                'high_impact_insights': len([i for i in agent_insights if i.impact_estimate == 'high']),
                'avg_confidence': np.mean([i.confidence_score for i in agent_insights]) if agent_insights else 0,
                'last_analysis': max([i.created_at for i in agent_insights]).isoformat() if agent_insights else None
            }
            
            return {
                'agent_id': agent_id,
                'analysis_summary': summary,
                'recommendations': recommendations,
                'insights': [
                    {
                        'type': insight.insight_type,
                        'description': insight.description,
                        'confidence': insight.confidence_score,
                        'impact': insight.impact_estimate
                    }
                    for insight in agent_insights
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to generate improvement recommendations for {agent_id}: {str(e)}")
            return {'error': str(e)}
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning pipeline statistics"""
        try:
            total_insights = len(self.insights)
            total_patterns = len(self.patterns)
            
            # Count insights by type
            insight_types = {}
            for insight in self.insights:
                insight_types[insight.insight_type] = insight_types.get(insight.insight_type, 0) + 1
            
            # Count insights by impact
            impact_distribution = {}
            for insight in self.insights:
                impact_distribution[insight.impact_estimate] = impact_distribution.get(insight.impact_estimate, 0) + 1
            
            # Calculate average confidence
            avg_confidence = np.mean([i.confidence_score for i in self.insights]) if self.insights else 0
            
            # Recent activity
            recent_insights = [
                i for i in self.insights 
                if (datetime.utcnow() - i.created_at).days <= 7
            ]
            
            return {
                'total_insights': total_insights,
                'total_patterns': total_patterns,
                'recent_insights': len(recent_insights),
                'insight_types': insight_types,
                'impact_distribution': impact_distribution,
                'average_confidence': round(avg_confidence, 3),
                'learning_history_entries': len(self.learning_history),
                'agents_analyzed': len(set(i.agent_id for i in self.insights))
            }
            
        except Exception as e:
            logger.error(f"Failed to get learning stats: {str(e)}")
            return {'error': str(e)}

# Global learning pipeline instance
learning_pipeline = LearningPipeline()
