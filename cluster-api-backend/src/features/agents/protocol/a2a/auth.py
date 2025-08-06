"""
Authentication and Authorization for A2A Protocol

Handles JWT token generation, validation, and message signing for secure
agent-to-agent communication.
"""
import time
from typing import Any, Dict, Optional, Tuple, Union
from datetime import datetime, timedelta
import jwt
from jwt import PyJWTError
from pydantic import BaseModel, Field

from .message import A2AMessage, MessageHeader, MessagePayload

class AgentClaims(BaseModel):
    """JWT claims for agent authentication."""
    iss: str = Field(..., description="Issuer (agent ID)")
    sub: str = Field(..., description="Subject (usually 'a2a_auth')")
    aud: str = Field(..., description="Audience (target agent ID or '*' for any)")
    iat: int = Field(..., description="Issued at timestamp")
    exp: int = Field(..., description="Expiration timestamp")
    nbf: int = Field(..., description="Not before timestamp")
    jti: str = Field(..., description="JWT ID")
    capabilities: list[str] = Field(default_factory=list, description="List of capabilities")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class AuthConfig(BaseModel):
    """Authentication configuration."""
    secret_key: str = Field(..., description="Secret key for signing tokens")
    algorithm: str = Field("HS256", description="JWT algorithm")
    token_expire_minutes: int = Field(60, description="Token expiration time in minutes")
    clock_skew_seconds: int = Field(30, description="Allowed clock skew in seconds")

class AuthError(Exception):
    """Base class for authentication errors."""
    pass

class InvalidTokenError(AuthError):
    """Raised when a token is invalid."""
    pass

class TokenExpiredError(AuthError):
    """Raised when a token has expired."""
    pass

class InsufficientPermissionsError(AuthError):
    """Raised when an agent doesn't have the required permissions."""
    pass

class Authenticator:
    """Handles authentication and authorization for A2A communication."""
    
    def __init__(self, config: AuthConfig):
        """Initialize the authenticator.
        
        Args:
            config: Authentication configuration
        """
        self.config = config
    
    async def create_token(
        self,
        agent_id: str,
        capabilities: Optional[list[str]] = None,
        audience: str = "*",
        expires_delta: Optional[timedelta] = None,
        metadata: Optional[dict[str, Any]] = None
    ) -> str:
        """Create a JWT token for an agent.
        
        Args:
            agent_id: ID of the agent
            capabilities: List of capabilities the agent has
            audience: Intended audience for the token
            expires_delta: Optional expiration time delta
            metadata: Additional metadata to include in the token
            
        Returns:
            JWT token as a string
        """
        now = datetime.utcnow()
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=self.config.token_expire_minutes)
            
        claims = AgentClaims(
            iss=agent_id,
            sub="a2a_auth",
            aud=audience,
            iat=int(now.timestamp()),
            exp=int(expire.timestamp()),
            nbf=int(now.timestamp() - self.config.clock_skew_seconds),
            jti=str(hash(f"{agent_id}:{now.isoformat()}")),
            capabilities=capabilities or [],
            metadata=metadata or {}
        )
        
        return jwt.encode(
            claims.dict(),
            self.config.secret_key,
            algorithm=self.config.algorithm
        )
    
    async def validate_token(self, token: str, audience: str = "*") -> AgentClaims:
        """Validate a JWT token and return its claims.
        
        Args:
            token: JWT token to validate
            audience: Expected audience for the token
            
        Returns:
            Decoded claims
            
        Raises:
            InvalidTokenError: If the token is invalid
            TokenExpiredError: If the token has expired
        """
        try:
            # Decode the token
            payload = jwt.decode(
                token,
                self.config.secret_key,
                algorithms=[self.config.algorithm],
                options={
                    "verify_signature": True,
                    "verify_iss": False,
                    "verify_aud": audience != "*",
                    "verify_iat": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "leeway": self.config.clock_skew_seconds,
                },
                audience=audience if audience != "*" else None,
            )
            
            return AgentClaims(**payload)
            
        except jwt.ExpiredSignatureError as e:
            raise TokenExpiredError("Token has expired") from e
        except PyJWTError as e:
            raise InvalidTokenError(f"Invalid token: {str(e)}") from e
    
    async def authorize(
        self, 
        token: str, 
        required_capabilities: Optional[list[str]] = None,
        audience: str = "*"
    ) -> AgentClaims:
        """Authorize a token and check for required capabilities.
        
        Args:
            token: JWT token to authorize
            required_capabilities: List of required capabilities
            audience: Expected audience for the token
            
        Returns:
            Decoded claims if authorized
            
        Raises:
            AuthError: If authorization fails
        """
        if not required_capabilities:
            required_capabilities = []
            
        try:
            # Validate the token
            claims = await self.validate_token(token, audience=audience)
            
            # Check for required capabilities
            if required_capabilities:
                missing_capabilities = [
                    cap for cap in required_capabilities 
                    if cap not in (claims.capabilities or [])
                ]
                if missing_capabilities:
                    raise InsufficientPermissionsError(
                        f"Missing required capabilities: {', '.join(missing_capabilities)}"
                    )
            
            return claims
            
        except (InvalidTokenError, TokenExpiredError) as e:
            raise AuthError(f"Authorization failed: {str(e)}") from e
    
    async def sign_message(self, message: A2AMessage, agent_id: str) -> A2AMessage:
        """Sign a message with the agent's credentials.
        
        Args:
            message: Message to sign
            agent_id: ID of the signing agent
            
        Returns:
            Signed message with JWT token in the Authorization header
        """
        # Create a token for the message
        token = await self.create_token(
            agent_id=agent_id,
            audience=message.header.target_agent_id or "*",
            expires_delta=timedelta(seconds=message.header.ttl)
        )
        
        # Add the token to the message headers
        if not message.header.metadata:
            message.header.metadata = {}
        
        message.header.metadata["authorization"] = f"Bearer {token}"
        return message
    
    async def verify_message(self, message: A2AMessage) -> AgentClaims:
        """Verify a message's signature and return the sender's claims.
        
        Args:
            message: Message to verify
            
        Returns:
            Claims from the message's JWT token
            
        Raises:
            AuthError: If verification fails
        """
        if not message.header.metadata or "authorization" not in message.header.metadata:
            raise AuthError("No authorization header in message")
        
        auth_header = message.header.metadata["authorization"]
        if not auth_header.startswith("Bearer "):
            raise AuthError("Invalid authorization header format")
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        audience = message.header.source_agent_id or "*"
        
        return await self.authorize(token, audience=audience)
