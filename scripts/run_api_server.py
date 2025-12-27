#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Standalone API Server Runner - Run the Orchestrator API Server independently.

This script runs the FastAPI-based HTTP/WebSocket server without starting
any orchestration. It's useful for:
- Dashboard monitoring of all running orchestrator instances
- Development with hot-reload enabled
- Running the API server on a different port/host than default
- Separating API server from orchestrator processes

The API server can monitor multiple orchestrator instances that were started
with --api-server or are running independently.

Usage:
    # Run with default settings
    python scripts/run_api_server.py

    # Specify host and port
    python scripts/run_api_server.py --host 0.0.0.0 --port 8080

    # Enable hot-reload for development
    python scripts/run_api_server.py --reload

    # Quiet mode (minimal logging)
    python scripts/run_api_server.py --quiet

    # Debug mode (verbose logging)
    python scripts/run_api_server.py --debug

Part of the orchestrator API server implementation.
"""

import argparse
import asyncio
import logging
import os
import signal
import sys
from pathlib import Path
from typing import Optional

# Ensure project root is in path for imports
_script_dir = Path(__file__).parent
_project_root = _script_dir.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))


def setup_logging(level: str = "info", quiet: bool = False) -> logging.Logger:
    """Configure logging for the API server.

    Args:
        level: Log level (debug, info, warning, error).
        quiet: If True, minimize output.

    Returns:
        Configured logger.
    """
    log_level = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
    }.get(level.lower(), logging.INFO)

    if quiet:
        log_level = logging.WARNING

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    return logging.getLogger("api_server")


def check_dependencies() -> bool:
    """Check if required dependencies are installed.

    Returns:
        True if all dependencies are available.
    """
    try:
        import uvicorn  # noqa: F401
        import fastapi  # noqa: F401
        return True
    except ImportError as e:
        print(f"Missing dependency: {e.name}")
        print("\nInstall required packages with:")
        print("  pip install fastapi uvicorn websockets")
        return False


def run_server(
    host: str = "127.0.0.1",
    port: int = 8000,
    reload: bool = False,
    log_level: str = "info",
    workers: int = 1,
    access_log: bool = True,
) -> None:
    """Run the FastAPI server with uvicorn.

    Args:
        host: Host to bind to.
        port: Port to listen on.
        reload: Enable hot-reload (development mode).
        log_level: Uvicorn log level.
        workers: Number of worker processes (ignored if reload=True).
        access_log: Enable access logging.
    """
    import uvicorn

    # When running directly, we need to use the module path for reload to work
    app_path = "scripts.orchestrator_server:app"

    # Log startup info
    logger = logging.getLogger("api_server")
    logger.info(f"Starting Orchestrator API Server")
    logger.info(f"Host: {host}")
    logger.info(f"Port: {port}")
    logger.info(f"Reload: {'enabled' if reload else 'disabled'}")
    logger.info(f"Docs: http://{host if host != '0.0.0.0' else 'localhost'}:{port}/docs")

    # Run uvicorn
    uvicorn.run(
        app_path,
        host=host,
        port=port,
        reload=reload,
        log_level=log_level.lower(),
        workers=1 if reload else workers,
        access_log=access_log,
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Run the Orchestrator API Server independently.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Run with defaults (localhost:8000)
    python scripts/run_api_server.py

    # Expose to network on port 8080
    python scripts/run_api_server.py --host 0.0.0.0 --port 8080

    # Development mode with auto-reload
    python scripts/run_api_server.py --reload

    # Production mode with multiple workers
    python scripts/run_api_server.py --workers 4

API Documentation:
    Once running, visit http://localhost:8000/docs for interactive API docs.
    OpenAPI spec is available at http://localhost:8000/openapi.json
""",
    )

    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to listen on (default: 8000)",
    )

    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable hot-reload for development",
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (default: 1, ignored with --reload)",
    )

    parser.add_argument(
        "--log-level",
        type=str,
        choices=["debug", "info", "warning", "error"],
        default="info",
        help="Log level (default: info)",
    )

    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Minimize logging output",
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging (overrides --log-level)",
    )

    parser.add_argument(
        "--no-access-log",
        action="store_true",
        help="Disable access logging",
    )

    args = parser.parse_args()

    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    # Setup logging
    log_level = "debug" if args.debug else args.log_level
    logger = setup_logging(level=log_level, quiet=args.quiet)

    # Handle keyboard interrupt gracefully
    def signal_handler(sig, frame):
        logger.info("Shutting down...")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        run_server(
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level=log_level,
            workers=args.workers,
            access_log=not args.no_access_log,
        )
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
