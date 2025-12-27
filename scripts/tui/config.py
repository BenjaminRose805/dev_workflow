#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TUI Configuration Persistence.

This module provides configuration persistence for TUI settings:
- Panel visibility preferences
- Keybinding customizations
- Layout preferences

Configuration is stored at ~/.config/claude-code/tui-panels.json

Usage:
    from scripts.tui.config import TUIConfig, load_config, save_config

    config = load_config()
    config.panel_visibility['phases'] = True
    save_config(config)
"""

import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any


# Default configuration path
DEFAULT_CONFIG_DIR = os.path.expanduser('~/.config/claude-code')
DEFAULT_CONFIG_FILE = 'tui-panels.json'


@dataclass
class KeyBindingConfig:
    """Custom keybinding configuration."""
    key: str
    action: str
    mode: str = 'NORMAL'  # NORMAL, COMMAND, SEARCH

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'KeyBindingConfig':
        """Create from dictionary."""
        return cls(
            key=data.get('key', ''),
            action=data.get('action', ''),
            mode=data.get('mode', 'NORMAL'),
        )


@dataclass
class TUIConfig:
    """
    TUI configuration settings.

    Attributes:
        panel_visibility: Dict mapping panel names to visibility state
        keybindings: List of custom keybinding overrides
        use_vim_keys: Whether to use vim-style j/k navigation
        auto_hide_panels: Whether to auto-hide panels in compact mode
        focus_mode_panel: Default panel to maximize in focus mode
        refresh_rate: TUI refresh rate in Hz
        compact_threshold: Terminal row count below which to use compact mode
    """
    # Panel visibility
    panel_visibility: Dict[str, bool] = field(default_factory=lambda: {
        'phases': True,
        'upcoming': True,
        'run_history': True,
        'dependency_graph': True,
        'activity': True,
        'agent_tracker': True,
        'subtask_tree': False,  # Hidden by default
    })

    # Keybinding customizations
    keybindings: List[KeyBindingConfig] = field(default_factory=list)

    # Navigation settings
    use_vim_keys: bool = True

    # Layout settings
    auto_hide_panels: bool = True
    focus_mode_panel: Optional[str] = None  # Last focused panel for F key

    # Performance settings
    refresh_rate: int = 4  # Hz
    compact_threshold: int = 24  # Rows

    # Search settings
    search_history: List[str] = field(default_factory=list)
    max_search_history: int = 20

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'panel_visibility': self.panel_visibility,
            'keybindings': [kb.to_dict() for kb in self.keybindings],
            'use_vim_keys': self.use_vim_keys,
            'auto_hide_panels': self.auto_hide_panels,
            'focus_mode_panel': self.focus_mode_panel,
            'refresh_rate': self.refresh_rate,
            'compact_threshold': self.compact_threshold,
            'search_history': self.search_history[:self.max_search_history],
            'max_search_history': self.max_search_history,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TUIConfig':
        """Create from dictionary."""
        config = cls()

        # Panel visibility
        if 'panel_visibility' in data:
            config.panel_visibility.update(data['panel_visibility'])

        # Keybindings
        if 'keybindings' in data:
            config.keybindings = [
                KeyBindingConfig.from_dict(kb)
                for kb in data['keybindings']
            ]

        # Navigation settings
        if 'use_vim_keys' in data:
            config.use_vim_keys = bool(data['use_vim_keys'])

        # Layout settings
        if 'auto_hide_panels' in data:
            config.auto_hide_panels = bool(data['auto_hide_panels'])
        if 'focus_mode_panel' in data:
            config.focus_mode_panel = data['focus_mode_panel']

        # Performance settings
        if 'refresh_rate' in data:
            config.refresh_rate = int(data['refresh_rate'])
        if 'compact_threshold' in data:
            config.compact_threshold = int(data['compact_threshold'])

        # Search settings
        if 'search_history' in data:
            config.search_history = list(data['search_history'])
        if 'max_search_history' in data:
            config.max_search_history = int(data['max_search_history'])

        return config

    # =========================================================================
    # Panel Visibility Helpers
    # =========================================================================

    def is_panel_visible(self, panel_name: str) -> bool:
        """Check if a panel is visible."""
        return self.panel_visibility.get(panel_name, True)

    def set_panel_visible(self, panel_name: str, visible: bool):
        """Set panel visibility."""
        self.panel_visibility[panel_name] = visible

    def toggle_panel(self, panel_name: str) -> bool:
        """Toggle panel visibility. Returns new state."""
        new_state = not self.panel_visibility.get(panel_name, True)
        self.panel_visibility[panel_name] = new_state
        return new_state

    # =========================================================================
    # Keybinding Helpers
    # =========================================================================

    def get_keybinding(self, key: str, mode: str = 'NORMAL') -> Optional[str]:
        """Get action for a keybinding."""
        for kb in self.keybindings:
            if kb.key == key and kb.mode == mode:
                return kb.action
        return None

    def set_keybinding(self, key: str, action: str, mode: str = 'NORMAL'):
        """Set or update a keybinding."""
        # Remove existing binding for this key/mode
        self.keybindings = [
            kb for kb in self.keybindings
            if not (kb.key == key and kb.mode == mode)
        ]
        # Add new binding
        self.keybindings.append(KeyBindingConfig(key, action, mode))

    def remove_keybinding(self, key: str, mode: str = 'NORMAL'):
        """Remove a custom keybinding."""
        self.keybindings = [
            kb for kb in self.keybindings
            if not (kb.key == key and kb.mode == mode)
        ]

    # =========================================================================
    # Search History
    # =========================================================================

    def add_search_history(self, query: str):
        """Add a search query to history."""
        # Remove if already exists
        if query in self.search_history:
            self.search_history.remove(query)
        # Add to front
        self.search_history.insert(0, query)
        # Trim to max
        self.search_history = self.search_history[:self.max_search_history]

    def get_search_history(self, limit: int = 10) -> List[str]:
        """Get recent search history."""
        return self.search_history[:limit]


class ConfigManager:
    """
    Manages configuration loading, saving, and watching.

    Provides:
    - Automatic config directory creation
    - Safe JSON reading/writing
    - Config change notifications
    """

    def __init__(
        self,
        config_dir: Optional[str] = None,
        config_file: str = DEFAULT_CONFIG_FILE,
    ):
        """
        Initialize the config manager.

        Args:
            config_dir: Configuration directory (uses default if None)
            config_file: Configuration filename
        """
        self.config_dir = Path(config_dir or DEFAULT_CONFIG_DIR)
        self.config_file = config_file
        self._config: Optional[TUIConfig] = None
        self._callbacks: List[Any] = []

    @property
    def config_path(self) -> Path:
        """Get full path to config file."""
        return self.config_dir / self.config_file

    def load(self) -> TUIConfig:
        """
        Load configuration from file.

        Creates default config if file doesn't exist.

        Returns:
            TUIConfig instance
        """
        if self._config is not None:
            return self._config

        # Create directory if needed
        self.config_dir.mkdir(parents=True, exist_ok=True)

        # Load or create config
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                self._config = TUIConfig.from_dict(data)
            except (json.JSONDecodeError, IOError):
                # Corrupted config - use defaults
                self._config = TUIConfig()
        else:
            self._config = TUIConfig()

        return self._config

    def save(self, config: Optional[TUIConfig] = None):
        """
        Save configuration to file.

        Args:
            config: Config to save (uses current if None)
        """
        if config is not None:
            self._config = config

        if self._config is None:
            return

        # Create directory if needed
        self.config_dir.mkdir(parents=True, exist_ok=True)

        # Write config atomically (write to temp, then rename)
        temp_path = self.config_path.with_suffix('.tmp')
        try:
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(self._config.to_dict(), f, indent=2)
            temp_path.rename(self.config_path)
        except IOError:
            # Cleanup temp file on failure
            if temp_path.exists():
                temp_path.unlink()
            raise

        # Notify listeners
        for callback in self._callbacks:
            try:
                callback(self._config)
            except Exception:
                pass

    def on_change(self, callback):
        """Register callback for config changes."""
        self._callbacks.append(callback)

    def get(self, key: str, default: Any = None) -> Any:
        """Get a config value by key."""
        config = self.load()
        return getattr(config, key, default)

    def set(self, key: str, value: Any):
        """Set a config value and save."""
        config = self.load()
        if hasattr(config, key):
            setattr(config, key, value)
            self.save()

    def reset(self):
        """Reset to default configuration."""
        self._config = TUIConfig()
        self.save()


# Global config manager instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """Get or create the global config manager."""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager


def load_config() -> TUIConfig:
    """Load the TUI configuration."""
    return get_config_manager().load()


def save_config(config: Optional[TUIConfig] = None):
    """Save the TUI configuration."""
    get_config_manager().save(config)


def get_config_path() -> Path:
    """Get the configuration file path."""
    return get_config_manager().config_path


__all__ = [
    'TUIConfig',
    'KeyBindingConfig',
    'ConfigManager',
    'get_config_manager',
    'load_config',
    'save_config',
    'get_config_path',
    'DEFAULT_CONFIG_DIR',
    'DEFAULT_CONFIG_FILE',
]
