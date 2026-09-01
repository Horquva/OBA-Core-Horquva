"""
Arcturus Digital Twin Platform — Security & Access Control Middleware
Provides optional API Key authentication and Role-Based Access Control (RBAC).
"""

from __future__ import annotations

import os
from typing import Optional
from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security.api_key import APIKeyHeader

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


def get_current_role(x_api_key: Optional[str] = Security(api_key_header)) -> str:
    """
    Validates API key and resolves role ('admin', 'operator', 'viewer').
    If no master API key is configured in the environment, development mode is assumed ('admin').
    """
    master_key = os.getenv("ARCTURUS_MASTER_API_KEY", "")
    operator_key = os.getenv("ARCTURUS_OPERATOR_API_KEY", "")

    # Open development mode if keys are unset
    if not master_key and not operator_key:
        return "admin"

    if x_api_key == master_key:
        return "admin"
    elif x_api_key == operator_key:
        return "operator"
    elif not x_api_key:
        return "viewer"
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired API Key",
    )


def require_role(allowed_roles: list[str]):
    """Enforces role hierarchy (admin > operator > viewer)."""
    def role_checker(role: str = Security(get_current_role)):
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {allowed_roles}. Current role: {role}",
            )
        return role
    return role_checker
