# Implementation Plan: TUI Dev Workflow Enhancement

## Overview
- **Objective:** Implement comprehensive TUI workflow enhancements across terminal tools
- **Scope:** Install missing tools, configure integrations, add plugins for yazi/micro/tmux, create shell aliases
- **Created:** 2024-12-24
- **Analysis Source:** `docs/plan-outputs/tui-dev-workflow-analysis/`
- **Output:** `docs/plan-outputs/tui-dev-workflow-enhancement/`

> Implementation tasks based on completed analysis. Use `/plan:status` to view progress.

## Phase 1: Critical Fixes

**Objective:** Fix blocking issues and install essential missing tools

### Tool Installation
- [ ] 1.1 Install lazygit via apt
- [ ] 1.2 Install bat via apt and create batcat alias
- [ ] 1.3 Install delta via cargo
- [ ] 1.4 Install zoxide via apt

### Shell Integration
- [ ] 1.5 Enable fzf key-bindings in ~/.bashrc
- [ ] 1.6 Enable fzf completion in ~/.bashrc
- [ ] 1.7 Initialize zoxide in ~/.bashrc
- [ ] 1.8 Test Ctrl-R fuzzy history
- [ ] 1.9 Test Ctrl-T fuzzy file finder
- [ ] 1.10 Test Alt-C fuzzy directory navigation

### Git Configuration
- [ ] 1.11 Configure delta as git pager
- [ ] 1.12 Set delta interactive diff filter
- [ ] 1.13 Enable delta side-by-side mode
- [ ] 1.14 Set delta syntax theme

### Yazi Git Plugin Fix
- [ ] 1.15 Add git fetcher config to yazi.toml for files
- [ ] 1.16 Add git fetcher config to yazi.toml for directories
- [ ] 1.17 Verify git status icons appear in yazi

### Micro Editor Integration
- [ ] 1.18 Enable diffgutter in micro settings
- [ ] 1.19 Enable trailing whitespace highlighting

- [ ] **VERIFY 1**: Run Phase 1 verification script - all tools installed and configured

## Phase 2: Core Enhancements

**Objective:** Build integrated workflow with plugins and configuration

### tmux Configuration
- [ ] 2.1 Install TPM (tmux plugin manager)
- [ ] 2.2 Create ~/.tmux.conf with prefix C-a
- [ ] 2.3 Enable mouse support in tmux
- [ ] 2.4 Configure tmux-resurrect plugin
- [ ] 2.5 Configure tmux-continuum for auto-restore
- [ ] 2.6 Install tmux plugins via prefix+I
- [ ] 2.7 Verify session persistence works

### Yazi Plugins
- [ ] 2.8 Install lazygit.yazi plugin
- [ ] 2.9 Install smart-enter.yazi plugin
- [ ] 2.10 Install yamb.yazi bookmark plugin
- [ ] 2.11 Create ~/.config/yazi/keymap.toml
- [ ] 2.12 Add Ctrl-G binding for lazygit
- [ ] 2.13 Add smart-enter binding for l key
- [ ] 2.14 Test Ctrl-G opens lazygit from yazi

### fzf-git Integration
- [ ] 2.15 Download fzf-git.sh to home directory
- [ ] 2.16 Source fzf-git.sh in ~/.bashrc
- [ ] 2.17 Test Ctrl-G b for branch selection
- [ ] 2.18 Test Ctrl-G c for commit selection

### Micro LSP & Plugins
- [ ] 2.19 Install bash-language-server via npm
- [ ] 2.20 Configure lsp.server for multiple languages
- [ ] 2.21 Enable lsp.formatOnSave
- [ ] 2.22 Install gitstatus micro plugin
- [ ] 2.23 Install detectindent micro plugin
- [ ] 2.24 Install monokai-dark colorscheme

### Git Aliases
- [ ] 2.25 Add git st alias for status
- [ ] 2.26 Add git co alias for checkout
- [ ] 2.27 Add git br alias for branch
- [ ] 2.28 Add git lg alias for pretty log
- [ ] 2.29 Add git unstage alias

- [ ] **VERIFY 2**: Run Phase 2 verification script - all plugins and configs working

## Phase 3: Advanced Features

**Objective:** Add specialized plugins and additional tools

### Additional Tools
- [ ] 3.1 Install jq for JSON processing
- [ ] 3.2 Install eza via cargo (modern ls)
- [ ] 3.3 Install fd-find via apt

### Shell Aliases
- [ ] 3.4 Add modern cat alias (batcat)
- [ ] 3.5 Add modern ls alias (eza with icons)
- [ ] 3.6 Add ll alias (eza long format with git)
- [ ] 3.7 Add tree alias (eza tree)
- [ ] 3.8 Add git shortcut aliases (g, ga, gc, gp, gs, gl, lg)
- [ ] 3.9 Add navigation aliases (.., ..., ....)

### Additional Yazi Plugins
- [ ] 3.10 Install ouch for archive handling
- [ ] 3.11 Install ouch.yazi plugin
- [ ] 3.12 Add bookmark save binding (m key)
- [ ] 3.13 Add bookmark jump binding (' key)

### Additional Micro Plugins
- [ ] 3.14 Install snippets micro plugin
- [ ] 3.15 Install quickfix micro plugin

### Glow Configuration
- [ ] 3.16 Create ~/.config/glow directory
- [ ] 3.17 Create glow.yml config file

### Utility Functions
- [ ] 3.18 Add mkcd function to bashrc
- [ ] 3.19 Add p() quick preview function
- [ ] 3.20 Add fzfp() fzf with preview function

- [ ] **VERIFY 3**: Run Phase 3 verification script - all advanced features working

## Phase 4: Polish & Optimize

**Objective:** Fine-tune configuration and add optional enhancements

### Optional Enhancements
- [ ] 4.1 Evaluate and optionally install starship prompt
- [ ] 4.2 Add tmux-yank plugin for clipboard
- [ ] 4.3 Add tmux-prefix-highlight plugin

### Backup & Maintenance
- [ ] 4.4 Create ~/backup-configs.sh script
- [ ] 4.5 Make backup script executable
- [ ] 4.6 Run initial backup of all configs

### Final Verification
- [ ] 4.7 Run complete system check script
- [ ] 4.8 Document any customizations made

- [ ] **VERIFY 4**: All phases complete, configs backed up

## Success Criteria

- [ ] All Phase 1 essential tools installed and working
- [ ] fzf Ctrl-R/T/Alt-C functional
- [ ] git diff shows delta syntax-highlighted output
- [ ] yazi displays git status icons
- [ ] micro shows diff gutter
- [ ] tmux sessions persist across restarts
- [ ] Ctrl-G opens lazygit from yazi
- [ ] All git aliases configured
- [ ] Shell aliases for modern tools working
- [ ] Configuration backup script created

## Quick Reference After Implementation

| Action | Shortcut |
|--------|----------|
| Fuzzy history | Ctrl-R |
| Fuzzy files | Ctrl-T |
| Fuzzy cd | Alt-C |
| Smart jump | z dirname |
| Interactive jump | zi |
| Git branches | Ctrl-G b |
| Git commits | Ctrl-G c |
| Git TUI (yazi) | Ctrl-G |
| Git TUI (shell) | lazygit / lg |
| Save bookmark | m (in yazi) |
| Jump bookmark | ' (in yazi) |
| tmux prefix | Ctrl-A |
