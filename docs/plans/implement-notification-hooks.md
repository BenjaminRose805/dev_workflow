# Implementation Plan: Notification Hooks System

## Overview
- **Goal:** Implement comprehensive Notification Hooks system with multiple channels and flexible triggering
- **Priority:** P2 (Infrastructure)
- **Created:** 2025-12-22
- **Output:** `docs/plan-outputs/implement-notification-hooks/`
- **Category:** Hook Infrastructure

> This plan implements a comprehensive notification system that provides multiple notification channels (terminal, status file, log file, webhooks) with flexible triggering patterns. The system supports success, error, progress, and warning notifications with configurable verbosity levels, batching, and rate limiting to ensure users receive timely, actionable information without overwhelming noise.

---

## Phase 1: Notification Type Definitions and Schemas

**Objective:** Define core notification types, schemas, and data structures.

- [ ] 1.1 Create `src/hooks/notifications/types.ts` with notification type enums (Success, Error, Progress, Warning)
- [ ] 1.2 Define notification severity levels (Info, Warning, Error, Fatal for errors; Normal, Verbose, Debug for general)
- [ ] 1.3 Create notification payload interface with common fields (timestamp, type, severity, message, context, metadata)
- [ ] 1.4 Define success notification schema with completion levels (task, operation, milestone)
- [ ] 1.5 Define error notification schema with severity levels (fatal, error, recoverable) and actionable context
- [ ] 1.6 Define progress notification schema with stages (started, in_progress, nearing_completion, completed) and percentage
- [ ] 1.7 Define warning notification schema with categories (deprecation, performance, security, best_practice)
- [ ] 1.8 Create notification event interface with event name, trigger conditions, and payload
- [ ] 1.9 Add TypeScript type guards for notification validation
- [ ] 1.10 Document notification schemas with examples in JSDoc comments

**VERIFY 1:** All notification types compile without errors, type guards validate correctly, schemas cover all use cases from source material.

---

## Phase 2: Terminal Output Channel Implementation

**Objective:** Implement terminal output channel with verbosity levels and rich formatting.

- [ ] 2.1 Create `src/hooks/notifications/channels/terminal.ts` with TerminalChannel class
- [ ] 2.2 Implement verbosity level filtering (quiet, normal, verbose, debug)
- [ ] 2.3 Add color support using chalk or similar library for different notification types
- [ ] 2.4 Implement formatting for success messages (green checkmark, completion level)
- [ ] 2.5 Implement formatting for error messages (red X, severity, actionable context)
- [ ] 2.6 Implement formatting for progress messages (blue arrow, percentage, stage)
- [ ] 2.7 Implement formatting for warning messages (yellow warning symbol, category)
- [ ] 2.8 Add progress bar support for long-running operations
- [ ] 2.9 Implement message truncation and wrapping for terminal width
- [ ] 2.10 Add configuration options for disabling colors, progress bars, and emoji symbols

**VERIFY 2:** Terminal output displays correctly for all notification types, verbosity filtering works, colors and formatting render properly in different terminal environments.

---

## Phase 3: Status File Channel Implementation

**Objective:** Implement status file channel with immediate updates to status.json.

- [ ] 3.1 Create `src/hooks/notifications/channels/status-file.ts` with StatusFileChannel class
- [ ] 3.2 Implement atomic file writing using temporary files and rename operations
- [ ] 3.3 Add status.json schema with current status, notifications array, last updated timestamp
- [ ] 3.4 Implement append-only notification tracking with configurable max entries
- [ ] 3.5 Add status aggregation (overall status: success, in_progress, warning, error, failed)
- [ ] 3.6 Implement file locking mechanism to prevent concurrent write conflicts
- [ ] 3.7 Add error handling for file system errors (permissions, disk full, path not found)
- [ ] 3.8 Implement status file rotation when size exceeds threshold
- [ ] 3.9 Add configuration for status file path, max size, and max notification entries
- [ ] 3.10 Create utility functions to read and parse status files for external consumers

**VERIFY 3:** Status file updates atomically, concurrent writes don't corrupt file, status aggregation reflects current state accurately, rotation works correctly.

---

## Phase 4: Log File Channel with Rotation

**Objective:** Implement structured log file channel with JSON format and rotation support.

- [ ] 4.1 Create `src/hooks/notifications/channels/log-file.ts` with LogFileChannel class
- [ ] 4.2 Implement JSON line-delimited (JSONL) log format for easy parsing
- [ ] 4.3 Add log rotation based on file size threshold (default 10MB)
- [ ] 4.4 Implement log rotation based on time intervals (daily, weekly)
- [ ] 4.5 Add log file naming scheme with timestamps (e.g., notifications-2025-12-22.log)
- [ ] 4.6 Implement keeping N most recent log files and auto-deletion of old logs
- [ ] 4.7 Add log level filtering separate from terminal verbosity
- [ ] 4.8 Implement asynchronous writing with queue to prevent blocking
- [ ] 4.9 Add error handling for write failures with retry mechanism
- [ ] 4.10 Create log parsing utilities for reading and filtering log files

**VERIFY 4:** Logs written in valid JSONL format, rotation triggers correctly on size and time, old logs cleaned up, async writing doesn't lose messages.

---

## Phase 5: External Webhook Channel

**Objective:** Implement webhook channel for external integrations with authentication and filtering.

- [ ] 5.1 Create `src/hooks/notifications/channels/webhook.ts` with WebhookChannel class
- [ ] 5.2 Implement HTTP POST requests to configured webhook URLs
- [ ] 5.3 Add authentication support (Bearer token, Basic auth, custom headers)
- [ ] 5.4 Implement notification filtering per webhook (type, severity, pattern matching)
- [ ] 5.5 Add retry logic with exponential backoff for failed webhook deliveries
- [ ] 5.6 Implement webhook timeout configuration (default 5 seconds)
- [ ] 5.7 Add Slack-specific message transformation (format as Slack blocks/attachments)
- [ ] 5.8 Implement webhook payload templates for custom formatting
- [ ] 5.9 Add webhook delivery tracking and failure logging
- [ ] 5.10 Create webhook testing utilities for validating configurations

**VERIFY 5:** Webhooks deliver successfully to test endpoints, authentication works, retries handle failures gracefully, Slack formatting renders correctly.

---

## Phase 6: Trigger Configuration and Event Routing

**Objective:** Implement trigger configuration system and event routing to channels.

- [ ] 6.1 Create `src/hooks/notifications/trigger-config.ts` with trigger configuration schema
- [ ] 6.2 Implement event pattern matching (exact match, wildcard, regex support)
- [ ] 6.3 Add channel selection per trigger (array of channel names)
- [ ] 6.4 Implement verbosity override per trigger
- [ ] 6.5 Create event router that matches events to triggers and dispatches to channels
- [ ] 6.6 Add default trigger configurations for common events (task:completed, task:failed, phase:completed)
- [ ] 6.7 Implement trigger configuration loading from file and runtime overrides
- [ ] 6.8 Add trigger priority system for ordering when multiple triggers match
- [ ] 6.9 Implement trigger conditions (only fire if certain context values match)
- [ ] 6.10 Create configuration validation with helpful error messages

**VERIFY 6:** Event routing correctly matches patterns, channels receive appropriate notifications, configuration validation catches errors, overrides work properly.

---

## Phase 7: Batching and Rate Limiting

**Objective:** Implement batching and rate limiting to prevent notification spam.

- [ ] 7.1 Create `src/hooks/notifications/batching.ts` with batching manager
- [ ] 7.2 Implement time-based batching (flush every N seconds, default 5s)
- [ ] 7.3 Implement count-based batching (flush after N notifications, default 10)
- [ ] 7.4 Add threshold-based batching for progress updates (only send if change >= 10%)
- [ ] 7.5 Implement immediate flush for high-priority notifications (errors, critical warnings)
- [ ] 7.6 Create rate limiter to cap notifications per channel per time window
- [ ] 7.7 Add grouping for related notifications (same task, same operation)
- [ ] 7.8 Implement batch summarization for terminal output (e.g., "5 tasks completed")
- [ ] 7.9 Add configuration for batching intervals, thresholds, and rate limits
- [ ] 7.10 Create bypass mechanism for critical notifications that skip batching

**VERIFY 7:** Batching reduces notification volume appropriately, high-priority notifications bypass batching, rate limiting prevents spam, grouped notifications summarize correctly.

---

## Phase 8: Hook Integration (PostToolUse, SessionEnd)

**Objective:** Integrate notification system with SDK hooks.

- [ ] 8.1 Create `src/hooks/notifications/notification-hook.ts` with NotificationHook class implementing Hook interface
- [ ] 8.2 Implement PostToolUse hook to send notifications after tool execution
- [ ] 8.3 Add SessionEnd hook to send final summary notification
- [ ] 8.4 Create notification factory functions for common events (tool success, tool error, session summary)
- [ ] 8.5 Implement context extraction from ToolUseBlock and SessionEndPayload
- [ ] 8.6 Add automatic error notification generation from caught exceptions
- [ ] 8.7 Implement progress notification tracking across multi-step operations
- [ ] 8.8 Create milestone detection for long-running operations (25%, 50%, 75%, 100%)
- [ ] 8.9 Add session statistics aggregation for summary notifications
- [ ] 8.10 Implement graceful shutdown that flushes pending notifications

**VERIFY 8:** Hooks trigger notifications correctly, context includes relevant information, session summaries accurate, shutdown flushes all pending notifications.

---

## Phase 9: Testing and Validation

**Objective:** Comprehensive testing of notification system.

- [ ] 9.1 Create unit tests for each notification type and schema validation
- [ ] 9.2 Add unit tests for each channel implementation (terminal, status file, log file, webhook)
- [ ] 9.3 Create integration tests for event routing and trigger matching
- [ ] 9.4 Add tests for batching behavior (time-based, count-based, threshold-based)
- [ ] 9.5 Create tests for rate limiting enforcement
- [ ] 9.6 Add tests for webhook retry logic and failure handling
- [ ] 9.7 Create end-to-end tests with mock SDK hooks
- [ ] 9.8 Add performance tests for high-volume notification scenarios
- [ ] 9.9 Create tests for concurrent access to status files and log files
- [ ] 9.10 Add validation tests for configuration schema and error messages

**VERIFY 9:** All tests pass, code coverage >= 80%, performance acceptable under high load, concurrent access safe, error handling robust.

---

## Success Criteria

- [ ] All notification types (Success, Error, Progress, Warning) implemented with proper schemas
- [ ] All channels (Terminal, Status File, Log File, Webhook) functional and configurable
- [ ] Trigger configuration system supports pattern matching and channel selection
- [ ] Batching and rate limiting reduce notification spam without losing critical information
- [ ] Integration with PostToolUse and SessionEnd hooks works correctly
- [ ] Webhook delivery includes retry logic and supports Slack formatting
- [ ] Status file updates atomically and provides accurate aggregation
- [ ] Log rotation works based on size and time thresholds
- [ ] Terminal output includes colors, progress bars, and proper formatting
- [ ] Test coverage >= 80% with passing integration tests
- [ ] Documentation includes configuration examples and best practices
- [ ] Performance acceptable (< 10ms overhead per notification, handles 1000+ notifications/second)

---

## Dependencies

- Core SDK hook system (Hook interface, registration)
- TypeScript type system for notification schemas
- File system utilities for atomic writes and locking
- HTTP client library for webhook delivery
- Terminal formatting library (chalk or similar)
- Testing framework (Jest or similar)
- Configuration management system

## Risks and Mitigations

- **Risk:** File system race conditions - Status file and log file concurrent writes could corrupt data
  - **Mitigation:** Implement file locking and atomic writes using temp files

- **Risk:** Webhook delivery failures - External services may be unreachable or slow
  - **Mitigation:** Implement retry logic with exponential backoff and timeout limits

- **Risk:** Notification spam - Too many notifications could overwhelm users and systems
  - **Mitigation:** Implement batching, rate limiting, and threshold-based filtering

- **Risk:** Performance overhead - Notification system could slow down main operations
  - **Mitigation:** Use async writing, queues, and optimize critical paths

- **Risk:** Configuration complexity - Trigger configuration could become difficult to manage
  - **Mitigation:** Provide sensible defaults, validation, and clear documentation

- **Risk:** Terminal compatibility - Color and formatting may not work in all environments
  - **Mitigation:** Add configuration to disable colors/emoji, detect terminal capabilities

- **Risk:** Log file growth - Logs could consume excessive disk space
  - **Mitigation:** Implement rotation and auto-cleanup of old logs

- **Risk:** Memory leaks - Batching queues could accumulate if not flushed properly
  - **Mitigation:** Implement max queue sizes, timeouts, and graceful shutdown

## Future Enhancements

- Desktop/OS notification integration for critical alerts
- Email channel for scheduled digests
- Integration with monitoring systems (Datadog, Sentry, etc.)
- Custom notification templates with Handlebars or similar
- Notification analytics and usage metrics
- User preference profiles for notification customization
- Mobile push notification support via external services
- Interactive notifications with action buttons (for supported channels)
