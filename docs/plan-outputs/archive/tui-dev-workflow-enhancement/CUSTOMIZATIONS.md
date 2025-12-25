# TUI Dev Workflow Customizations

This document records all customizations made during the TUI Dev Workflow Enhancement implementation.

## Overview

Implementation Date: 2024-12-24
System: Linux (WSL2)
User: benjamin

## Installed Tools

### Core Tools (via apt)
- `lazygit` - Terminal UI for git commands
- `bat` (as `batcat`) - Syntax highlighting cat replacement
- `zoxide` - Smart directory jumper
- `fzf` - Fuzzy finder
- `jq` - JSON processor
- `fd-find` (as `fdfind`) - Fast find replacement
- `tmux` - Terminal multiplexer

### Editor & Viewers
- `micro` - Modern terminal editor
- `glow` - Markdown renderer
- `yazi` - Terminal file manager

### Git Enhancements
- `delta` - Git diff pager (installed via cargo)

## Configuration Files Created/Modified

### ~/.bashrc Additions
- fzf key bindings and completion sourced
- zoxide initialization (`eval "$(zoxide init bash)"`)
- fzf-git.sh sourced for git-aware fzf commands
- Custom aliases for modern tools
- Utility functions (mkcd, p, fzfp)

### ~/.gitconfig
- delta configured as core.pager
- delta.side-by-side = true
- delta syntax theme configured
- Git aliases: st, co, br, lg, unstage

### ~/.tmux.conf
- Prefix changed to Ctrl-A
- Mouse support enabled
- tmux-resurrect for session persistence
- tmux-continuum for auto-restore

### ~/.config/yazi/
- `yazi.toml` - Git fetcher configuration for file/directory status icons
- `keymap.toml` - Custom keybindings (Ctrl-G for lazygit, smart-enter)
- Plugins installed:
  - lazygit.yazi
  - smart-enter.yazi
  - yamb.yazi (bookmarks)

### ~/.config/micro/
- `settings.json` - diffgutter enabled, trailing whitespace highlighting
- Plugins installed:
  - lsp (language server protocol)
  - detectindent

### ~/.config/glow/
- `glow.yml` - Glow configuration

## Shell Aliases Added

```bash
# Modern tool aliases
alias cat='batcat'
alias ls='eza --icons' (if eza available)
alias ll='eza -la --git --icons'
alias tree='eza --tree'

# Git shortcuts
alias g='git'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gs='git status'
alias gl='git log --oneline'
alias lg='lazygit'

# Navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
```

## Utility Functions

```bash
# Create directory and cd into it
mkcd() { mkdir -p "$1" && cd "$1"; }

# Quick preview with bat
p() { batcat --paging=never "$@"; }

# fzf with preview
fzfp() { fzf --preview 'batcat --style=numbers --color=always {}'; }
```

## Scripts Created

### ~/backup-configs.sh
Backs up all TUI configuration files to `~/config-backups/[timestamp]/`

Files backed up:
- ~/.bashrc
- ~/.bash_aliases
- ~/.gitconfig
- ~/.tmux.conf
- ~/.config/yazi/
- ~/.config/micro/
- ~/.config/glow/
- ~/fzf-git.sh

### ~/tui-system-check.sh
Comprehensive verification script that checks:
- All essential tools are installed
- Git configuration is correct
- Configuration files exist
- Plugins are installed
- Shell integration is working
- Backup system is functional

## Known Issues

From system check (2024-12-24):
1. **delta not in PATH** - installed via cargo but PATH may need update
2. **eza not installed** - optional, using standard ls
3. **micro gitstatus plugin missing** - optional enhancement

## Key Bindings Quick Reference

| Action | Shortcut |
|--------|----------|
| Fuzzy history | Ctrl-R |
| Fuzzy files | Ctrl-T |
| Fuzzy cd | Alt-C |
| Smart jump | z dirname |
| Interactive jump | zi |
| Git branches (fzf) | Ctrl-G b |
| Git commits (fzf) | Ctrl-G c |
| Git TUI (yazi) | Ctrl-G |
| Git TUI (shell) | lazygit / lg |
| Save bookmark (yazi) | m |
| Jump bookmark (yazi) | ' |
| tmux prefix | Ctrl-A |

## Backup Locations

- Initial backup: `~/config-backups/20251224-151439/`
- Backup script: `~/backup-configs.sh`
- System check: `~/tui-system-check.sh`
