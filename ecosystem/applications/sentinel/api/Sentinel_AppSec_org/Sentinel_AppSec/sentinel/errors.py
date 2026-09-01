# sentinel/errors.py
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("sentinel.errors")

async def global_security_exception_handler(request: Request, exc: Exception):
    """
    Catches all unhandled exceptions to prevent stack trace or internal 
    state leakage to the client. Logs the real error internally.
    """
    # 1. Log the actual stack trace securely to internal logging (Suppressing from output)
    logger.error(f"Internal Error on {request.url.path}: {str(exc)}", exc_info=True)
    
    # 2. Return a generic, sanitized response to the client
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please contact support if the issue persists.",
        }
    )