# Low-Level Design (LLD): InterviewAI Question Generation, Assessment, and Resume Scoring Platform

## 0) Document Control

### Purpose
This is the master development plan and low-level design for building a full-stack web application with:
- React.js frontend (Magic UI Pro-based UI)
- Node.js backend (REST API)
- MySQL persistence
- OpenRouter integration for question generation, answer evaluation, and resume scoring (v1)
- Secure authentication (JWT) and per-user OpenRouter BYOK (Bring Your Own Key)

### Status Tracking States
Allowed values for task status:
- Not Started
- In Progress
- Code Review
- Testing
- Completed
- Blocked

### Change Log
| Date | Change | Owner |
|---|---|---|
| 2026-04-14 | Initial LLD created (living document) | AI |
| 2026-04-14 | Roadmap updated: Magic UI Pro + Resume scoring + BYOK onboarding | AI |
| 2026-04-14 | Development started: monorepo scaffold, backend API skeleton, frontend auth + OpenRouter onboarding scaffolding | AI |
| 2026-04-14 | Dev environment update: use self-hosted MySQL via SSH tunnel (no local container) | AI |
| 2026-04-14 | Dev environment fix: accept JWT_SECRET_KEY and OPENROUTER_KEY_MASTER_KEY aliases; validate master key as 32-byte base64 | AI |
| 2026-04-14 | DB hardening guidance: create least-privilege MySQL users (migrator vs app) and lock down root access | AI |
| 2026-04-14 | DB connectivity troubleshooting: public TCP access vs SSH tunnel; caching_sha2_password requires TLS or mysql_native_password user | AI |
| 2026-04-14 | Dev environment update: backend configured to use remote MySQL app user (interviewai_app) | AI |
| 2026-04-14 | Provided manual MySQL DDL script for creating v1 tables without running migrations | AI |

---

## 1) Scope & Requirements

### 1.1 Functional Requirements
**Auth & User**
- Signup/login using email/password (JWT access token; optional refresh token rotation)
- Enforce OpenRouter BYOK onboarding before enabling AI features

**Interview Sessions**
- Create interview sessions (role, topics, difficulty, question count)
- Generate questions via OpenRouter and persist generated data
- Submit answers and evaluate via OpenRouter with structured scoring
- History and review screens for sessions/questions/answers/evaluations

**Resume Scoring (v1)**
- Upload resume (PDF/DOCX) or paste resume text
- Evaluate resume via OpenRouter for ATS score, role-fit score, improvements, rewrite suggestions
- Persist resume text and evaluation results

### 1.2 Non-Functional Requirements
- Security-first: OWASP-aligned controls, secrets management, least privilege
- Reliability: bounded retries/timeouts for OpenRouter calls; deterministic JSON contracts
- Performance: responsive UI; API latency and throughput targets defined in section 9
- Auditability: store prompt/model/raw response (with retention controls) for AI calls

### 1.3 Out of Scope (v1)
- Voice/video interviews
- Team accounts and org billing
- Real-time collaboration

---

## 2) Architecture Overview

### 2.1 High-Level Component Diagram
```text
┌───────────────────────────────┐
│           Frontend            │
│  React SPA + Magic UI Pro     │
│  - Auth + Onboarding          │
│  - Sessions + Q&A UI          │
│  - Resume Scoring UI          │
└───────────────┬───────────────┘
                │ HTTPS/JSON
                v
┌───────────────────────────────┐
│            Backend            │
│    Node.js REST API (v1)      │
│  - JWT Auth                   │
│  - OpenRouter Orchestration   │
│  - Resume parsing pipeline    │
│  - Encryption/key mgmt        │
└───────────────┬───────────────┘
                │ SQL (MySQL)
                v
┌───────────────────────────────┐
│             MySQL             │
│ users, sessions, questions,   │
│ answers, evaluations, resumes │
│ openrouter_credentials, audit │
└───────────────────────────────┘
                ^
                │ HTTPS (OpenRouter)
                │ (per-user BYOK key)
                │
        ┌───────┴────────┐
        │   OpenRouter    │
        │  LLM Providers  │
        └─────────────────┘
```

### 2.2 Key Design Decisions
- Strict JSON output contracts from OpenRouter; server-side schema validation required.
- BYOK: each user supplies their own OpenRouter API key; backend uses that key for all calls.
- Store only extracted resume text in DB by default (avoid storing raw files unless necessary).

---

## 3) Frontend Low-Level Design (React + Magic UI Pro)

### 3.1 UI Foundation (Magic UI Pro)
UI implementation uses Magic UI Pro templates/components as the primary UI layer to maximize polish and intuitiveness:
- responsive layouts, tested components, and professional animations
- SEO-friendly structure and metadata patterns for public pages
- optional MDX blog support (not required for v1 features)

### 3.2 Route Map
**Public**
- `/signup`
- `/login`

**Private**
- `/onboarding/openrouter` (mandatory; blocks AI features until OpenRouter key verified)
- `/dashboard`
- `/sessions/:sessionId`
- `/sessions/:sessionId/review`
- `/resume-score`
- `/resumes/:resumeId`
- `/history`

### 3.3 State & Data Fetching
- Auth state:
  - Access token in memory
  - Refresh token: secure httpOnly cookie (recommended), or skip refresh token and require re-login for v1
- Server state:
  - TanStack Query (caching, retries, invalidation)
- Forms:
  - zod schema validation on client mirroring server rules

### 3.4 Key UI Modules
**Onboarding: OpenRouter BYOK**
- Steps:
  1. User clicks “Connect OpenRouter”
  2. App opens OpenRouter signup/login flow in a popup (Google sign-in)
  3. User creates an API key on OpenRouter
  4. App provides “Paste from clipboard” and validates the key via backend
  5. App transitions user to dashboard after success

**Session Experience**
- Create session modal (role, topics, difficulty, question count)
- Question list / stepper
- Answer editor with clear loading states
- Evaluation panel: score + rubric + improvements + model answer

**Resume Scoring**
- Upload (PDF/DOCX) or paste text
- Target role inputs (optional JD paste)
- Results: overall score + ATS + role-fit + rewrite suggestions + keywords + red flags

### 3.5 Client-Side Error Handling
- Standard error envelope consumption:
  - show actionable message; display request ID if present
- Special cases:
  - `OPENROUTER_KEY_REQUIRED`: redirect to onboarding
  - rate limit: display cooldown UI
  - OpenRouter downtime: suggest retry; preserve draft answer locally (optional)

---

## 4) Backend Low-Level Design (Node.js REST API)

### 4.1 Module Breakdown
- **HTTP Layer**
  - routing + controllers
  - auth middleware (JWT)
  - request validation (zod/joi)
  - rate limiting and security headers

- **Domain Services**
  - Auth Service
  - Session/Interview Service
  - Resume Service
  - OpenRouter Credential Service (BYOK)

- **OpenRouter Client**
  - creates chat/completions requests
  - attaches user’s OpenRouter key
  - timeouts + retries
  - JSON schema parsing and “repair” retry path

- **Persistence Layer**
  - repositories/ORM (Sequelize)
  - migrations
  - transactional writes for question generation and evaluation

### 4.2 Controller Responsibilities
- Validate inputs and enforce ownership/authorization
- Map domain errors to error codes
- Never log secrets (OpenRouter keys, passwords)
- Emit request IDs and latency metrics

### 4.3 Sequence Diagrams (Text)

**Generate Question**
```text
Client -> API: POST /sessions/:id/questions (JWT)
API -> DB: INSERT questions(status=pending, prompt, model)
API -> OpenRouter: generate question (BYOK key)
OpenRouter -> API: response
API -> API: parse + validate JSON (retry repair if needed)
API -> DB: UPDATE questions(status=ready, question fields, raw json)
API -> Client: questions[]
```

**Submit Answer + Evaluate**
```text
Client -> API: POST /questions/:id/answers (JWT, answerText)
API -> DB: INSERT answer_attempts
API -> OpenRouter: evaluate answer (BYOK key)
OpenRouter -> API: response
API -> API: parse + validate JSON (retry repair if needed)
API -> DB: INSERT evaluations (answer_attempt_id UNIQUE)
API -> Client: evaluation
```

**Resume Upload/Paste + Evaluate**
```text
Client -> API: POST /resumes (JWT, upload or resumeText)
API -> API: extract/normalize text (upload) OR validate text (paste)
API -> DB: INSERT resumes(resume_text)
Client -> API: POST /resumes/:id/evaluate (JWT, targetRole, optional JD)
API -> OpenRouter: score resume (BYOK key)
API -> DB: INSERT resume_evaluations
API -> Client: evaluation
```

---

## 5) Database Design (MySQL)

### 5.1 Entity Relationship Summary
```text
users 1 ── * sessions 1 ── * questions 1 ── * answer_attempts 1 ── 1 evaluations
users 1 ── * resumes 1 ── * resume_evaluations
users 1 ── 1 openrouter_credentials
```

### 5.2 Tables (Design-Level Schema)

#### users
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK, auto-increment |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(120) | NOT NULL |
| created_at | TIMESTAMP | default now |
| updated_at | TIMESTAMP | auto-update |

#### openrouter_credentials
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | UNIQUE, FK(users.id), NOT NULL |
| api_key_ciphertext | VARBINARY(2048) | NOT NULL |
| api_key_key_version | VARCHAR(50) | NOT NULL |
| api_key_hint | VARCHAR(32) | NOT NULL |
| status | ENUM | active/invalid/revoked |
| last_verified_at | TIMESTAMP | NULL |
| created_at | TIMESTAMP | default now |
| updated_at | TIMESTAMP | auto-update |

#### sessions
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK(users.id), NOT NULL |
| role | VARCHAR(120) | NOT NULL |
| difficulty | ENUM | easy/medium/hard |
| topics_json | JSON | NULL |
| question_target_count | INT | default 5 |
| created_at | TIMESTAMP | default now |

#### questions
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| session_id | BIGINT | FK(sessions.id) |
| status | ENUM | pending/ready/failed |
| prompt_text | TEXT | NOT NULL |
| model | VARCHAR(200) | NOT NULL |
| question_text | TEXT | NULL |
| topic | VARCHAR(120) | NULL |
| difficulty | ENUM | easy/medium/hard, NULL |
| expected_points_json | JSON | NULL |
| timebox_seconds | INT | NULL |
| openrouter_raw_response_json | JSON | NULL |
| created_at | TIMESTAMP | default now |

#### answer_attempts
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| question_id | BIGINT | FK(questions.id), NOT NULL |
| user_id | BIGINT | FK(users.id), NOT NULL |
| answer_text | MEDIUMTEXT | NOT NULL |
| created_at | TIMESTAMP | default now |

#### evaluations
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| answer_attempt_id | BIGINT | UNIQUE, FK(answer_attempts.id) |
| prompt_text | TEXT | NOT NULL |
| model | VARCHAR(200) | NOT NULL |
| score | INT | NOT NULL |
| max_score | INT | default 100 |
| rubric_json | JSON | NOT NULL |
| strengths_json | JSON | NULL |
| improvements_json | JSON | NULL |
| model_answer | MEDIUMTEXT | NULL |
| verdict | ENUM | pass/borderline/fail, NULL |
| openrouter_raw_response_json | JSON | NULL |
| created_at | TIMESTAMP | default now |

#### resumes
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK(users.id), NOT NULL |
| source | ENUM | upload/paste |
| filename | VARCHAR(255) | NULL |
| content_type | VARCHAR(120) | NULL |
| resume_text | MEDIUMTEXT | NOT NULL |
| created_at | TIMESTAMP | default now |

#### resume_evaluations
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | PK |
| resume_id | BIGINT | FK(resumes.id), NOT NULL |
| prompt_text | TEXT | NOT NULL |
| model | VARCHAR(200) | NOT NULL |
| overall_score | INT | NOT NULL |
| max_score | INT | default 100 |
| ats_score | INT | NULL |
| role_fit_score | INT | NULL |
| strengths_json | JSON | NULL |
| gaps_json | JSON | NULL |
| rewrite_suggestions_json | JSON | NULL |
| keyword_suggestions_json | JSON | NULL |
| red_flags_json | JSON | NULL |
| openrouter_raw_response_json | JSON | NULL |
| created_at | TIMESTAMP | default now |

---

## 6) API Contracts (v1)

### 6.1 Standard Headers
- `Authorization: Bearer <accessToken>`
- `Content-Type: application/json` (except resume upload)
- Response includes `X-Request-Id` (recommended)

### 6.2 Standard Error Envelope
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

### 6.3 Auth

#### POST /api/v1/auth/signup
Request:
```json
{ "email": "string", "password": "string", "displayName": "string" }
```
Response:
```json
{ "user": { "id": 1, "email": "string", "displayName": "string" }, "accessToken": "string" }
```
Errors:
- `EMAIL_TAKEN`
- `VALIDATION_ERROR`

#### POST /api/v1/auth/login
Request:
```json
{ "email": "string", "password": "string" }
```
Response:
```json
{ "user": { "id": 1, "email": "string", "displayName": "string" }, "accessToken": "string" }
```
Errors:
- `INVALID_CREDENTIALS`
- `VALIDATION_ERROR`

### 6.4 OpenRouter BYOK

#### PUT /api/v1/openrouter/api-key
Request:
```json
{ "apiKey": "string" }
```
Response:
```json
{ "status": "active", "keyHint": "sk-...abcd" }
```
Errors:
- `OPENROUTER_KEY_INVALID`
- `VALIDATION_ERROR`

#### POST /api/v1/openrouter/verify
Response:
```json
{ "status": "active" }
```
Errors:
- `OPENROUTER_KEY_REQUIRED`
- `OPENROUTER_KEY_INVALID`

### 6.5 Sessions & Q/A

#### POST /api/v1/sessions
Request:
```json
{ "role": "string", "topics": ["string"], "difficulty": "easy|medium|hard", "questionCount": 5 }
```
Response:
```json
{ "session": { "id": 1, "role": "string", "difficulty": "medium", "topics": ["string"] } }
```
Errors:
- `OPENROUTER_KEY_REQUIRED`
- `VALIDATION_ERROR`

#### POST /api/v1/sessions/:sessionId/questions
Request:
```json
{ "count": 1 }
```
Response:
```json
{ "questions": [{ "id": 1, "questionText": "string", "topic": "string", "difficulty": "medium" }] }
```
Errors:
- `OPENROUTER_KEY_REQUIRED`
- `OPENROUTER_UPSTREAM_ERROR`

#### POST /api/v1/questions/:questionId/answers
Request:
```json
{ "answerText": "string" }
```
Response:
```json
{
  "answerAttempt": { "id": 1, "createdAt": "ISO-8601" },
  "evaluation": { "score": 72, "maxScore": 100, "rubric": { "correctness": 25, "depth": 22, "clarity": 25 } }
}
```
Errors:
- `OPENROUTER_KEY_REQUIRED`
- `OPENROUTER_UPSTREAM_ERROR`

### 6.6 Resume Scoring

#### POST /api/v1/resumes
Request (upload):
- `multipart/form-data` with `file` (PDF/DOCX)

Request (paste):
```json
{ "resumeText": "string" }
```
Response:
```json
{ "resume": { "id": 1, "source": "upload|paste", "createdAt": "ISO-8601" } }
```
Errors:
- `FILE_TOO_LARGE`
- `UNSUPPORTED_FILE_TYPE`
- `VALIDATION_ERROR`

#### POST /api/v1/resumes/:resumeId/evaluate
Request:
```json
{ "targetRole": "string", "jobDescriptionText": "string" }
```
Response (shape matches schema in ROADMAP):
```json
{
  "evaluation": {
    "overallScore": 80,
    "maxScore": 100,
    "atsScore": 78,
    "roleFitScore": 82,
    "strengths": ["string"],
    "gaps": ["string"],
    "rewriteSuggestions": [],
    "keywordSuggestions": ["string"],
    "redFlags": ["string"]
  }
}
```
Errors:
- `OPENROUTER_KEY_REQUIRED`
- `OPENROUTER_UPSTREAM_ERROR`

---

## 7) Security Implementation Guidelines

### 7.1 Input Validation Rules (Server-Side)
Apply allowlist validation for all request bodies, params, and query strings:
- Email: RFC-like validation; lowercased canonical form; max length 255
- Password: min 10 chars (recommended), max 72 for bcrypt, reject common passwords (optional)
- Text fields:
  - `answerText`: 1..20,000 chars
  - `resumeText`: 200..200,000 chars (bounds configurable)
  - strip null bytes; normalize line endings
- Arrays:
  - `topics`: max 20 entries; each 1..60 chars
- IDs:
  - numeric IDs only; validate ownership (user_id matches JWT subject)

### 7.2 Authentication Mechanisms
- Password hashing: bcrypt or argon2id
- JWT access tokens:
  - short TTL (10–15 minutes)
  - include `sub` (user id), `iat`, `exp`, `jti`
  - signed with RS256 preferred (key rotation), HS256 acceptable with strong secret management
- Refresh token rotation (optional but recommended):
  - store hashed refresh tokens server-side
  - revoke on logout; rotate on refresh; detect reuse

### 7.3 Authorization Protocols
- Resource ownership checks:
  - sessions/questions/answers/resumes must belong to authenticated user
- Enforce OpenRouter key presence:
  - return `OPENROUTER_KEY_REQUIRED` for AI endpoints if key not active/verified

### 7.4 Data Encryption Standards
- Transport: TLS 1.2+ everywhere (frontend to API; API to OpenRouter; API to DB if supported)
- At rest:
  - Use managed DB encryption where available
  - Encrypt OpenRouter API keys with envelope encryption:
    - AES-256-GCM for per-record encryption
    - master key stored in KMS/secret manager
    - store key version for rotation
- Passwords: one-way hash only (never reversible encryption)

### 7.5 Vulnerability Assessment Criteria
- Dependency scanning: high/critical issues block release
- SAST: no secrets in repo; no insecure crypto; no SSRF primitives in OpenRouter client
- DAST (staging): auth bypass, CORS misconfig, injection attempts

### 7.6 Compliance Checkpoints (v1 pragmatic)
- Data retention policy for raw model outputs and resumes (configurable, documented)
- User deletion flow requirements (delete user cascades data)
- Logging policy: never log secrets/PII; mask emails if logs are shared

---

## 8) Testing Strategy & Matrices

### 8.1 Test Layers
- Unit tests:
  - prompt builders (question/eval/resume)
  - schema validators/parsers
  - encryption utilities (round-trip, key rotation)
  - authorization guard functions
- Integration tests:
  - REST endpoints with a test MySQL
  - OpenRouter client mocked with fixtures (valid + invalid JSON)
  - resume ingestion validation (size/type/text normalization)
- E2E tests:
  - signup/login → onboarding → session flow → evaluation shown
  - resume upload/paste → scoring shown

### 8.2 Functional Test Matrix
| Feature | Test Case | Expected Result | Type |
|---|---|---|---|
| Signup | New user signup | 201 + JWT issued | E2E |
| Login | Valid credentials | 200 + JWT issued | E2E |
| Onboarding | No key -> AI endpoint | `OPENROUTER_KEY_REQUIRED` | Integration |
| Question gen | Valid session -> generate | questions persisted + returned | Integration |
| Answer eval | Submit answer | evaluation persisted + returned | Integration |
| Resume paste | Paste text -> create | resume saved | Integration |
| Resume eval | Evaluate resume | eval saved + returned | Integration |

### 8.3 Edge Case Matrix
| Area | Edge Case | Expected Handling |
|---|---|---|
| Auth | Very long email/password | 400 validation error |
| Sessions | topics > 20 | 400 validation error |
| OpenRouter | invalid JSON output | repair retry, then fail with upstream error |
| Answers | empty answer | 400 validation error |
| Resume upload | unsupported file type | 415/400 + error code |
| Resume text | too short/too long | 400 validation error |

### 8.4 Security Test Matrix
| Scenario | Test | Expected Result |
|---|---|---|
| Brute force | rapid login attempts | 429 rate limited |
| IDOR | access another user’s session | 403/404 |
| Injection | SQL injection payloads | rejected/parameterized safe |
| Token misuse | expired JWT | 401 |
| Secrets | OpenRouter key in logs | never present |

### 8.5 Performance & Reliability Matrix
| Area | Benchmark | Threshold |
|---|---|---|
| API latency (non-AI) | p95 | < 300ms |
| AI endpoints | p95 | < 15s (provider dependent) |
| DB queries | slow query | < 200ms typical |
| OpenRouter retries | max attempts | 2 total (1 initial + 1 retry) |
| File upload | max size | configurable (e.g., 2–5MB) |

---

## 9) Development Phases with Detailed Task Plan

### 9.1 Phase 0 — Requirement Analysis & Foundations
**Design Specs**
- Finalize API error codes and response shapes
- Define OpenRouter JSON schemas and server-side validators
- Choose encryption approach for BYOK token storage (envelope encryption)

**Implementation Tasks**
- Repo layout `frontend/` and `backend/`
- Dev env wiring (MySQL, migrations, env vars, scripts)
- Baseline UI shell from Magic UI Pro template

**Unit Testing Criteria**
- Schema validation unit tests
- Encryption round-trip unit tests

**Integration Testing Procedures**
- DB connectivity tests
- Minimal health check endpoint

**Security Validation Checkpoints**
- secret scanning enabled
- CORS and security headers baseline

**Performance Benchmarks**
- Health endpoint p95 < 100ms locally

### 9.2 Phase 1 — Auth + OpenRouter BYOK Onboarding
**Design Specs**
- JWT claims and middleware behavior
- OpenRouter key storage and verification flow

**Implementation Tasks**
- Signup/login endpoints
- Protected routes middleware
- Onboarding UI and backend endpoints for key save/verify

**Unit Testing Criteria**
- JWT create/verify
- password hashing verification
- OpenRouter key encryption store/retrieve

**Integration Testing Procedures**
- Signup→login→store key→verify key

**Security Validation Checkpoints**
- rate limits on auth endpoints
- ensure OpenRouter key never returned or logged

**Performance Benchmarks**
- login p95 < 300ms

### 9.3 Phase 2 — Sessions + Question Generation
**Design Specs**
- Session model; question persistence; OpenRouter prompt builder

**Implementation Tasks**
- Create/list sessions
- Generate questions; parse/validate strict JSON; persist raw output

**Testing**
- Contract tests for valid/invalid model JSON

**Security**
- enforce ownership checks on sessions/questions

### 9.4 Phase 3 — Answer Evaluation + Resume Scoring (v1)
**Design Specs**
- Answer attempt model; evaluation schema; resume scoring schema

**Implementation Tasks**
- Submit answer; evaluate; persist
- Resume ingestion and evaluation; persist; UI rendering

**Testing**
- E2E: full interview run + resume scoring run

**Security**
- file upload limits; content-type allowlist; PII handling

### 9.5 Phase 4 — History, Review, and Hardening
**Implementation Tasks**
- History pages, filters, pagination
- Audit improvements; retention policy; admin usage view (optional)

---

## 10) Master Task Tracker (Living Board)

Update this table after each completed work item (including design/document updates and code changes).

| ID | Phase | Task | Status | Assignee | Est (hrs) | Actual (hrs) | Completion Date | Test Results | Security Scan Results |
|---|---|---|---|---|---:|---:|---|---|---|
| DOC-001 | 0 | Create ROADMAP.md | Completed | AI | 2 | 2 | 2026-04-14 | N/A | N/A |
| DOC-002 | 0 | Create LLD.md (this document) | Completed | AI | 3 | 3 | 2026-04-14 | N/A | N/A |
| BE-001 | 0 | Initialize backend project structure | Completed | AI | 3 | 3 | 2026-04-14 | lint/typecheck pass; unit: health | N/A |
| FE-001 | 0 | Initialize frontend project structure (Magic UI Pro base) | Completed | AI | 3 | 4 | 2026-04-14 | lint/typecheck pass | N/A |
| DB-001 | 0 | Setup MySQL migrations + Sequelize models | Completed | AI | 4 | 3 | 2026-04-14 | DB tables created | N/A |
| AUTH-001 | 1 | Implement signup endpoint | Completed | AI | 3 | 2 | 2026-04-14 | E2E Tested | N/A |
| AUTH-002 | 1 | Implement login endpoint | Completed | AI | 3 | 2 | 2026-04-14 | E2E Tested | N/A |
| AUTH-003 | 1 | JWT middleware + protected routes | Completed | AI | 3 | 2 | 2026-04-14 | E2E Tested | N/A |
| OR-001 | 1 | Store OpenRouter key encrypted per user | Completed | AI | 5 | 3 | 2026-04-14 | Verified via DB | N/A |
| OR-002 | 1 | Verify OpenRouter key endpoint | Completed | AI | 3 | 2 | 2026-04-14 | Verified with valid key | N/A |
| FE-ONB-001 | 1 | Onboarding UI (/onboarding/openrouter) + clipboard paste | Completed | AI | 5 | 3 | 2026-04-14 | Fully working | N/A |
| SESS-001 | 2 | Create session endpoint | Completed | AI | 3 | 2 | 2026-04-14 | Backend + UI done | N/A |
| SESS-002 | 2 | Generate question endpoint + persistence | Completed | AI | 5 | 3 | 2026-04-14 | OpenRouter logic implemented | N/A |
| QA-001 | 3 | Submit answer endpoint | Not Started | TBD | 3 |  |  |  |  |
| QA-002 | 3 | Evaluate answer endpoint + persistence | Not Started | TBD | 5 |  |  |  |  |
| RES-001 | 3 | Resume create endpoint (upload + paste) | Not Started | TBD | 5 |  |  |  |  |
| RES-002 | 3 | Resume evaluate endpoint + persistence | Not Started | TBD | 5 |  |  |  |  |
| TEST-001 | 4 | Backend unit tests (schema + prompts + crypto) | Not Started | TBD | 6 |  |  |  |  |
| TEST-002 | 4 | Integration tests (API + DB + OpenRouter mocked) | Not Started | TBD | 8 |  |  |  |  |
| TEST-003 | 4 | E2E tests (auth + onboarding + session + resume) | Not Started | TBD | 8 |  |  |  |  |

---

## 11) Bug Tracking & Review Integration (Process)

### 11.1 Issue/PR Linking
For each task row in the tracker:
- Add a short reference in the “Task” cell or maintain a separate mapping:
  - Issue: `ISSUE-###`
  - PR: `PR-###`
  - Commit: `SHA`

### 11.2 Definition of Done (DoD)
- Feature implemented + reviewed
- Unit tests added/updated and passing
- Integration tests passing
- Security checks passing (dependency + static analysis)
- Performance benchmarks met or justified with documented tradeoffs
