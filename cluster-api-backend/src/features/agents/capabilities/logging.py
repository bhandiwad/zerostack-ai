"""
Logging Capability for Agents - Fixed Version

Provides structured logging, log aggregation, and log analysis features.
"""
import logging
import json
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Any, List, Optional, Union, Tuple
from .base import AgentCapability
import uuid

logger = logging.getLogger(__name__)

class LogLevel(str, Enum):
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'

class LogSource(str, Enum):
    AGENT = 'agent'
    KUBERNETES = 'kubernetes'
    APPLICATION = 'application'
    SYSTEM = 'system'
    AUDIT = 'audit'

class LogEntry:
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
        
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.log_id,
            'message': self.message,
            'level': self.level.value,
            'source': self.source.value,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata,
            'tags': self.tags,
            'correlation_id': self.correlation_id
        }

class LoggingCapability(AgentCapability):
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config or {})
        self.log_entries: List[LogEntry] = []
        self.max_entries = config.get('max_entries', 10000)
        self.log_level = LogLevel(config.get('log_level', 'info').lower())
        self.retention_days = config.get('retention_days', 30)
        self.running = False
        self.cleanup_task = None
        self.export_formats = ['json', 'csv', 'text']
        self.handlers: List[logging.Handler] = []
        self._setup_handlers()
    
    def _setup_handlers(self):
        if not self.handlers and not logging.getLogger().handlers:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            self.handlers.append(console_handler)
            logging.getLogger().addHandler(console_handler)
    
    def log(
        self,
        message: str,
        level: Union[LogLevel, str] = LogLevel.INFO,
        source: Union[LogSource, str] = LogSource.AGENT,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        correlation_id: Optional[str] = None,
        **kwargs
    ) -> LogEntry:
        if isinstance(level, str):
            level = LogLevel(level.lower())
        if isinstance(source, str):
            source = LogSource(source.lower())
        
        entry = LogEntry(
            log_id=str(uuid.uuid4()),
            message=message,
            level=level,
            source=source,
            metadata=metadata or {},
            tags=tags or [],
            correlation_id=correlation_id,
            **kwargs
        )
        
        self.log_entries.append(entry)
        
        log_method = getattr(logger, level.value, logger.info)
        log_metadata = {'source': source.value}
        if tags:
            log_metadata['tags'] = tags
        if correlation_id:
            log_metadata['correlation_id'] = correlation_id
        if metadata:
            log_metadata.update(metadata)
            
        log_message = f"{message} | {json.dumps(log_metadata)}"
        log_method(log_message)
        
        return entry
