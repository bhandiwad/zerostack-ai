"""
Test suite for predictive analytics functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from features.debugging.predictive_analytics import PredictiveAnalyticsEngine, PredictiveInsight, AnomalyDetection

class TestPredictiveAnalyticsEngine:
    """Test cases for PredictiveAnalyticsEngine"""
    
    @pytest.fixture
    def engine(self):
        return PredictiveAnalyticsEngine()
    
    def test_engine_initialization(self, engine):
        """Test engine initialization"""
        assert engine.historical_data == {}
        assert engine.anomaly_threshold == 0.7
        assert engine.prediction_models == {}
    
    @pytest.mark.asyncio
    async def test_collect_cluster_metrics(self, engine):
        """Test cluster metrics collection"""
        metrics = await engine._collect_cluster_metrics('test_cluster')
        
        assert isinstance(metrics, dict)
        assert 'cpu_usage' in metrics
        assert 'memory_usage' in metrics
        assert 'disk_usage' in metrics
        assert 'network_io' in metrics
        assert 'pod_count' in metrics
        assert 'timestamp' in metrics
        
        # Validate metric ranges
        assert 0 <= metrics['cpu_usage'] <= 100
        assert 0 <= metrics['memory_usage'] <= 100
        assert metrics['pod_count'] > 0
    
    @pytest.mark.asyncio
    async def test_generate_predictive_insights(self, engine):
        """Test predictive insights generation"""
        # Test with high CPU usage
        high_cpu_metrics = {
            'cpu_usage': 85.0,
            'memory_usage': 60.0,
            'api_response_time': 150.0,
            'container_restarts': 3
        }
        
        insights = await engine._generate_predictive_insights(high_cpu_metrics)
        
        assert isinstance(insights, list)
        assert len(insights) > 0
        
        # Should generate CPU exhaustion insight
        cpu_insights = [i for i in insights if i.type == 'resource_exhaustion' and 'CPU' in i.title]
        assert len(cpu_insights) > 0
        
        cpu_insight = cpu_insights[0]
        assert isinstance(cpu_insight, PredictiveInsight)
        assert cpu_insight.probability > 0.5
        assert cpu_insight.severity in ['high', 'medium']
        assert len(cpu_insight.recommended_actions) > 0
    
    @pytest.mark.asyncio
    async def test_detect_anomalies(self, engine):
        """Test anomaly detection"""
        # Test with anomalous metrics
        anomalous_metrics = {
            'cpu_usage': 95.0,  # Very high
            'memory_usage': 20.0,  # Very low
            'api_response_time': 300.0,  # Very high
            'etcd_latency': 15.0,  # High
            'network_io': 2000.0  # High
        }
        
        anomalies = await engine._detect_anomalies(anomalous_metrics)
        
        assert isinstance(anomalies, list)
        assert len(anomalies) > 0
        
        # Check for CPU anomaly
        cpu_anomalies = [a for a in anomalies if a.metric_name == 'cpu_usage']
        assert len(cpu_anomalies) > 0
        
        cpu_anomaly = cpu_anomalies[0]
        assert isinstance(cpu_anomaly, AnomalyDetection)
        assert cpu_anomaly.anomaly_score > 0.5
        assert cpu_anomaly.severity in ['critical', 'high', 'medium']
        assert len(cpu_anomaly.possible_causes) > 0
        assert len(cpu_anomaly.recommended_actions) > 0
    
    @pytest.mark.asyncio
    async def test_calculate_health_trends(self, engine):
        """Test health trends calculation"""
        metrics = {
            'cpu_usage': 70.0,
            'memory_usage': 80.0,
            'api_response_time': 200.0,
            'container_restarts': 5
        }
        
        trends = await engine._calculate_health_trends(metrics)
        
        assert isinstance(trends, dict)
        assert 'overall_trend' in trends
        assert 'cpu_trend' in trends
        assert 'memory_trend' in trends
        assert 'performance_trend' in trends
        
        # Validate trend structure
        assert 'direction' in trends['cpu_trend']
        assert 'rate' in trends['cpu_trend']
        assert 'projection_24h' in trends['cpu_trend']
    
    @pytest.mark.asyncio
    async def test_generate_recommendations(self, engine):
        """Test recommendations generation"""
        # Create test insights and anomalies
        insights = [
            PredictiveInsight(
                id='test_insight',
                type='resource_exhaustion',
                title='Test Critical Insight',
                description='Test description',
                probability=0.8,
                time_to_occurrence='1 hour',
                severity='critical',
                affected_resources=['test-resource'],
                recommended_actions=['Test action'],
                confidence=0.9,
                trend_data={},
                created_at=datetime.now().isoformat()
            )
        ]
        
        anomalies = [
            AnomalyDetection(
                id='test_anomaly',
                metric_name='cpu_usage',
                current_value=95.0,
                expected_value=45.0,
                deviation_percentage=111.1,
                anomaly_score=0.9,
                detection_time=datetime.now().isoformat(),
                severity='high',
                description='Test anomaly',
                possible_causes=['Test cause'],
                recommended_actions=['Test action']
            )
        ]
        
        recommendations = await engine._generate_recommendations(insights, anomalies)
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        
        # Should have recommendations for critical insight and high anomaly
        critical_recs = [r for r in recommendations if r['priority'] == 'critical']
        assert len(critical_recs) > 0
        
        high_recs = [r for r in recommendations if r['priority'] == 'high']
        assert len(high_recs) > 0
    
    def test_calculate_overall_health_score(self, engine):
        """Test overall health score calculation"""
        # Test with healthy metrics
        healthy_metrics = {
            'cpu_usage': 30.0,
            'memory_usage': 40.0,
            'api_response_time': 100.0,
            'failed_pods': 0,
            'container_restarts': 1,
            'unhealthy_nodes': 0
        }
        
        score = engine._calculate_overall_health_score(healthy_metrics, [])
        assert 80 <= score <= 100
        
        # Test with unhealthy metrics
        unhealthy_metrics = {
            'cpu_usage': 95.0,
            'memory_usage': 90.0,
            'api_response_time': 300.0,
            'failed_pods': 5,
            'container_restarts': 10,
            'unhealthy_nodes': 2
        }
        
        critical_anomaly = AnomalyDetection(
            id='critical_test',
            metric_name='cpu_usage',
            current_value=95.0,
            expected_value=45.0,
            deviation_percentage=111.1,
            anomaly_score=0.9,
            detection_time=datetime.now().isoformat(),
            severity='critical',
            description='Critical test',
            possible_causes=['Test'],
            recommended_actions=['Test']
        )
        
        score = engine._calculate_overall_health_score(unhealthy_metrics, [critical_anomaly])
        assert 0 <= score <= 50
    
    @pytest.mark.asyncio
    async def test_analyze_cluster_health_complete(self, engine):
        """Test complete cluster health analysis"""
        analysis = await engine.analyze_cluster_health('test_cluster')
        
        assert isinstance(analysis, dict)
        assert 'cluster_id' in analysis
        assert 'analysis_timestamp' in analysis
        assert 'overall_health_score' in analysis
        assert 'predictive_insights' in analysis
        assert 'anomalies' in analysis
        assert 'health_trends' in analysis
        assert 'recommendations' in analysis
        assert 'metrics_summary' in analysis
        
        # Validate data types
        assert isinstance(analysis['predictive_insights'], list)
        assert isinstance(analysis['anomalies'], list)
        assert isinstance(analysis['health_trends'], dict)
        assert isinstance(analysis['recommendations'], list)
        assert isinstance(analysis['metrics_summary'], dict)
        assert isinstance(analysis['overall_health_score'], (int, float))
    
    def test_get_possible_causes(self, engine):
        """Test possible causes retrieval"""
        cpu_high_causes = engine._get_possible_causes('cpu_usage', True)
        assert isinstance(cpu_high_causes, list)
        assert len(cpu_high_causes) > 0
        
        cpu_low_causes = engine._get_possible_causes('cpu_usage', False)
        assert isinstance(cpu_low_causes, list)
        assert len(cpu_low_causes) > 0
        
        # Different causes for high vs low
        assert cpu_high_causes != cpu_low_causes
    
    def test_get_anomaly_actions(self, engine):
        """Test anomaly actions retrieval"""
        cpu_high_actions = engine._get_anomaly_actions('cpu_usage', True)
        assert isinstance(cpu_high_actions, list)
        assert len(cpu_high_actions) > 0
        
        cpu_low_actions = engine._get_anomaly_actions('cpu_usage', False)
        assert isinstance(cpu_low_actions, list)
        assert len(cpu_low_actions) > 0
        
        # Different actions for high vs low
        assert cpu_high_actions != cpu_low_actions

class TestPredictiveInsight:
    """Test cases for PredictiveInsight dataclass"""
    
    def test_predictive_insight_creation(self):
        """Test PredictiveInsight creation"""
        insight = PredictiveInsight(
            id='test_123',
            type='resource_exhaustion',
            title='Test Insight',
            description='Test description',
            probability=0.75,
            time_to_occurrence='2 hours',
            severity='high',
            affected_resources=['resource1', 'resource2'],
            recommended_actions=['action1', 'action2'],
            confidence=0.85,
            trend_data={'trend': 'increasing'},
            created_at=datetime.now().isoformat()
        )
        
        assert insight.id == 'test_123'
        assert insight.type == 'resource_exhaustion'
        assert insight.probability == 0.75
        assert insight.severity == 'high'
        assert len(insight.affected_resources) == 2
        assert len(insight.recommended_actions) == 2

class TestAnomalyDetection:
    """Test cases for AnomalyDetection dataclass"""
    
    def test_anomaly_detection_creation(self):
        """Test AnomalyDetection creation"""
        anomaly = AnomalyDetection(
            id='anomaly_123',
            metric_name='cpu_usage',
            current_value=95.0,
            expected_value=45.0,
            deviation_percentage=111.1,
            anomaly_score=0.9,
            detection_time=datetime.now().isoformat(),
            severity='critical',
            description='High CPU anomaly detected',
            possible_causes=['High workload', 'Resource leak'],
            recommended_actions=['Scale resources', 'Investigate workload']
        )
        
        assert anomaly.id == 'anomaly_123'
        assert anomaly.metric_name == 'cpu_usage'
        assert anomaly.current_value == 95.0
        assert anomaly.expected_value == 45.0
        assert anomaly.anomaly_score == 0.9
        assert anomaly.severity == 'critical'
        assert len(anomaly.possible_causes) == 2
        assert len(anomaly.recommended_actions) == 2

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
