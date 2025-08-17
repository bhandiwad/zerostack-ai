"""
Learning Pipeline API Routes
Provides REST endpoints for automated agent improvement and learning analytics
"""
from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any
from .learning_pipeline import learning_pipeline
import asyncio

logger = logging.getLogger(__name__)

learning_bp = Blueprint('learning', __name__, url_prefix='/api/learning')

def run_async(coro):
    """Helper to run async functions in Flask routes"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@learning_bp.route('/analyze/<agent_id>', methods=['POST'])
def analyze_agent_performance(agent_id: str):
    """Analyze agent performance and generate learning insights"""
    try:
        data = request.get_json() or {}
        days_back = data.get('days_back', 30)
        
        insights = run_async(learning_pipeline.analyze_agent_performance(agent_id, days_back))
        
        return jsonify({
            "status": "success",
            "agent_id": agent_id,
            "insights": [
                {
                    "insight_id": insight.insight_id,
                    "type": insight.insight_type,
                    "description": insight.description,
                    "confidence_score": insight.confidence_score,
                    "impact_estimate": insight.impact_estimate,
                    "recommended_actions": insight.recommended_actions,
                    "supporting_data": insight.supporting_data,
                    "created_at": insight.created_at.isoformat()
                }
                for insight in insights
            ],
            "insights_count": len(insights)
        })
        
    except Exception as e:
        logger.error(f"Failed to analyze agent performance for {agent_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/recommendations/<agent_id>', methods=['GET'])
def get_improvement_recommendations(agent_id: str):
    """Get comprehensive improvement recommendations for an agent"""
    try:
        recommendations = run_async(learning_pipeline.generate_improvement_recommendations(agent_id))
        
        return jsonify({
            "status": "success",
            "recommendations": recommendations
        })
        
    except Exception as e:
        logger.error(f"Failed to get recommendations for {agent_id}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/patterns', methods=['GET'])
def discover_patterns():
    """Discover performance patterns across agents"""
    try:
        agent_ids = request.args.getlist('agent_ids')
        if not agent_ids:
            agent_ids = None
        
        patterns = run_async(learning_pipeline.discover_performance_patterns(agent_ids))
        
        return jsonify({
            "status": "success",
            "patterns": [
                {
                    "pattern_id": pattern.pattern_id,
                    "pattern_type": pattern.pattern_type,
                    "description": pattern.description,
                    "frequency": pattern.frequency,
                    "success_rate": pattern.success_rate,
                    "avg_response_time": pattern.avg_response_time,
                    "common_contexts": pattern.common_contexts,
                    "improvement_suggestions": pattern.improvement_suggestions
                }
                for pattern in patterns
            ],
            "patterns_count": len(patterns)
        })
        
    except Exception as e:
        logger.error(f"Failed to discover patterns: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/stats', methods=['GET'])
def get_learning_stats():
    """Get learning pipeline statistics"""
    try:
        stats = learning_pipeline.get_learning_stats()
        
        return jsonify({
            "status": "success",
            "stats": stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get learning stats: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/insights', methods=['GET'])
def get_all_insights():
    """Get all learning insights with optional filtering"""
    try:
        agent_id = request.args.get('agent_id')
        insight_type = request.args.get('type')
        impact = request.args.get('impact')
        limit = request.args.get('limit', 50, type=int)
        
        insights = learning_pipeline.insights
        
        # Apply filters
        if agent_id:
            insights = [i for i in insights if i.agent_id == agent_id]
        if insight_type:
            insights = [i for i in insights if i.insight_type == insight_type]
        if impact:
            insights = [i for i in insights if i.impact_estimate == impact]
        
        # Sort by creation date (newest first) and limit
        insights = sorted(insights, key=lambda x: x.created_at, reverse=True)[:limit]
        
        return jsonify({
            "status": "success",
            "insights": [
                {
                    "insight_id": insight.insight_id,
                    "agent_id": insight.agent_id,
                    "type": insight.insight_type,
                    "description": insight.description,
                    "confidence_score": insight.confidence_score,
                    "impact_estimate": insight.impact_estimate,
                    "recommended_actions": insight.recommended_actions,
                    "supporting_data": insight.supporting_data,
                    "created_at": insight.created_at.isoformat()
                }
                for insight in insights
            ],
            "total_insights": len(insights),
            "filters_applied": {
                "agent_id": agent_id,
                "type": insight_type,
                "impact": impact,
                "limit": limit
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get insights: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/batch-analyze', methods=['POST'])
def batch_analyze_agents():
    """Analyze multiple agents in batch"""
    try:
        data = request.get_json() or {}
        agent_ids = data.get('agent_ids', [])
        days_back = data.get('days_back', 30)
        
        if not agent_ids:
            return jsonify({
                "status": "error",
                "message": "No agent IDs provided"
            }), 400
        
        results = {}
        total_insights = 0
        
        for agent_id in agent_ids:
            try:
                insights = run_async(learning_pipeline.analyze_agent_performance(agent_id, days_back))
                results[agent_id] = {
                    "status": "success",
                    "insights_count": len(insights),
                    "insights": [
                        {
                            "type": insight.insight_type,
                            "description": insight.description,
                            "confidence_score": insight.confidence_score,
                            "impact_estimate": insight.impact_estimate
                        }
                        for insight in insights
                    ]
                }
                total_insights += len(insights)
            except Exception as e:
                results[agent_id] = {
                    "status": "error",
                    "message": str(e)
                }
        
        return jsonify({
            "status": "success",
            "message": f"Batch analysis completed for {len(agent_ids)} agents",
            "total_insights_generated": total_insights,
            "results": results
        })
        
    except Exception as e:
        logger.error(f"Failed to perform batch analysis: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/test', methods=['POST'])
def test_learning_pipeline():
    """Test the learning pipeline with sample data"""
    try:
        # Test with coordinator agent
        test_agent_id = 'coordinator'
        
        # Analyze performance
        insights = run_async(learning_pipeline.analyze_agent_performance(test_agent_id, 7))
        
        # Get recommendations
        recommendations = run_async(learning_pipeline.generate_improvement_recommendations(test_agent_id))
        
        # Discover patterns
        patterns = run_async(learning_pipeline.discover_performance_patterns([test_agent_id]))
        
        # Get stats
        stats = learning_pipeline.get_learning_stats()
        
        return jsonify({
            "status": "success",
            "message": "Learning pipeline test completed successfully",
            "test_results": {
                "insights_generated": len(insights),
                "recommendations_available": len(recommendations.get('recommendations', {}).get('high_priority', [])),
                "patterns_discovered": len(patterns),
                "pipeline_stats": stats
            },
            "sample_insight": insights[0].__dict__ if insights else None,
            "sample_recommendations": recommendations.get('recommendations', {}).get('high_priority', [])[:3]
        })
        
    except Exception as e:
        logger.error(f"Learning pipeline test failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@learning_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for learning pipeline"""
    try:
        stats = learning_pipeline.get_learning_stats()
        
        return jsonify({
            "status": "healthy",
            "message": "Learning pipeline is operational",
            "total_insights": stats.get('total_insights', 0),
            "agents_analyzed": stats.get('agents_analyzed', 0),
            "recent_insights": stats.get('recent_insights', 0)
        })
        
    except Exception as e:
        logger.error(f"Learning pipeline health check failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
