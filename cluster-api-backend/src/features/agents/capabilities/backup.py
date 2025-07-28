"""
Backup and Restore Capability for Agents

Provides functionality to backup and restore agent state, configurations, and data.
"""
import asyncio
import json
import logging
import os
import shutil
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, BinaryIO, Union
import aiofiles
import aiofiles.os

from .base import AgentCapability

logger = logging.getLogger(__name__)

class BackupType(str, Enum):
    """Types of backups"""
    FULL = 'full'           # Complete backup of all data
    CONFIG = 'config'       # Configuration only
    DATA = 'data'           # Data only
    INCREMENTAL = 'incremental'  # Incremental backup since last backup

class BackupStatus(str, Enum):
    """Backup status"""
    PENDING = 'pending'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    FAILED = 'failed'
    RESTORING = 'restoring'

class BackupEntry:
    """Represents a backup entry"""
    
    def __init__(
        self,
        backup_id: str,
        backup_type: BackupType,
        status: BackupStatus = BackupStatus.PENDING,
        created_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        size_bytes: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        **kwargs
    ):
        self.backup_id = backup_id
        self.backup_type = backup_type if isinstance(backup_type, BackupType) else BackupType(backup_type)
        self.status = status if isinstance(status, BackupStatus) else BackupStatus(status)
        self.created_at = created_at or datetime.now(timezone.utc)
        self.completed_at = completed_at
        self.size_bytes = size_bytes
        self.metadata = metadata or {}
        self.tags = tags or []
        
        # Add any additional fields
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'backup_id': self.backup_id,
            'backup_type': self.backup_type.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'size_bytes': self.size_bytes,
            'metadata': self.metadata,
            'tags': self.tags,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BackupEntry':
        """Create from dictionary"""
        return cls(
            backup_id=data['backup_id'],
            backup_type=data['backup_type'],
            status=data['status'],
            created_at=datetime.fromisoformat(data['created_at']) if 'created_at' in data else None,
            completed_at=datetime.fromisoformat(data['completed_at']) if data.get('completed_at') else None,
            size_bytes=data.get('size_bytes', 0),
            metadata=data.get('metadata', {}),
            tags=data.get('tags', []),
        )

class StorageBackend(abc.ABC):
    """Abstract base class for storage backends"""
    
    @abc.abstractmethod
    async def save(self, backup_id: str, source_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Save backup to storage"""
        pass
    
    @abc.abstractmethod
    async def get(self, backup_id: str, destination_path: str) -> Dict[str, Any]:
        """Get backup from storage"""
        pass
    
    @abc.abstractmethod
    async def list(self) -> List[Dict[str, Any]]:
        """List all backups in storage"""
        pass
    
    @abc.abstractmethod
    async def delete(self, backup_id: str) -> bool:
        """Delete a backup from storage"""
        pass

class LocalStorageBackend(StorageBackend):
    """Local filesystem storage backend"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def save(self, backup_id: str, source_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Save backup to local filesystem"""
        dest_path = self.base_path / f"{backup_id}.tar.gz"
        
        # Create a compressed tarball
        with tarfile.open(dest_path, "w:gz") as tar:
            tar.add(source_path, arcname=os.path.basename(source_path))
        
        # Get file size
        size_bytes = os.path.getsize(dest_path)
        
        # Save metadata
        metadata_path = self.base_path / f"{backup_id}.json"
        metadata['size_bytes'] = size_bytes
        metadata['backup_id'] = backup_id
        
        async with aiofiles.open(metadata_path, 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
        
        return {
            'backup_id': backup_id,
            'path': str(dest_path),
            'size_bytes': size_bytes,
            'metadata': metadata,
        }
    
    async def get(self, backup_id: str, destination_path: str) -> Dict[str, Any]:
        """Get backup from local filesystem"""
        backup_path = self.base_path / f"{backup_id}.tar.gz"
        metadata_path = self.base_path / f"{backup_id}.json"
        
        # Check if backup exists
        if not await aiofiles.os.path.exists(backup_path):
            raise FileNotFoundError(f"Backup {backup_id} not found")
        
        # Load metadata
        metadata = {}
        if await aiofiles.os.path.exists(metadata_path):
            async with aiofiles.open(metadata_path, 'r') as f:
                metadata = json.loads(await f.read())
        
        # Extract tarball
        with tarfile.open(backup_path, "r:gz") as tar:
            tar.extractall(path=destination_path)
        
        return {
            'backup_id': backup_id,
            'path': destination_path,
            'metadata': metadata,
        }
    
    async def list(self) -> List[Dict[str, Any]]:
        """List all backups in local storage"""
        backups = []
        
        for file in self.base_path.glob("*.json"):
            try:
                async with aiofiles.open(file, 'r') as f:
                    backups.append(json.loads(await f.read()))
            except Exception as e:
                logger.warning(f"Error reading backup metadata {file}: {str(e)}")
        
        # Sort by creation date (newest first)
        backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return backups
    
    async def delete(self, backup_id: str) -> bool:
        """Delete a backup from local storage"""
        backup_path = self.base_path / f"{backup_id}.tar.gz"
        metadata_path = self.base_path / f"{backup_id}.json"
        
        try:
            if await aiofiles.os.path.exists(backup_path):
                await aiofiles.os.remove(backup_path)
            if await aiofiles.os.path.exists(metadata_path):
                await aiofiles.os.remove(metadata_path)
            return True
        except Exception as e:
            logger.error(f"Error deleting backup {backup_id}: {str(e)}")
            return False

class BackupCapability(AgentCapability):
    """
    Capability for backing up and restoring agent state and data.
    
    Provides functionality to create, manage, and restore backups of the agent's
    configuration, data, and state.
    """
    
    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(agent_id, config)
        self.backups_dir = Path(config.get('backups_dir', '/var/lib/agent/backups'))
        self.backups_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize storage backend
        storage_config = config.get('storage', {'type': 'local'})
        self.storage = self._create_storage_backend(storage_config)
        
        # In-memory backup index
        self.backup_index: Dict[str, BackupEntry] = {}
        self._load_backup_index()
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    def _create_storage_backend(self, config: Dict[str, Any]) -> StorageBackend:
        """Create a storage backend from config"""
        backend_type = config.get('type', 'local')
        
        if backend_type == 'local':
            base_path = Path(config.get('path', self.backups_dir / 'storage'))
            return LocalStorageBackend(str(base_path))
        
        # Add support for other storage backends (S3, GCS, etc.) here
        raise ValueError(f"Unsupported storage backend: {backend_type}")
    
    def _load_backup_index(self):
        """Load backup index from disk"""
        index_file = self.backups_dir / 'backup_index.json'
        
        if index_file.exists():
            try:
                with open(index_file, 'r') as f:
                    data = json.load(f)
                    self.backup_index = {
                        k: BackupEntry.from_dict(v) 
                        for k, v in data.get('backups', {}).items()
                    }
            except Exception as e:
                logger.error(f"Error loading backup index: {str(e)}")
                self.backup_index = {}
    
    async def _save_backup_index(self):
        """Save backup index to disk"""
        index_file = self.backups_dir / 'backup_index.json'
        
        async with self._lock:
            try:
                # Create a copy to avoid modification during serialization
                index_data = {
                    'version': '1.0',
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                    'backups': {k: v.to_dict() for k, v in self.backup_index.items()}
                }
                
                async with aiofiles.open(index_file, 'w') as f:
                    await f.write(json.dumps(index_data, indent=2))
                    
            except Exception as e:
                logger.error(f"Error saving backup index: {str(e)}")
    
    async def _initialize(self):
        """Initialize the backup capability"""
        try:
            # Ensure backup directory exists
            self.backups_dir.mkdir(parents=True, exist_ok=True)
            
            # Load any existing backups
            self._load_backup_index()
            
            logger.info(f"Initialized BackupCapability with {len(self.backup_index)} existing backups")
        except Exception as e:
            logger.error(f"Failed to initialize BackupCapability: {str(e)}")
            raise
    
    async def cleanup(self):
        """Clean up resources"""
        # Nothing to clean up for now
        pass
    
    async def create_backup(
        self,
        backup_type: Union[BackupType, str] = BackupType.FULL,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        include_logs: bool = True,
        include_config: bool = True,
        include_data: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new backup
        
        Args:
            backup_type: Type of backup (full, config, data, incremental)
            description: Optional description of the backup
            tags: List of tags for the backup
            include_logs: Whether to include logs in the backup
            include_config: Whether to include configuration in the backup
            include_data: Whether to include data in the backup
            **kwargs: Additional backup options
            
        Returns:
            Backup information
        """
        if isinstance(backup_type, str):
            backup_type = BackupType(backup_type.lower())
        
        backup_id = f"backup_{int(time.time())}"
        backup_dir = self.backups_dir / backup_id
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Create backup entry
        backup_entry = BackupEntry(
            backup_id=backup_id,
            backup_type=backup_type,
            status=BackupStatus.IN_PROGRESS,
            metadata={
                'description': description,
                'agent_id': self.agent_id,
                'include_logs': include_logs,
                'include_config': include_config,
                'include_data': include_data,
                **kwargs
            },
            tags=tags or [],
        )
        
        # Add to index
        async with self._lock:
            self.backup_index[backup_id] = backup_entry
            await self._save_backup_index()
        
        try:
            # Create backup in a background task
            asyncio.create_task(self._perform_backup(backup_entry, str(backup_dir)))
            
            return {
                'success': True,
                'backup_id': backup_id,
                'status': backup_entry.status.value,
                'message': 'Backup started',
            }
        except Exception as e:
            backup_entry.status = BackupStatus.FAILED
            backup_entry.metadata['error'] = str(e)
            
            async with self._lock:
                self.backup_index[backup_id] = backup_entry
                await self._save_backup_index()
            
            return {
                'success': False,
                'backup_id': backup_id,
                'status': backup_entry.status.value,
                'error': str(e),
            }
    
    async def _perform_backup(self, backup_entry: BackupEntry, backup_dir: str):
        """Perform the actual backup in the background"""
        backup_id = backup_entry.backup_id
        temp_dir = Path(backup_dir)
        
        try:
            # Create backup directory structure
            (temp_dir / 'config').mkdir(exist_ok=True)
            (temp_dir / 'data').mkdir(exist_ok=True)
            (temp_dir / 'logs').mkdir(exist_ok=True)
            
            # Backup configuration
            if backup_entry.metadata.get('include_config', True):
                # TODO: Implement configuration backup
                pass
            
            # Backup data
            if backup_entry.metadata.get('include_data', True):
                # TODO: Implement data backup
                pass
            
            # Backup logs
            if backup_entry.metadata.get('include_logs', True):
                # TODO: Implement log backup
                pass
            
            # Create a manifest file
            manifest = {
                'backup_id': backup_id,
                'backup_type': backup_entry.backup_type.value,
                'created_at': backup_entry.created_at.isoformat(),
                'agent_id': self.agent_id,
                'version': '1.0',
                'metadata': backup_entry.metadata,
            }
            
            with open(temp_dir / 'manifest.json', 'w') as f:
                json.dump(manifest, f, indent=2)
            
            # Save to storage
            storage_info = await self.storage.save(
                backup_id=backup_id,
                source_path=str(temp_dir),
                metadata=manifest
            )
            
            # Update backup entry
            backup_entry.status = BackupStatus.COMPLETED
            backup_entry.completed_at = datetime.now(timezone.utc)
            backup_entry.size_bytes = storage_info.get('size_bytes', 0)
            
            async with self._lock:
                self.backup_index[backup_id] = backup_entry
                await self._save_backup_index()
            
            logger.info(f"Backup {backup_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error during backup {backup_id}: {str(e)}", exc_info=True)
            
            # Update backup entry with error
            backup_entry.status = BackupStatus.FAILED
            backup_entry.completed_at = datetime.now(timezone.utc)
            backup_entry.metadata['error'] = str(e)
            
            async with self._lock:
                self.backup_index[backup_id] = backup_entry
                await self._save_backup_index()
    
    async def list_backups(
        self,
        status: Optional[Union[BackupStatus, str]] = None,
        backup_type: Optional[Union[BackupType, str]] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        List all backups
        
        Args:
            status: Filter by status
            backup_type: Filter by backup type
            limit: Maximum number of results
            offset: Pagination offset
            
        Returns:
            List of backups and pagination info
        """
        if status is not None and isinstance(status, str):
            status = BackupStatus(status.lower())
        if backup_type is not None and isinstance(backup_type, str):
            backup_type = BackupType(backup_type.lower())
        
        # Filter backups
        filtered = []
        for backup in self.backup_index.values():
            if status is not None and backup.status != status:
                continue
            if backup_type is not None and backup.backup_type != backup_type:
                continue
            filtered.append(backup)
        
        # Sort by creation date (newest first)
        filtered.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply pagination
        total = len(filtered)
        paginated = filtered[offset:offset + limit]
        
        return {
            'backups': [b.to_dict() for b in paginated],
            'total': total,
            'limit': limit,
            'offset': offset,
        }
    
    async def get_backup(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """
        Get backup details
        
        Args:
            backup_id: ID of the backup to get
            
        Returns:
            Backup details or None if not found
        """
        backup = self.backup_index.get(backup_id)
        if backup is None:
            return None
            
        return backup.to_dict()
    
    async def restore_backup(
        self,
        backup_id: str,
        restore_config: bool = True,
        restore_data: bool = True,
        restore_logs: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Restore a backup
        
        Args:
            backup_id: ID of the backup to restore
            restore_config: Whether to restore configuration
            restore_data: Whether to restore data
            restore_logs: Whether to restore logs
            **kwargs: Additional restore options
            
        Returns:
            Restore status
        """
        # Get backup entry
        backup_entry = self.backup_index.get(backup_id)
        if backup_entry is None:
            return {
                'success': False,
                'error': f"Backup {backup_id} not found",
            }
        
        # Check if backup is complete
        if backup_entry.status != BackupStatus.COMPLETED:
            return {
                'success': False,
                'error': f"Cannot restore backup with status {backup_entry.status.value}",
            }
        
        # Create a restore task
        restore_id = f"restore_{int(time.time())}"
        
        # Update backup entry
        backup_entry.metadata.setdefault('restores', []).append({
            'restore_id': restore_id,
            'status': 'pending',
            'requested_at': datetime.now(timezone.utc).isoformat(),
            'options': {
                'restore_config': restore_config,
                'restore_data': restore_data,
                'restore_logs': restore_logs,
                **kwargs
            }
        })
        
        async with self._lock:
            self.backup_index[backup_id] = backup_entry
            await self._save_backup_index()
        
        # Start restore in background
        asyncio.create_task(self._perform_restore(backup_id, restore_id, {
            'restore_config': restore_config,
            'restore_data': restore_data,
            'restore_logs': restore_logs,
            **kwargs
        }))
        
        return {
            'success': True,
            'restore_id': restore_id,
            'status': 'pending',
            'message': 'Restore started',
        }
    
    async def _perform_restore(self, backup_id: str, restore_id: str, options: Dict[str, Any]):
        """Perform the actual restore in the background"""
        try:
            # Get backup entry
            backup_entry = self.backup_index.get(backup_id)
            if backup_entry is None:
                logger.error(f"Backup {backup_id} not found for restore {restore_id}")
                return
            
            # Update restore status
            for restore in backup_entry.metadata.get('restores', []):
                if restore.get('restore_id') == restore_id:
                    restore['status'] = 'in_progress'
                    restore['started_at'] = datetime.now(timezone.utc).isoformat()
                    break
            
            async with self._lock:
                self.backup_index[backup_id] = backup_entry
                await self._save_backup_index()
            
            # Create a temporary directory for extraction
            with tempfile.TemporaryDirectory() as temp_dir:
                # Download backup from storage
                await self.storage.get(backup_id, temp_dir)
                
                # Restore configuration
                if options.get('restore_config', True):
                    # TODO: Implement configuration restore
                    pass
                
                # Restore data
                if options.get('restore_data', True):
                    # TODO: Implement data restore
                    pass
                
                # Restore logs
                if options.get('restore_logs', False):
                    # TODO: Implement log restore
                    pass
            
            # Update restore status
            for restore in backup_entry.metadata.get('restores', []):
                if restore.get('restore_id') == restore_id:
                    restore['status'] = 'completed'
                    restore['completed_at'] = datetime.now(timezone.utc).isoformat()
                    break
            
            logger.info(f"Restore {restore_id} of backup {backup_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error during restore {restore_id}: {str(e)}", exc_info=True)
            
            # Update restore status with error
            if 'backup_entry' in locals():
                for restore in backup_entry.metadata.get('restores', []):
                    if restore.get('restore_id') == restore_id:
                        restore['status'] = 'failed'
                        restore['error'] = str(e)
                        restore['completed_at'] = datetime.now(timezone.utc).isoformat()
                        break
        
        # Save updated backup entry
        if 'backup_entry' in locals():
            async with self._lock:
                self.backup_index[backup_id] = backup_entry
                await self._save_backup_index()
    
    async def delete_backup(self, backup_id: str) -> Dict[str, Any]:
        """
        Delete a backup
        
        Args:
            backup_id: ID of the backup to delete
            
        Returns:
            Delete status
        """
        # Get backup entry
        backup_entry = self.backup_index.get(backup_id)
        if backup_entry is None:
            return {
                'success': False,
                'error': f"Backup {backup_id} not found",
            }
        
        # Delete from storage
        try:
            await self.storage.delete(backup_id)
        except Exception as e:
            logger.error(f"Error deleting backup {backup_id} from storage: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to delete backup from storage: {str(e)}",
            }
        
        # Remove from index
        async with self._lock:
            self.backup_index.pop(backup_id, None)
            await self._save_backup_index()
        
        return {
            'success': True,
            'message': f"Backup {backup_id} deleted",
        }
    
    # Implement AgentCapability abstract methods
    
    async def execute(self, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a backup action
        
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
                'name': 'create',
                'description': 'Create a new backup',
                'parameters': {
                    'backup_type': {
                        'type': 'string',
                        'enum': [t.value for t in BackupType],
                        'default': 'full',
                        'description': 'Type of backup to create',
                    },
                    'description': {
                        'type': 'string',
                        'description': 'Description of the backup',
                    },
                    'tags': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Tags for the backup',
                    },
                    'include_logs': {
                        'type': 'boolean',
                        'default': True,
                        'description': 'Include logs in the backup',
                    },
                    'include_config': {
                        'type': 'boolean',
                        'default': True,
                        'description': 'Include configuration in the backup',
                    },
                    'include_data': {
                        'type': 'boolean',
                        'default': True,
                        'description': 'Include data in the backup',
                    },
                },
            },
            {
                'name': 'list',
                'description': 'List all backups',
                'parameters': {
                    'status': {
                        'type': 'string',
                        'enum': [s.value for s in BackupStatus],
                        'description': 'Filter by status',
                    },
                    'backup_type': {
                        'type': 'string',
                        'enum': [t.value for t in BackupType],
                        'description': 'Filter by backup type',
                    },
                    'limit': {
                        'type': 'integer',
                        'minimum': 1,
                        'maximum': 1000,
                        'default': 100,
                        'description': 'Maximum number of results',
                    },
                    'offset': {
                        'type': 'integer',
                        'minimum': 0,
                        'default': 0,
                        'description': 'Pagination offset',
                    },
                },
            },
            {
                'name': 'get',
                'description': 'Get backup details',
                'parameters': {
                    'backup_id': {
                        'type': 'string',
                        'required': True,
                        'description': 'ID of the backup to get',
                    },
                },
            },
            {
                'name': 'restore',
                'description': 'Restore a backup',
                'parameters': {
                    'backup_id': {
                        'type': 'string',
                        'required': True,
                        'description': 'ID of the backup to restore',
                    },
                    'restore_config': {
                        'type': 'boolean',
                        'default': True,
                        'description': 'Restore configuration',
                    },
                    'restore_data': {
                        'type': 'boolean',
                        'default': True,
                        'description': 'Restore data',
                    },
                    'restore_logs': {
                        'type': 'boolean',
                        'default': False,
                        'description': 'Restore logs',
                    },
                },
            },
            {
                'name': 'delete',
                'description': 'Delete a backup',
                'parameters': {
                    'backup_id': {
                        'type': 'string',
                        'required': True,
                        'description': 'ID of the backup to delete',
                    },
                },
            },
        ]
    
    # Action handlers
    
    async def _handle_create(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle create backup action"""
        return await self.create_backup(
            backup_type=parameters.get('backup_type', 'full'),
            description=parameters.get('description'),
            tags=parameters.get('tags'),
            include_logs=parameters.get('include_logs', True),
            include_config=parameters.get('include_config', True),
            include_data=parameters.get('include_data', True),
        )
    
    async def _handle_list(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle list backups action"""
        result = await self.list_backups(
            status=parameters.get('status'),
            backup_type=parameters.get('backup_type'),
            limit=parameters.get('limit', 100),
            offset=parameters.get('offset', 0),
        )
        
        return {
            'success': True,
            'data': result['backups'],
            'pagination': {
                'total': result['total'],
                'limit': result['limit'],
                'offset': result['offset'],
            },
        }
    
    async def _handle_get(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle get backup action"""
        backup_id = parameters.get('backup_id')
        if not backup_id:
            return {
                'success': False,
                'error': 'Missing required parameter: backup_id',
            }
        
        backup = await self.get_backup(backup_id)
        if backup is None:
            return {
                'success': False,
                'error': f'Backup {backup_id} not found',
            }
        
        return {
            'success': True,
            'data': backup,
        }
    
    async def _handle_restore(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle restore backup action"""
        backup_id = parameters.get('backup_id')
        if not backup_id:
            return {
                'success': False,
                'error': 'Missing required parameter: backup_id',
            }
        
        return await self.restore_backup(
            backup_id=backup_id,
            restore_config=parameters.get('restore_config', True),
            restore_data=parameters.get('restore_data', True),
            restore_logs=parameters.get('restore_logs', False),
        )
    
    async def _handle_delete(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle delete backup action"""
        backup_id = parameters.get('backup_id')
        if not backup_id:
            return {
                'success': False,
                'error': 'Missing required parameter: backup_id',
            }
        
        return await self.delete_backup(backup_id)
