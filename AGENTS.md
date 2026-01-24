Use **Bun** exclusively.
Do **NOT** use npm, pnpm, or yarn under any circumstances.

## Plan Mode

When operating in Plan Mode:

- Produce concise, execution-focused plans.
- Clarity is required; verbosity is not.
- Do not include explanations, prose, or filler.
- Output only concrete steps.
- Every plan **MUST** end with a section titled **“Unresolved Questions”**.
- Include only questions that materially block execution.
- If there are no blockers, explicitly write:

  **Unresolved Questions: None.**

Failure to follow this structure is not allowed.

## Code Style & Generation Rules

All generated code must follow these rules:

- Code must be self-explanatory.
- Do not use comments.
- Intent must be expressed through naming, structure, and composition only.

Strict consistency is required across:

- File structure
- Module boundaries
- Naming conventions
- Architectural patterns

Before writing any code:

- Explore the existing project.
- Understand the directory layout, conventions, abstractions, and dependency patterns.

When adding new code:

- Place it only in logically correct locations.
- Do not introduce new patterns unless strictly necessary.

## Mandatory Skill Enforcement (Zero Tolerance)

All rules below are **NON-NEGOTIABLE**.

If any applicable skill is not used, the response is **INVALID**.

There are:

- No excuses
- No interpretation
- No flexibility

Rules:

- If a condition applies → use the skill.
- If unsure → assume it applies and use the skill.
- If multiple conditions apply → use all relevant skills.
- Do not proceed with an answer until all required skills are applied.

## Skill Requirements

**Planning & Scope**

- **Skill(avoid-feature-creep)**
  Required for feature planning, scope discussion, MVPs, roadmaps, and backlogs.

**Better Auth**

- **Skill(better-auth-best-practices)**
  Required for authentication integration, session management, email/password flows, OAuth, passkeys, plugins, or any Better Auth configuration.
- **Skill(betterauth-tanstack-convex)**
  Required for setting up Better Auth with Convex and TanStack Start, troubleshooting auth issues, or implementing sign up/sign in/sign out flows.

**Convex**

- **Skill(convex)**
  Umbrella skill for Convex development. Routes to specific skills.
- **Skill(convex-agents)**
  Required for AI agents with Convex, including thread management, tool integration, streaming responses, RAG patterns, and workflow orchestration.
- **Skill(convex-best-practices)**
  Required for production-ready Convex architecture, function organization, query patterns, validation, TypeScript usage, and error handling.
- **Skill(convex-component-authoring)**
  Required for creating reusable Convex components with proper isolation, exports, and dependency management.
- **Skill(convex-cron-jobs)**
  Required for scheduled or background jobs using interval scheduling or cron expressions.
- **Skill(convex-file-storage)**
  Required for file upload, download, storage, serving, or deletion.
- **Skill(convex-functions)**
  Required for any query, mutation, action, or HTTP action.
- **Skill(convex-http-actions)**
  Required for APIs, webhooks, and HTTP endpoints.
- **Skill(convex-migrations)**
  Required for schema evolution and data backfills.
- **Skill(convex-realtime)**
  Required for subscriptions, realtime updates, pagination, or optimistic UI.
- **Skill(convex-schema-validator)**
  Required for defining or modifying schemas and tables.
- **Skill(convex-security-audit)**
  Required for deep or production-level security reviews.
- **Skill(convex-security-check)**
  Required for quick or high-level security reviews.
- **Skill(convex-tanstack)**
  Required for building full-stack applications with Convex backend and TanStack Start, including routing, data fetching, SSR, and frontend patterns.

**Email**

- **Skill(email-best-practices)**
  Required for email implementation, deliverability, templates, or any email-related functionality.

**Marketing & SEO**

- **Skill(copy-editing)**
  Required for editing, reviewing, or improving existing marketing copy.
- **Skill(copywriting)**
  Required for writing new marketing copy from scratch.
- **Skill(programmatic-seo)**
  Required for building SEO pages at scale using templates and data.
- **Skill(seo-audit)**
  Required for auditing, reviewing, or diagnosing SEO issues.

**Frontend & UI**

- **Skill(baseline-ui)**
  Required for baseline UI implementation, component scaffolding, or foundational UI patterns.
- **Skill(fixing-accessibility)**
  Required for fixing accessibility issues, ARIA attributes, keyboard navigation, or screen reader support.
- **Skill(fixing-metadata)**
  Required for fixing metadata tags, Open Graph, Twitter Cards, or structured data.
- **Skill(fixing-motion-performance)**
  Required for fixing animation performance, jank, frame rate issues, or motion-related optimizations.

## Final Warning

If a response matches a condition and does **not** apply the required skill:

**STOP. DO NOT ANSWER. FIX THE RESPONSE.**

This is enforcement, not guidance.
