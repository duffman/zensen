# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build: `bun run build` (runs TypeScript compiler)
- Start: `bun run src/main.ts` (runs the application)
- Dev: `bun --watch src/index.ts` (run with hot reload)
- Install: `bun install` (install dependencies)
- Test: `bun test` (runs tests in the codebase)
- Test single: `bun test path/to/filename.test.ts`
- Typecheck: `tsc --noEmit` (check types without emitting files)

## Code Style
- TypeScript with strict mode enabled (`strictNullChecks`, `strictFunctionTypes`)
- ES modules with explicit named imports (avoid * imports)
- Use interfaces for type definitions with descriptive names
- Async/await pattern for asynchronous code
- Try/catch blocks for error handling in async operations
- Return early pattern for conditionals to reduce nesting

## Naming & Structure
- camelCase for variables and functions
- PascalCase for interfaces, types, and classes
- UPPER_CASE for constants
- Descriptive function names that indicate purpose
- Keep functions small and focused (< 50 lines if possible)
- Organize related functionality in modules

## Email Processing & Security
- Validate and sanitize all email content before processing
- Use appropriate error handling for IMAP/SMTP operations
- Properly escape user input in database queries
- Use prepared statements with postgres library
- Avoid synchronous I/O in server code

## Logging
- Use console.log for info logging, console.error for errors
- Include timestamps and contextual info in logs
- Validate inputs early and provide clear error messages