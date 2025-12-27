#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Orchestrator IPC - Inter-process communication for orchestrator coordination.

This module provides Unix domain socket-based IPC for orchestrator instances
to communicate with each other and with control commands.

Message Protocol:
- JSON-based messages with type, command, payload, and timestamp
- Request/Response pattern with optional notifications
- Commands: status, shutdown, pause, resume

Usage:
    # Server (in orchestrator)
    server = IPCServer(socket_path)
    server.on_command = handle_command
    server.start()

    # Client (control commands)
    client = IPCClient(socket_path)
    response = client.send_command("status")
"""

import json
import os
import socket
import threading
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, Optional, Any

__all__ = [
    'IPCMessage',
    'IPCServer',
    'IPCClient',
    'IPCError',
    'get_socket_path',
]


# Configuration
SOCKET_DIR = "/tmp"
SOCKET_TIMEOUT = 5.0
MAX_MESSAGE_SIZE = 65536


class IPCError(Exception):
    """IPC operation error."""
    pass


@dataclass
class IPCMessage:
    """IPC message structure."""

    type: str       # request | response | notification
    command: str    # status | shutdown | pause | resume | heartbeat
    payload: Dict   # Command-specific data
    timestamp: str  # ISO timestamp

    @classmethod
    def request(cls, command: str, payload: Optional[Dict] = None) -> 'IPCMessage':
        """Create a request message."""
        return cls(
            type="request",
            command=command,
            payload=payload or {},
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    @classmethod
    def response(cls, command: str, payload: Optional[Dict] = None) -> 'IPCMessage':
        """Create a response message."""
        return cls(
            type="response",
            command=command,
            payload=payload or {},
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    @classmethod
    def notification(cls, command: str, payload: Optional[Dict] = None) -> 'IPCMessage':
        """Create a notification message."""
        return cls(
            type="notification",
            command=command,
            payload=payload or {},
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

    def to_json(self) -> str:
        """Serialize to JSON string."""
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, data: str) -> 'IPCMessage':
        """Deserialize from JSON string."""
        try:
            obj = json.loads(data)
            return cls(**obj)
        except (json.JSONDecodeError, TypeError, KeyError) as e:
            raise IPCError(f"Invalid message format: {e}")

    def to_bytes(self) -> bytes:
        """Serialize to bytes with length prefix."""
        data = self.to_json().encode('utf-8')
        length = len(data)
        return length.to_bytes(4, 'big') + data

    @classmethod
    def from_socket(cls, sock: socket.socket) -> 'IPCMessage':
        """Read a message from socket."""
        # Read length prefix (4 bytes)
        length_data = sock.recv(4)
        if len(length_data) < 4:
            raise IPCError("Connection closed")

        length = int.from_bytes(length_data, 'big')
        if length > MAX_MESSAGE_SIZE:
            raise IPCError(f"Message too large: {length} bytes")

        # Read message data
        data = b""
        while len(data) < length:
            chunk = sock.recv(min(4096, length - len(data)))
            if not chunk:
                raise IPCError("Connection closed during read")
            data += chunk

        return cls.from_json(data.decode('utf-8'))


def get_socket_path(instance_id: str) -> str:
    """Get the Unix socket path for an orchestrator instance.

    Args:
        instance_id: Orchestrator instance ID.

    Returns:
        Path to the Unix domain socket.
    """
    return os.path.join(SOCKET_DIR, f"orchestrator-{instance_id}.sock")


class IPCServer:
    """Unix domain socket server for receiving IPC commands.

    The server listens for incoming connections and dispatches commands
    to registered handlers. It runs in a background thread.

    Usage:
        server = IPCServer(socket_path)

        def handle_command(command, payload):
            if command == "status":
                return {"status": "running", "progress": 50}
            elif command == "shutdown":
                # Handle shutdown
                return {"ack": True}
            return {"error": "Unknown command"}

        server.on_command = handle_command
        server.start()

        # Later...
        server.stop()
    """

    def __init__(self, socket_path: str):
        self.socket_path = socket_path
        self.on_command: Optional[Callable[[str, Dict], Dict]] = None
        self._server_socket: Optional[socket.socket] = None
        self._thread: Optional[threading.Thread] = None
        self._stop = False

    def start(self):
        """Start the IPC server in a background thread."""
        # Remove stale socket file
        if os.path.exists(self.socket_path):
            try:
                os.unlink(self.socket_path)
            except OSError:
                pass

        # Create and bind socket
        self._server_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_socket.bind(self.socket_path)
        self._server_socket.listen(5)
        self._server_socket.settimeout(1.0)  # Allow periodic stop checks

        # Set socket permissions (owner only)
        os.chmod(self.socket_path, 0o600)

        # Start server thread
        self._stop = False
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the IPC server."""
        self._stop = True
        if self._thread:
            self._thread.join(timeout=5.0)

        if self._server_socket:
            try:
                self._server_socket.close()
            except Exception:
                pass

        # Clean up socket file
        if os.path.exists(self.socket_path):
            try:
                os.unlink(self.socket_path)
            except OSError:
                pass

    def _run(self):
        """Server main loop."""
        while not self._stop:
            try:
                client_socket, _ = self._server_socket.accept()
                client_socket.settimeout(SOCKET_TIMEOUT)

                # Handle in a separate thread to not block
                handler = threading.Thread(
                    target=self._handle_client,
                    args=(client_socket,),
                    daemon=True,
                )
                handler.start()

            except socket.timeout:
                continue
            except Exception:
                if not self._stop:
                    time.sleep(0.1)

    def _handle_client(self, client_socket: socket.socket):
        """Handle a single client connection."""
        try:
            # Read request
            request = IPCMessage.from_socket(client_socket)

            # Process command
            if request.type == "request" and self.on_command:
                try:
                    result = self.on_command(request.command, request.payload)
                    response = IPCMessage.response(request.command, result)
                except Exception as e:
                    response = IPCMessage.response(
                        request.command,
                        {"error": str(e)},
                    )
            else:
                response = IPCMessage.response(
                    request.command,
                    {"error": "No handler registered"},
                )

            # Send response
            client_socket.sendall(response.to_bytes())

        except Exception:
            pass  # Silently handle errors
        finally:
            try:
                client_socket.close()
            except Exception:
                pass


class IPCClient:
    """Client for sending commands to an orchestrator's IPC server.

    Usage:
        client = IPCClient(socket_path)

        # Get status
        response = client.send_command("status")
        print(response.payload)

        # Request shutdown
        response = client.send_command("shutdown")
        if response.payload.get("ack"):
            print("Shutdown acknowledged")
    """

    def __init__(self, socket_path: str, timeout: float = SOCKET_TIMEOUT):
        self.socket_path = socket_path
        self.timeout = timeout

    def is_available(self) -> bool:
        """Check if the server is available.

        Returns:
            True if the socket exists and is connectable.
        """
        if not os.path.exists(self.socket_path):
            return False

        try:
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            sock.connect(self.socket_path)
            sock.close()
            return True
        except (socket.error, OSError):
            return False

    def send_command(
        self,
        command: str,
        payload: Optional[Dict] = None,
    ) -> IPCMessage:
        """Send a command and wait for response.

        Args:
            command: Command name (status, shutdown, pause, resume).
            payload: Optional command payload.

        Returns:
            Response IPCMessage.

        Raises:
            IPCError: If connection or communication fails.
        """
        if not os.path.exists(self.socket_path):
            raise IPCError(f"Socket not found: {self.socket_path}")

        try:
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            sock.connect(self.socket_path)

            # Send request
            request = IPCMessage.request(command, payload)
            sock.sendall(request.to_bytes())

            # Receive response
            response = IPCMessage.from_socket(sock)
            sock.close()

            return response

        except socket.timeout:
            raise IPCError("Connection timed out")
        except socket.error as e:
            raise IPCError(f"Socket error: {e}")

    def get_status(self) -> Dict:
        """Get orchestrator status.

        Returns:
            Status dictionary.
        """
        response = self.send_command("status")
        return response.payload

    def request_shutdown(self, force: bool = False) -> bool:
        """Request orchestrator shutdown.

        Args:
            force: If True, request immediate shutdown.

        Returns:
            True if shutdown was acknowledged.
        """
        response = self.send_command("shutdown", {"force": force})
        return response.payload.get("ack", False)

    def request_pause(self) -> bool:
        """Request orchestrator pause.

        Returns:
            True if pause was acknowledged.
        """
        response = self.send_command("pause")
        return response.payload.get("ack", False)

    def request_resume(self) -> bool:
        """Request orchestrator resume.

        Returns:
            True if resume was acknowledged.
        """
        response = self.send_command("resume")
        return response.payload.get("ack", False)


def send_to_all(
    socket_paths: list,
    command: str,
    payload: Optional[Dict] = None,
    timeout: float = SOCKET_TIMEOUT,
) -> Dict[str, Any]:
    """Send a command to multiple orchestrators.

    Args:
        socket_paths: List of socket paths.
        command: Command name.
        payload: Optional command payload.
        timeout: Timeout per connection.

    Returns:
        Dictionary mapping socket paths to results or errors.
    """
    results = {}

    for socket_path in socket_paths:
        try:
            client = IPCClient(socket_path, timeout=timeout)
            response = client.send_command(command, payload)
            results[socket_path] = response.payload
        except IPCError as e:
            results[socket_path] = {"error": str(e)}
        except Exception as e:
            results[socket_path] = {"error": f"Unexpected error: {e}"}

    return results
