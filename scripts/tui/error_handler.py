#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Error Handling and Recovery for TUI.

This module provides graceful error handling and recovery mechanisms:
- ErrorHandler: Catches and displays errors without crashing
- ErrorRecovery: Attempts automatic recovery from common errors
- ErrorNotifier: Shows error notifications in the TUI

Usage:
    from scripts.tui.error_handler import ErrorHandler, ErrorRecovery

    error_handler = ErrorHandler()
    with error_handler.catch_errors():
        # Code that might fail
        risky_operation()

    # Or decorate functions
    @error_handler.recoverable
    def my_function():
        ...
"""

import functools
import logging
import os
import sys
import time
import traceback
from dataclasses import dataclass, field
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Type, Union
from contextlib import contextmanager

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False


# Configure logging
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Severity levels for errors."""
    INFO = auto()      # Informational, not really an error
    WARNING = auto()   # Warning, operation might be degraded
    ERROR = auto()     # Error, operation failed but TUI can continue
    CRITICAL = auto()  # Critical, TUI should consider shutdown


class ErrorCategory(Enum):
    """Categories of errors for recovery strategies."""
    FILE_NOT_FOUND = auto()
    PERMISSION_DENIED = auto()
    JSON_PARSE_ERROR = auto()
    NETWORK_ERROR = auto()
    STATUS_FILE_ERROR = auto()
    RENDER_ERROR = auto()
    KEYBOARD_ERROR = auto()
    CONFIG_ERROR = auto()
    UNKNOWN = auto()


@dataclass
class TUIError:
    """Represents an error that occurred in the TUI."""
    message: str
    severity: ErrorSeverity
    category: ErrorCategory
    exception: Optional[Exception] = None
    timestamp: float = field(default_factory=time.time)
    recoverable: bool = True
    recovery_attempted: bool = False
    recovery_successful: bool = False

    def __str__(self) -> str:
        return f"[{self.severity.name}] {self.category.name}: {self.message}"


class ErrorRecovery:
    """
    Attempts automatic recovery from common errors.

    Strategies:
    - FILE_NOT_FOUND: Create missing directories, use defaults
    - PERMISSION_DENIED: Try alternative paths, warn user
    - JSON_PARSE_ERROR: Use default values, backup corrupt file
    - STATUS_FILE_ERROR: Reinitialize status.json
    - RENDER_ERROR: Switch to fallback rendering
    - CONFIG_ERROR: Reset to default config
    """

    def __init__(self):
        """Initialize the error recovery system."""
        self._recovery_strategies: Dict[ErrorCategory, Callable[[TUIError], bool]] = {
            ErrorCategory.FILE_NOT_FOUND: self._recover_file_not_found,
            ErrorCategory.PERMISSION_DENIED: self._recover_permission_denied,
            ErrorCategory.JSON_PARSE_ERROR: self._recover_json_parse,
            ErrorCategory.STATUS_FILE_ERROR: self._recover_status_file,
            ErrorCategory.CONFIG_ERROR: self._recover_config_error,
            ErrorCategory.RENDER_ERROR: self._recover_render_error,
        }

    def attempt_recovery(self, error: TUIError) -> bool:
        """
        Attempt to recover from an error.

        Args:
            error: The TUIError to recover from

        Returns:
            True if recovery was successful
        """
        if not error.recoverable:
            return False

        strategy = self._recovery_strategies.get(error.category)
        if not strategy:
            return False

        try:
            error.recovery_attempted = True
            success = strategy(error)
            error.recovery_successful = success
            return success
        except Exception as e:
            logger.warning(f"Recovery failed: {e}")
            return False

    def _recover_file_not_found(self, error: TUIError) -> bool:
        """Recover from file not found errors."""
        # Extract path from error message or exception
        if error.exception and hasattr(error.exception, 'filename'):
            path = Path(error.exception.filename)
            # Try to create parent directory
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                return True
            except Exception:
                pass
        return False

    def _recover_permission_denied(self, error: TUIError) -> bool:
        """Recover from permission denied errors."""
        # Log warning - user needs to fix permissions
        logger.warning(f"Permission denied: {error.message}")
        return False

    def _recover_json_parse(self, error: TUIError) -> bool:
        """Recover from JSON parse errors."""
        # Try to backup corrupt file
        if error.exception and hasattr(error.exception, 'doc'):
            # We could backup the file here
            pass
        return False

    def _recover_status_file(self, error: TUIError) -> bool:
        """Recover from status file errors."""
        # Status file recovery is handled by status-cli.js
        return False

    def _recover_config_error(self, error: TUIError) -> bool:
        """Recover from config errors by resetting to defaults."""
        try:
            from scripts.tui.config import get_config_manager
            manager = get_config_manager()
            manager.reset()
            return True
        except Exception:
            return False

    def _recover_render_error(self, error: TUIError) -> bool:
        """Recover from render errors."""
        # Render errors usually recover on next refresh
        return True


class ErrorNotifier:
    """
    Displays error notifications in the TUI.

    Shows errors as:
    - Status bar messages for minor errors
    - Modal overlays for critical errors
    - Log entries for debugging
    """

    def __init__(self, tui_manager: Optional[Any] = None):
        """
        Initialize the error notifier.

        Args:
            tui_manager: Optional RichTUIManager instance for display
        """
        self._tui_manager = tui_manager
        self._recent_errors: List[TUIError] = []
        self._max_errors = 100
        self._error_count = 0

    def attach_tui(self, tui_manager: Any):
        """Attach a TUI manager for error display."""
        self._tui_manager = tui_manager

    def notify(self, error: TUIError):
        """
        Notify the user of an error.

        Args:
            error: The TUIError to notify about
        """
        self._recent_errors.append(error)
        self._error_count += 1

        # Trim old errors
        if len(self._recent_errors) > self._max_errors:
            self._recent_errors = self._recent_errors[-self._max_errors:]

        # Display based on severity
        if error.severity == ErrorSeverity.INFO:
            self._show_info(error)
        elif error.severity == ErrorSeverity.WARNING:
            self._show_warning(error)
        elif error.severity == ErrorSeverity.ERROR:
            self._show_error(error)
        elif error.severity == ErrorSeverity.CRITICAL:
            self._show_critical(error)

    def _show_info(self, error: TUIError):
        """Show informational message."""
        if self._tui_manager:
            self._tui_manager.set_status(f"[INFO] {error.message}")

    def _show_warning(self, error: TUIError):
        """Show warning message."""
        if self._tui_manager:
            self._tui_manager.set_status(f"⚠ {error.message}")
        else:
            logger.warning(error.message)

    def _show_error(self, error: TUIError):
        """Show error message."""
        if self._tui_manager:
            self._tui_manager.set_status(f"✗ Error: {error.message}")
        else:
            logger.error(error.message)

    def _show_critical(self, error: TUIError):
        """Show critical error message."""
        if self._tui_manager:
            self._tui_manager.set_status(f"⚠ CRITICAL: {error.message}")
        logger.critical(error.message)

    def get_recent_errors(self, count: int = 10) -> List[TUIError]:
        """Get recent errors."""
        return self._recent_errors[-count:]

    @property
    def error_count(self) -> int:
        """Get total error count."""
        return self._error_count

    def clear(self):
        """Clear error history."""
        self._recent_errors = []


class ErrorHandler:
    """
    Main error handler for the TUI.

    Provides:
    - Context manager for catching errors
    - Decorator for recoverable functions
    - Automatic error categorization
    - Recovery attempts
    - User notification
    """

    def __init__(
        self,
        tui_manager: Optional[Any] = None,
        auto_recover: bool = True,
    ):
        """
        Initialize the error handler.

        Args:
            tui_manager: Optional RichTUIManager for error display
            auto_recover: Whether to attempt automatic recovery
        """
        self._recovery = ErrorRecovery()
        self._notifier = ErrorNotifier(tui_manager)
        self._auto_recover = auto_recover

        # Exception to category mapping
        self._exception_categories: Dict[Type[Exception], ErrorCategory] = {
            FileNotFoundError: ErrorCategory.FILE_NOT_FOUND,
            PermissionError: ErrorCategory.PERMISSION_DENIED,
        }

    def attach_tui(self, tui_manager: Any):
        """Attach a TUI manager for error display."""
        self._notifier.attach_tui(tui_manager)

    def categorize_exception(self, exc: Exception) -> ErrorCategory:
        """
        Determine the category of an exception.

        Args:
            exc: The exception to categorize

        Returns:
            ErrorCategory for the exception
        """
        # Check direct mapping
        exc_type = type(exc)
        if exc_type in self._exception_categories:
            return self._exception_categories[exc_type]

        # Check base classes
        for exc_class, category in self._exception_categories.items():
            if isinstance(exc, exc_class):
                return category

        # Check for JSON errors
        import json
        if isinstance(exc, json.JSONDecodeError):
            return ErrorCategory.JSON_PARSE_ERROR

        # Check error message for hints
        msg = str(exc).lower()
        if 'status.json' in msg or 'status file' in msg:
            return ErrorCategory.STATUS_FILE_ERROR
        if 'config' in msg or 'configuration' in msg:
            return ErrorCategory.CONFIG_ERROR
        if 'render' in msg or 'display' in msg:
            return ErrorCategory.RENDER_ERROR

        return ErrorCategory.UNKNOWN

    def handle_exception(
        self,
        exc: Exception,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        context: str = "",
    ) -> TUIError:
        """
        Handle an exception and attempt recovery.

        Args:
            exc: The exception that occurred
            severity: Severity level of the error
            context: Additional context about where the error occurred

        Returns:
            TUIError object describing the error
        """
        category = self.categorize_exception(exc)
        message = f"{context}: {exc}" if context else str(exc)

        error = TUIError(
            message=message,
            severity=severity,
            category=category,
            exception=exc,
            recoverable=category != ErrorCategory.UNKNOWN,
        )

        # Log the error
        logger.error(f"{error} - {traceback.format_exc()}")

        # Attempt recovery
        if self._auto_recover and error.recoverable:
            self._recovery.attempt_recovery(error)

        # Notify user
        self._notifier.notify(error)

        return error

    @contextmanager
    def catch_errors(
        self,
        context: str = "",
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        reraise: bool = False,
    ):
        """
        Context manager to catch and handle errors.

        Args:
            context: Additional context about the operation
            severity: Default severity for caught errors
            reraise: Whether to reraise the exception after handling

        Yields:
            Control to the wrapped code block
        """
        try:
            yield
        except Exception as exc:
            self.handle_exception(exc, severity, context)
            if reraise:
                raise

    def recoverable(
        self,
        context: str = "",
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        default: Any = None,
    ):
        """
        Decorator for recoverable functions.

        Args:
            context: Additional context about the function
            severity: Severity level for errors
            default: Default value to return on error

        Returns:
            Decorated function
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    func_context = context or f"in {func.__name__}()"
                    self.handle_exception(exc, severity, func_context)
                    return default
            return wrapper
        return decorator

    def safe_render(self, default: Any = None):
        """
        Decorator specifically for render methods.

        Returns a default panel on render errors to keep TUI running.
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    self.handle_exception(
                        exc,
                        ErrorSeverity.WARNING,
                        f"Rendering {func.__name__}"
                    )
                    if default is not None:
                        return default
                    # Return a fallback panel
                    if RICH_AVAILABLE:
                        return Panel(
                            Text(f"Render error: {exc}", style="red"),
                            border_style="red"
                        )
                    return None
            return wrapper
        return decorator

    @property
    def notifier(self) -> ErrorNotifier:
        """Get the error notifier."""
        return self._notifier

    @property
    def recovery(self) -> ErrorRecovery:
        """Get the error recovery system."""
        return self._recovery


# Global error handler instance
_error_handler: Optional[ErrorHandler] = None


def get_error_handler() -> ErrorHandler:
    """Get or create the global error handler."""
    global _error_handler
    if _error_handler is None:
        _error_handler = ErrorHandler()
    return _error_handler


def handle_error(
    exc: Exception,
    context: str = "",
    severity: ErrorSeverity = ErrorSeverity.ERROR,
) -> TUIError:
    """
    Handle an error using the global error handler.

    Args:
        exc: The exception that occurred
        context: Additional context
        severity: Severity level

    Returns:
        TUIError object
    """
    return get_error_handler().handle_exception(exc, severity, context)


@contextmanager
def catch_errors(context: str = "", reraise: bool = False):
    """
    Context manager to catch errors using the global handler.

    Args:
        context: Additional context
        reraise: Whether to reraise exceptions
    """
    with get_error_handler().catch_errors(context, reraise=reraise):
        yield


__all__ = [
    'ErrorSeverity',
    'ErrorCategory',
    'TUIError',
    'ErrorRecovery',
    'ErrorNotifier',
    'ErrorHandler',
    'get_error_handler',
    'handle_error',
    'catch_errors',
]
