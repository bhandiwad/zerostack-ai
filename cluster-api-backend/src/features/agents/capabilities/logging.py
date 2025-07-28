"""
Logging Capability for Agents

Provides structured logging, log aggregation, and log analysis features.
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, List, Optional, Union, Tuple
from .base import AgentCapability

logger = logging.getLogger(__name__)

class LogLevel(str, Enum):
    """Standard log levels"""
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'

class LogSource(str, Enum):
    """Sources of logs"""
    AGENT = 'agent'
    KUBERNETES = 'kubernetes'
    APPLICATION = 'application'
    SYSTEM = 'system'
    AUDIT = 'audit'

class LogEntry:
    """Represents a single log entry"""
    
    def __init__(
        self,
        log_id: str,
        message: str,
        level: LogLevel,
        source: LogSource,
        timestamp: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        correlation_id: Optional[str] = None,
        **kwargs
    ):
        self.log_id = log_id
        self.message = message
        self.level = level
        self.source = source
        self.timestamp = timestamp or datetime.utcnow()
        self.metadata = metadata or {}
        self.tags = tags or []
        self.correlation_id = correlation_id
        
        # Add any additional fields
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert log entry to dictionary"""
        return {
            'log_id': self.log_id,
            'message': self.message,
            'level': self.level.value,
            'source': self.source.value,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata,
            'tags': self.tags,
            'correlation_id': self.correlation_id,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogEntry':
        """Create a log entry from a dictionary"""
        return cls(
            log_id=data['log_id'],
            message=data['message'],
            level=LogLevel(data['level']),
            source=LogSource(data['source']),
            timestamp=datetime.fromisoformat(data['timestamp']),
            metadata=data.get('metadata', {}),
            tags=data.get('tags', []),
            correlation_id=data.get('correlation_id'),
        )

class LoggingCapability(AgentCapability):
    """
    Capability for advanced logging and log management.
    
    Provides structured logging, log aggregation, and log analysis features.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.log_entries: List[LogEntry] = []
        self.max_entries = config.get('max_entries', 10000)  # Default to 10,000 entries
        self.log_level = LogLevel(config.get('log_level', 'info').lower())
        self.retention_days = config.get('retention_days', 30)  # Default 30 days retention
        self.running = False
        self.cleanup_task = None
        self.export_formats = ['json', 'csv', 'text']
        
        # Configure log handlers
        self.handlers: List[logging.Handler] = []
        self._setup_handlers()
    
    async def _initialize(self):
        """Initialize the logging capability"""
        try:
            # Start background cleanup task
            self.running = True
            self.cleanup_task = asyncio.create_task(self._cleanup_old_logs())
            logger.info("Initialized LoggingCapability")
        except Exception as e:
            logger.error(f"Failed to initialize LoggingCapability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        self.running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Clean up handlers
        for handler in self.handlers:
            handler.close()
        self.handlers = []
    
    def _setup_handlers(self):
        """Set up log handlers based on configuration"""
        # Add a console handler by default
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(console_formatter)
        self.handlers.append(console_handler)
        
        # Add any additional handlers from config
        for handler_config in self.config.get('handlers', []):
            try:
                handler = self._create_handler(handler_config)
                if handler:
                    self.handlers.append(handler)
            except Exception as e:
                logger.error(f"Failed to create log handler: {str(e)}")
    
    def _create_handler(self, config: Dict[str, Any]) -> Optional[logging.Handler]:
        """Create a log handler from configuration"""
        handler_type = config.get('type')
        level = getattr(logging, config.get('level', 'INFO').upper(), logging.INFO)
        
        if handler_type == 'file':
            handler = logging.FileHandler(config['filename'])
            handler.setLevel(level)
            formatter = logging.Formatter(config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
            handler.setFormatter(formatter)
            return handler
            
        elif handler_type == 'syslog':
            from logging.handlers import SysLogHandler
            handler = SysLogHandler(address=(config.get('host', 'localhost'), 
                                          config.get('port', 514)))
            handler.setLevel(level)
            return handler
            
        elif handler_type == 'http':
            from logging.handlers import HTTPHandler
            handler = HTTPHandler(
                config.get('host', 'localhost'),
                config.get('path', '/log'),
                method=config.get('method', 'POST'),
                secure=config.get('secure', False)
            )
            handler.setLevel(level)
            return handler
            
        return None
    
    async def _cleanup_old_logs(self):
        """Background task to clean up old log entries"""
        while self.running:
            try:
                cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
                self.log_entries = [entry for entry in self.log_entries 
                                  if entry.timestamp >= cutoff]
                
                # Trim to max entries if needed
                if len(self.log_entries) > self.max_entries:
                    self.log_entries = self.log_entries[-self.max_entries:]
                
                # Sleep for 1 hour between cleanups
                await asyncio.sleep(3600)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in log cleanup task: {str(e)}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying
    
    async def log(
        self,
        message: str,
        level: Union[LogLevel, str] = LogLevel.INFO,
        source: Union[LogSource, str] = LogSource.AGENT,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        correlation_id: Optional[str] = None,
        **kwargs
    ) -> LogEntry:
        """
        Add a log entry
        
        Args:
            message: The log message
            level: Log level (debug, info, warning, error, critical)
            source: Source of the log (agent, kubernetes, application, system, audit)
            metadata: Additional metadata to include with the log
            tags: List of tags for categorization
            correlation_id: Correlation ID for tracing related logs
            **kwargs: Additional fields to include in the log entry
            
        Returns:
            The created LogEntry
        """
        if isinstance(level, str):
            level = LogLevel(level.lower())
        if isinstance(source, str):
            source = LogSource(source.lower())
            
        log_id = f"log_{len(self.log_entries) + 1}"
        entry = LogEntry(
            log_id=log_id,
            message=message,
            level=level,
            source=source,
            metadata=metadata or {},
            tags=tags or [],
            correlation_id=correlation_id,
            **kwargs
        )
        
        self.log_entries.append(entry)
        
        # Forward to Python logging system
        log_method = getattr(logger, level.value, logger.info)
        log_metadata = {
            'source': source.value,
            'tags': tags,
            'correlation_id': correlation_id,
            **metadata or {}
        }
        log_message = f"{message} | {json.dumps(log_metadata)}"
        log_method(log_message)
        
        return entry
    
    async def query_logs(
        self,
        query: Optional[str] = None,
        level: Optional[Union[LogLevel, str]] = None,
        source: Optional[Union[LogSource, str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        tags: Optional[List[str]] = None,
        correlation_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Query log entries
        
        Args:
            query: Text search in message
            level: Filter by log level
            source: Filter by log source
            start_time: Filter logs after this time
            end_time: Filter logs before this time
            tags: Filter by tags (all must match)
            correlation_id: Filter by correlation ID
            limit: Maximum number of results to return
            offset: Offset for pagination
            
        Returns:
            Tuple of (matching_entries, total_count)
        """
        # Convert string enums
        if isinstance(level, str):
            level = LogLevel(level.lower())
        if isinstance(source, str):
            source = LogSource(source.lower())
        
        # Apply filters
        filtered = self.log_entries
        
        if level is not None:
            filtered = [e for e in filtered if e.level == level]
            
        if source is not None:
            filtered = [e for e in filtered if e.source == source]
            
        if start_time is not None:
            filtered = [e for e in filtered if e.timestamp >= start_time]
            
        if end_time is not None:
            filtered = [e for e in filtered if e.timestamp <= end_time]
            
        if tags:
            tag_set = set(tags)
            filtered = [e for e in filtered if tag_set.issubset(set(e.tags))]
            
        if correlation_id is not None:
            filtered = [e for e in filtered if e.correlation_id == correlation_id]
            
        if query:
            query = query.lower()
            filtered = [e for e in filtered if query in e.message.lower()]
        
        # Sort by timestamp (newest first)
        filtered.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        total = len(filtered)
        paginated = filtered[offset:offset + limit]
        
        return [entry.to_dict() for entry in paginated], total
    
    async def export_logs(
        self,
        format: str = 'json',
        **query_params
    ) -> str:
        """
        Export logs in the specified format
        
        Args:
            format: Output format (json, csv, text)
            **query_params: Arguments to pass to query_logs
            
        Returns:
            Exported logs as a string in the specified format
        """
        logs, _ = await self.query_logs(**query_params)
        
        if format == 'json':
            return json.dumps(logs, indent=2)
            
        elif format == 'csv':
            import csv
            from io import StringIO
            
            if not logs:
                return ""
                
            # Get all possible field names
            fieldnames = set()
            for entry in logs:
                fieldnames.update(entry.keys())
            
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=sorted(fieldnames))
            writer.writeheader()
            writer.writerows(logs)
            
            return output.getvalue()
            
        elif format == 'text':
            lines = []
            for entry in logs:
                timestamp = entry.get('timestamp', '')
                level = entry.get('level', 'INFO').upper()
                source = entry.get('source', 'unknown')
                message = entry.get('message', '')
                
                line = f"[{timestamp}] {level} ({source}): {message}"
                if entry.get('metadata'):
                    line += f" | {json.dumps(entry['metadata'])}"
                
                lines.append(line)
            
            return "\n".join(lines)
            
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def get_stats(
        self,
        time_range: str = '24h',
        group_by: str = 'level',
        **query_params
    ) -> Dict[str, Any]:
        """
        Get log statistics
        
        Args:
            time_range: Time range to analyze (e.g., '24h', '7d', '30d')
            group_by: Field to group by (level, source, tag, etc.)
            **query_params: Additional query parameters
            
        Returns:
            Dictionary with statistics
        """
        # Parse time range
        now = datetime.utcnow()
        if time_range.endswith('h'):
            hours = int(time_range[:-1])
            start_time = now - timedelta(hours=hours)
        elif time_range.endswith('d'):
            days = int(time_range[:-1])
            start_time = now - timedelta(days=days)
        else:
            start_time = now - timedelta(hours=24)  # Default to 24h
        
        # Get logs in time range
        logs, _ = await self.query_logs(
            start_time=start_time,
            **query_params
        )
        
        # Calculate statistics
        stats = {
            'total_logs': len(logs),
            'levels': {},
            'sources': {},
            'tags': {},
            'timeline': {},
        }
        
        # Count by level and source
        for entry in logs:
            # Count by level
            level = entry.get('level', 'unknown')
            stats['levels'][level] = stats['levels'].get(level, 0) + 1
            
            # Count by source
            source = entry.get('source', 'unknown')
            stats['sources'][source] = stats['sources'].get(source, 0) + 1
            
            # Count by tags
            for tag in entry.get('tags', []):
                stats['tags'][tag] = stats['tags'].get(tag, 0) + 1
            
            # Group by time bucket (hourly)
            timestamp = datetime.fromisoformat(entry['timestamp'])
            time_bucket = timestamp.replace(minute=0, second=0, microsecond=0).isoformat()
            stats['timeline'][time_bucket] = stats['timeline'].get(time_bucket, 0) + 1
        
        # Convert timeline to sorted list
        stats['timeline'] = [
            {'time': time, 'count': count}
            for time, count in sorted(stats['timeline'].items())
        ]
        
        return stats
    
    # Implement AgentCapability abstract methods
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a logging action
        
        Args:
            action: Action to execute
            parameters: Action parameters
            
        Returns:
            Action result
        """
        handler = getattr(self, f"_handle_{action}", None)
        if not handler or not callable(handler):
            raise ValueError(f"Unknown action: {action}")
            
        return await handler(parameters)
    
    async def get_actions(self) -> List[Dict[str, Any]]:
        """Get list of available actions"""
        return [
            {
                'name': 'log',
                'description': 'Add a log entry',
                'parameters': {
                    'message': {'type': 'string', 'description': 'Log message', 'required': True},
                    'level': {'type': 'string', 'enum': [l.value for l in LogLevel], 'default': 'info'},
                    'source': {'type': 'string', 'enum': [s.value for s in LogSource], 'default': 'agent'},
                    'metadata': {'type': 'object', 'description': 'Additional metadata'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Tags for categorization'},
                    'correlation_id': {'type': 'string', 'description': 'Correlation ID for tracing'},
                }
            },
            {
                'name': 'query',
                'description': 'Query log entries',
                'parameters': {
                    'query': {'type': 'string', 'description': 'Text search in message'},
                    'level': {'type': 'string', 'enum': [l.value for l in LogLevel], 'description': 'Filter by log level'},
                    'source': {'type': 'string', 'enum': [s.value for s in LogSource], 'description': 'Filter by log source'},
                    'start_time': {'type': 'string', 'format': 'date-time', 'description': 'Filter logs after this time'},
                    'end_time': {'type': 'string', 'format': 'date-time', 'description': 'Filter logs before this time'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Filter by tags (all must match)'},
                    'correlation_id': {'type': 'string', 'description': 'Filter by correlation ID'},
                    'limit': {'type': 'integer', 'minimum': 1, 'maximum': 1000, 'default': 100, 'description': 'Maximum number of results'},
                    'offset': {'type': 'integer', 'minimum': 0, 'default': 0, 'description': 'Pagination offset'},
                }
            },
            {
                'name': 'export',
                'description': 'Export logs in various formats',
                'parameters': {
                    'format': {'type': 'string', 'enum': ['json', 'csv', 'text'], 'default': 'json', 'description': 'Output format'},
                    # Include all query parameters
                    'query': {'type': 'string', 'description': 'Text search in message'},
                    'level': {'type': 'string', 'enum': [l.value for l in LogLevel], 'description': 'Filter by log level'},
                    'source': {'type': 'string', 'enum': [s.value for s in LogSource], 'description': 'Filter by log source'},
                    'start_time': {'type': 'string', 'format': 'date-time', 'description': 'Filter logs after this time'},
                    'end_time': {'type': 'string', 'format': 'date-time', 'description': 'Filter logs before this time'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Filter by tags (all must match)'},
                    'correlation_id': {'type': 'string', 'description': 'Filter by correlation ID'},
                }
            },
            {
                'name': 'stats',
                'description': 'Get log statistics',
                'parameters': {
                    'time_range': {'type': 'string', 'default': '24h', 'description': 'Time range for analysis (e.g., 24h, 7d, 30d)'},
                    'group_by': {'type': 'string', 'enum': ['level', 'source', 'tag'], 'default': 'level', 'description': 'Field to group by'},
                    # Include query parameters
                    'query': {'type': 'string', 'description': 'Text search in message'},
                    'level': {'type': 'string', 'enum': [l.value for l in LogLevel], 'description': 'Filter by log level'},
                    'source': {'type': 'string', 'enum': [s.value for s in LogSource], 'description': 'Filter by log source'},
                    'start_time': {'type': 'string', 'format': 'date-time', 'description': 'Filter logs after this time'},
                    'end_time': {'type': 'string', 'format': 'date-time', 'description': 'Filter logs before this time'},
                    'tags': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Filter by tags (all must match)'},
                    'correlation_id': {'type': 'string', 'description': 'Filter by correlation ID'},
                }
            }
        ]
    
    # Action handlers
    
    async def _handle_log(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle log action"""
        entry = await self.log(
            message=parameters['message'],
            level=parameters.get('level', 'info'),
            source=parameters.get('source', 'agent'),
            metadata=parameters.get('metadata'),
            tags=parameters.get('tags', []),
            correlation_id=parameters.get('correlation_id'),
        )
        return {'success': True, 'log_id': entry.log_id}
    
    async def _handle_query(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle query action"""
        # Convert string timestamps to datetime objects
        start_time = parameters.get('start_time')
        if start_time and isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
            
        end_time = parameters.get('end_time')
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        logs, total = await self.query_logs(
            query=parameters.get('query'),
            level=parameters.get('level'),
            source=parameters.get('source'),
            start_time=start_time,
            end_time=end_time,
            tags=parameters.get('tags'),
            correlation_id=parameters.get('correlation_id'),
            limit=parameters.get('limit', 100),
            offset=parameters.get('offset', 0),
        )
        
        return {
            'success': True,
            'data': logs,
            'total': total,
            'limit': parameters.get('limit', 100),
            'offset': parameters.get('offset', 0),
        }
    
    async def _handle_export(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle export action"""
        # Convert string timestamps to datetime objects
        start_time = parameters.get('start_time')
        if start_time and isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
            
        end_time = parameters.get('end_time')
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        # Prepare query parameters
        query_params = {
            'query': parameters.get('query'),
            'level': parameters.get('level'),
            'source': parameters.get('source'),
            'start_time': start_time,
            'end_time': end_time,
            'tags': parameters.get('tags'),
            'correlation_id': parameters.get('correlation_id'),
        }
        
        # Export logs in the specified format
        format = parameters.get('format', 'json')
        exported = await self.export_logs(format=format, **query_params)
        
        return {
            'success': True,
            'format': format,
            'data': exported,
            'content_type': self._get_content_type(format),
        }
    
    async def _handle_stats(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle stats action"""
        # Convert string timestamps to datetime objects
        start_time = parameters.get('start_time')
        if start_time and isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time)
            
        end_time = parameters.get('end_time')
        if end_time and isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time)
        
        # Prepare query parameters
        query_params = {
            'query': parameters.get('query'),
            'level': parameters.get('level'),
            'source': parameters.get('source'),
            'start_time': start_time,
            'end_time': end_time,
            'tags': parameters.get('tags'),
            'correlation_id': parameters.get('correlation_id'),
        }
        
        # Get statistics
        stats = await self.get_stats(
            time_range=parameters.get('time_range', '24h'),
            group_by=parameters.get('group_by', 'level'),
            **query_params
        )
        
        return {
            'success': True,
            'data': stats,
        }
    
    def _get_content_type(self, format: str) -> str:
        """Get content type for the given format"""
        content_types = {
            'json': 'application/json',
            'csv': 'text/csv',
            'text': 'text/plain',
        }
        return content_types.get(format, 'application/octet-stream')
