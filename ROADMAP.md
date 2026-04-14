# Full-Stack Roadmap: Question Generation & Assessment Platform (React + Node + MySQL + OpenRouter)

## 1) Product Summary

### Core Goal
Build a full-stack web app that:
- Authenticates users securely (JWT login/signup).
- Uses the OpenRouter API to generate interview questions automatically.
- Accepts user answers and evaluates them via OpenRouter, producing structured feedback + scores.
- Scores user resumes via OpenRouter (v1), producing structured feedback, ATS-style scoring, and role-fit insights.
- Persists all data in MySQL, including users, generated questions, user answers, and evaluation results.

### Primary User Flows
1. Signup → Connect OpenRouter (Google popup) → Start an “Interview Session”
2. Select role/topic/difficulty → Generate question(s)
3. User submits answer → AI evaluates → Score + feedback shown
4. Upload resume → AI evaluates → Score + feedback shown
5. History: review past sessions/questions/answers/scores and resume evaluations

### Non-Goals (for v1)
- Real-time collaborative interviews
- Voice/video answering
- Fully automated proctoring / plagiarism detection

---

## 2) Technical Architecture

### High-Level Components
- **Frontend**: React.js SPA (routing, state management, forms, session UI)
- **Backend API**: Node.js (REST API, auth, OpenRouter orchestration, persistence)
- **Database**: MySQL (transactional persistence; indices and constraints)
- **External AI**: OpenRouter API (question generation + answer evaluation)

### Recommended Stack (Opinionated, Replaceable)
- Frontend: React + TypeScript, Vite, React Router, TanStack Query, zod (validation), Magic UI Pro (https://pro.magicui.design/) templates/components for a polished, intuitive UI (responsive layouts, animations, SEO-friendly structure; optional MDX blog support)
- Backend: Node.js + TypeScript, Express (or Fastify), zod/joi, mysql2 (Sequelize orm), helmet, cors, express-rate-limit
- Auth: bcrypt/argon2 for password hashing; JWT access token (+ optional refresh token)
- Observability: pino/winston, request IDs, metrics + traces (optional)

### Logical Diagram
```text
Browser (React SPA)
  |
  | HTTPS (JSON)
  v
Node.js API (Auth + Sessions + Q&A)
  |
  | SQL (transactions, foreign keys)
  v
MySQL
  ^
  | HTTPS (OpenRouter API)
  |
OpenRouter (LLM)
```

### Data Flow (Q&A)
1. Frontend requests a new question (role/topic/difficulty/context).
2. Backend validates input, checks user JWT, creates a question record (status = “pending”).
3. Backend calls OpenRouter for question generation, stores prompt + model + raw response.
4. Backend extracts a structured question payload and saves it (status = “ready”).
5. User submits answer; backend stores the answer attempt.
6. Backend calls OpenRouter for evaluation, stores structured scoring + raw response.
7. Backend returns evaluation to frontend; frontend displays score + feedback.

---

## 3) OpenRouter Integration Design

### Usage Patterns
- **Question generation**: Provide role, seniority, topic tags, constraints, and desired format.
- **Evaluation**: Provide the question, user answer, rubric, and require a strict JSON response schema.
- **Resume scoring (v1)**: Provide role/target job, resume text, and require a strict JSON response schema (scores + actionable edits).

### BYOK (User-Provided OpenRouter Token) Onboarding
In v1, the platform uses each user’s own OpenRouter token for all OpenRouter calls.
- Signup completion requires OpenRouter connection.
- Frontend opens an OpenRouter signup/login flow in a popup (Google sign-in), then guides the user to create an OpenRouter API key.
- Automatic “single-click” key capture is typically not possible with API keys: the app cannot read secrets from the OpenRouter site (cross-origin + key secrecy), and most providers show keys only once.
- Best v1 UX is “low-friction BYOK”: deep-link user to the key creation page and provide a single “Paste from clipboard” action (user still creates/copies the key, the app auto-fills on paste, then verifies and stores it encrypted).
- If OpenRouter later supports an OAuth-style flow or a key provisioning API that returns a token to your backend, upgrade to true one-click connect (no copy/paste).

### Prompts & Output Contracts (Critical)
To make the system reliable, enforce:
- A fixed JSON schema for question generation and evaluation outputs.
- Server-side JSON parsing + schema validation (reject and retry with “repair” prompt if invalid).

#### Question Generation Output Schema (example)
```json
{
  "question": "string",
  "topic": "string",
  "difficulty": "easy|medium|hard",
  "expected_points": ["string"],
  "timebox_seconds": 300
}
```

#### Evaluation Output Schema (example)
```json
{
  "score": 0,
  "max_score": 100,
  "rubric": {
    "correctness": 0,
    "depth": 0,
    "clarity": 0
  },
  "strengths": ["string"],
  "improvements": ["string"],
  "model_answer": "string",
  "verdict": "pass|borderline|fail"
}
```

#### Resume Scoring Output Schema (example)
```json
{
  "overall_score": 0,
  "max_score": 100,
  "ats_score": 0,
  "role_fit_score": 0,
  "strengths": ["string"],
  "gaps": ["string"],
  "rewrite_suggestions": [
    {
      "section": "string",
      "before": "string",
      "after": "string",
      "reason": "string"
    }
  ],
  "keyword_suggestions": ["string"],
  "red_flags": ["string"]
}
```

### Model Strategy
- Maintain a server-side config table or env-based configuration:
  - `OPENROUTER_MODEL_QUESTION`
  - `OPENROUTER_MODEL_EVAL`
  - `OPENROUTER_MODEL_RESUME`
- Store the selected model for each request to preserve auditability.

### Reliability Controls
- Timeouts, exponential backoff, and bounded retries.
- “Repair” retry path for invalid JSON outputs.
- Rate limiting per user and global quotas.
- Circuit breaker behavior if OpenRouter is down (graceful error UI + queued retry option).

---

## 4) Backend API Design (Node.js)

### Service Boundaries (internal modules)
- **Auth Service**: password hashing, JWT issuance/verification, refresh/rotation (optional)
- **User Service**: profile, preferences
- **OpenRouter Credential Service**: OpenRouter onboarding (Google popup), store/rotate user-provided OpenRouter API key, validate key
- **Interview Service**: sessions, question generation, answer submission, evaluation
- **Resume Service**: resume ingestion (text extraction), scoring requests, history
- **OpenRouter Client**: request building, timeouts/retries, JSON schema enforcement
- **Persistence Layer**: repositories/ORM + migrations

### API Conventions
- Versioning: `/api/v1`
- JSON only
- Standard error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": []
  }
}
```
- Auth header: `Authorization: Bearer <accessToken>`

### REST Endpoints (Proposed)

#### Auth
- `POST /api/v1/auth/signup`
  - body: `{ email, password, displayName }`
  - response: `{ user, accessToken, refreshToken? }`
- `POST /api/v1/auth/login`
  - body: `{ email, password }`
  - response: `{ user, accessToken, refreshToken? }`
- `POST /api/v1/auth/refresh` (optional but recommended)
  - body or cookie-based refresh token
  - response: `{ accessToken }`
- `POST /api/v1/auth/logout` (optional)
  - invalidates refresh token (server-side)

#### User
- `GET /api/v1/me`
- `PATCH /api/v1/me`

#### OpenRouter Credentials (BYOK)
- `POST /api/v1/openrouter/connect`
  - response: `{ url }` (frontend opens in a popup)
- `GET /api/v1/openrouter/callback`
  - optional: only if OpenRouter supports an OAuth-style connect flow
  - response: `{ success: true }`
- `PUT /api/v1/openrouter/api-key`
  - body: `{ apiKey }`
  - response: `{ status: "active", keyHint: "sk-...abcd" }`
- `POST /api/v1/openrouter/verify`
  - response: `{ status: "active" | "invalid" }`
- `DELETE /api/v1/openrouter/api-key`
  - response: `{ status: "removed" }`

#### Interviews / Sessions
- `POST /api/v1/sessions`
  - body: `{ role, topics[], difficulty, questionCount, timeboxSeconds? }`
  - response: `{ session }`
- `GET /api/v1/sessions`
  - supports paging/filtering
- `GET /api/v1/sessions/:sessionId`
- `POST /api/v1/sessions/:sessionId/questions`
  - body: `{ count? }`
  - response: `{ questions[] }`
- `POST /api/v1/questions/:questionId/answers`
  - body: `{ answerText }`
  - response: `{ answerAttempt, evaluation }`
- `GET /api/v1/questions/:questionId`
- `GET /api/v1/questions/:questionId/answers`

#### Resume Scoring (v1)
- `POST /api/v1/resumes`
  - body: multipart upload (`file`) OR JSON (`resumeText`)
  - response: `{ resume }`
- `POST /api/v1/resumes/:resumeId/evaluate`
  - body: `{ targetRole, targetLevel?, targetLocation?, jobDescriptionText? }`
  - response: `{ evaluation }`
- `GET /api/v1/resumes`
  - supports paging/filtering
- `GET /api/v1/resumes/:resumeId`
- `GET /api/v1/resumes/:resumeId/evaluations`

#### Admin (optional)
- `GET /api/v1/admin/usage`
- `GET /api/v1/admin/audit/openrouter-calls`

---

## 5) Frontend Architecture (React)

### Pages / Routes
- Public:
  - `/login`
  - `/signup`
- Private:
  - `/dashboard` (recent sessions + start new)
  - `/onboarding/openrouter` (Google popup connect + “API key connected” confirmation; blocks core features until completed)
  - `/resume-score` (upload/paste resume, choose target role, run scoring, show rewrite suggestions)
  - `/sessions/:sessionId` (progress, questions, submit answers)
  - `/history` (filters, search)
  - `/sessions/:sessionId/review` (per-question review with rubric)
  - `/resumes/:resumeId` (resume details + evaluation history)

### State Management
- Auth state: access token in memory; refresh token in secure httpOnly cookie (recommended).
- Server state: TanStack Query (or equivalent) for caching and invalidation.

### UX Requirements
- Clear states: loading, generating question, evaluating answer, rate-limited, OpenRouter unavailable.
- Autosave drafts locally (optional) to prevent answer loss.

---

## 6) Database Schema (MySQL)

### Core Entities
- `users`: authentication identity + profile
- `openrouter_credentials`: encrypted OpenRouter API key per user (bring-your-own-key)
- `refresh_tokens` (optional): refresh token rotation and logout
- `sessions`: interview session metadata (role/topics/difficulty)
- `questions`: generated questions per session (prompt + model + output)
- `answer_attempts`: each user answer submission for a question
- `evaluations`: AI evaluation output and score tied to an answer attempt
- `resumes`: stored resume content (recommended: extracted text; avoid storing raw files unless needed)
- `resume_evaluations`: AI scoring output and scores tied to a resume
- `openrouter_calls`: audit table for external calls (optional but useful)

### DDL Sketch (v1)
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE openrouter_credentials (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL UNIQUE,
  api_key_ciphertext VARBINARY(2048) NOT NULL,
  api_key_key_version VARCHAR(50) NOT NULL,
  api_key_hint VARCHAR(32) NOT NULL,
  status ENUM('active','invalid','revoked') NOT NULL DEFAULT 'active',
  last_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  role VARCHAR(120) NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL,
  topics_json JSON NULL,
  question_target_count INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user_created (user_id, created_at)
);

CREATE TABLE questions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  status ENUM('pending','ready','failed') NOT NULL DEFAULT 'pending',
  prompt_text TEXT NOT NULL,
  model VARCHAR(200) NOT NULL,
  question_text TEXT NULL,
  topic VARCHAR(120) NULL,
  difficulty ENUM('easy','medium','hard') NULL,
  expected_points_json JSON NULL,
  timebox_seconds INT NULL,
  openrouter_raw_response_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_questions_session_created (session_id, created_at)
);

CREATE TABLE answer_attempts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  question_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  answer_text MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_answers_user_created (user_id, created_at)
);

CREATE TABLE evaluations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  answer_attempt_id BIGINT NOT NULL UNIQUE,
  prompt_text TEXT NOT NULL,
  model VARCHAR(200) NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL DEFAULT 100,
  rubric_json JSON NOT NULL,
  strengths_json JSON NULL,
  improvements_json JSON NULL,
  model_answer MEDIUMTEXT NULL,
  verdict ENUM('pass','borderline','fail') NULL,
  openrouter_raw_response_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (answer_attempt_id) REFERENCES answer_attempts(id) ON DELETE CASCADE
);

CREATE TABLE resumes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  source ENUM('upload','paste') NOT NULL,
  filename VARCHAR(255) NULL,
  content_type VARCHAR(120) NULL,
  resume_text MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_resumes_user_created (user_id, created_at)
);

CREATE TABLE resume_evaluations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resume_id BIGINT NOT NULL,
  prompt_text TEXT NOT NULL,
  model VARCHAR(200) NOT NULL,
  overall_score INT NOT NULL,
  max_score INT NOT NULL DEFAULT 100,
  ats_score INT NULL,
  role_fit_score INT NULL,
  strengths_json JSON NULL,
  gaps_json JSON NULL,
  rewrite_suggestions_json JSON NULL,
  keyword_suggestions_json JSON NULL,
  red_flags_json JSON NULL,
  openrouter_raw_response_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  INDEX idx_resume_evals_resume_created (resume_id, created_at)
);
```

### Indexing & Constraints
- Unique email on `users`.
- Composite indices for user/session timelines (history screens).
- Enforce 1 evaluation per answer attempt via `UNIQUE (answer_attempt_id)`.

### Migrations & Seed Data
- Use a migration tool (Prisma Migrate, Knex migrations, or Flyway).
- Provide seed scripts for local dev:
  - demo user
  - demo sessions/questions (optional)

---

## 7) Security Considerations

### Authentication & JWT
- Hash passwords with bcrypt/argon2 + per-password salt.
- JWT access tokens short-lived (e.g., 10–15 minutes).
- Refresh token rotation (recommended):
  - Store refresh tokens in `refresh_tokens` table as hashed values.
  - Send refresh token via secure, httpOnly cookie with `SameSite=Lax/Strict`.
- JWT signing:
  - Prefer asymmetric keys (RS256) for easier rotation; HS256 acceptable if secrets are managed well.

### API Security
- Strict input validation on every endpoint.
- CORS allowlist (no wildcard in production).
- Rate limiting:
  - Auth endpoints (login/signup)
  - OpenRouter-heavy endpoints (generate/evaluate)
- Helmet-like hardening headers, disable stack traces in production.
- SQL injection prevention by parameterized queries / ORM.

### Secrets & Data Handling
- OpenRouter API key only on the server (never in frontend).
- Environment variables for secrets; do not commit keys.
- Encrypt at rest where possible (managed DB) and enforce TLS in transit.
- Avoid storing unnecessary personal data; keep PII minimal.
- OpenRouter BYOK (user-provided token):
  - Store per-user OpenRouter API key encrypted (envelope encryption; AES-256-GCM with a master key in a secret manager/KMS).
  - Never log tokens, never return full token after initial save; only store/display a short hint (last 4–6 chars).
  - Support key rotation (user can replace/revoke at any time) and verification (lightweight call to confirm validity).
  - Gate AI features until a valid key is present to ensure the app uses the user’s own OpenRouter token thereafter.
- Resume handling:
  - Enforce file size limits and content-type allowlist for uploads.
  - Prefer storing extracted text over raw files; if raw files are stored, keep them in private object storage with short-lived signed URLs.
  - Apply data retention controls (resumes often contain sensitive PII).

### Abuse Prevention
- Per-user quota controls (daily token usage, number of evaluations/day).
- Spam detection for answers if needed (length bounds, profanity filters optional).

---

## 8) Development Phases (Milestones)

### Phase 0 — Foundations
- Repo layout: `frontend/` and `backend/`
- Tooling: TypeScript, linting, formatting, env management
- Local dev: MySQL via Docker compose, migrations wired
- Frontend UI baseline: adopt Magic UI Pro templates/components and define design system tokens (colors/typography/spacing) for consistent, intuitive flows

### Phase 1 — Auth + User Model
- Signup/login endpoints
- Password hashing + JWT issuance
- Protected route middleware
- Frontend login/signup screens + token handling
- Persist user profile in MySQL
- OpenRouter BYOK onboarding:
  - Signup flow redirects into `/onboarding/openrouter`
  - “Connect with Google” popup guides user through OpenRouter login/signup and API key creation
  - Low-friction key handoff: “Paste from clipboard” button in the app (user copies key; app reads clipboard on user gesture)
  - Save encrypted OpenRouter API key for the user and verify it before enabling AI features

### Phase 2 — Sessions + Question Generation
- Create/list sessions
- Generate and persist questions via OpenRouter
- Frontend session creation + question display
- Robust JSON schema validation for question generation

### Phase 3 — Answer Submission + Evaluation + Resume Scoring (v1)
- Submit answers per question
- Evaluate answers via OpenRouter with strict JSON schema
- Persist answer attempts + evaluations + raw responses
- Frontend evaluation UI (score + rubric + improvement bullets)
- Resume ingestion:
  - Upload (PDF/DOCX) or paste text, server-side extraction/normalization
  - Persist `resumes` records linked to user
- Resume scoring via OpenRouter with strict JSON schema
- Resume scoring UI:
  - Overall + ATS + role-fit score
  - Rewrite suggestions with before/after and reasons

### Phase 4 — History + Review Experience
- Session history list with paging
- Per-session review view: question → answer(s) → evaluation(s)
- Basic analytics: average score per topic/difficulty (optional)

### Phase 5 — Hardening + Admin (Optional)
- Refresh token rotation
- Audit logs for OpenRouter calls
- Abuse controls, quotas, monitoring dashboards

---

## 9) Testing Strategy

### Backend
- Unit tests:
  - prompt builders (question/eval)
  - prompt builders (resume scoring)
  - schema validators/parsers
  - auth utilities (token creation/verification)
- Integration tests:
  - API endpoints against a test MySQL instance
  - OpenRouter client mocked (contract tests for schema parsing)
  - resume ingestion path (upload/paste) with strict validation and size limits
- Security tests:
  - auth brute-force rate limit checks
  - input validation coverage (reject invalid payloads)

### Frontend
- Component tests:
  - forms, error states, loading states
- E2E tests (Playwright/Cypress):
  - signup → login → create session → generate question → submit answer → see evaluation
  - signup → login → upload/paste resume → run scoring → see rewrites + scores
- Accessibility checks (a11y)

### CI Gates
- Lint + typecheck
- Unit/integration test suite
- Build verification for frontend and backend

---

## 10) Deployment Procedures

### Environments
- **Dev**: local MySQL + local backend + local frontend
- **Staging**: mirrors prod with smaller scale, separate OpenRouter key
- **Prod**: hardened configs, TLS everywhere, strict allowlists

### Containerization (Recommended)
- Docker image for backend API
- Static build for frontend served via CDN (or Nginx)
- MySQL via managed service (AWS RDS / Cloud SQL) or self-hosted container (not ideal for prod)

### Production Checklist
- TLS termination (Cloudflare / ALB / Nginx)
- DB migrations automated during deploy
- Secrets managed by a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault)
- Log aggregation (CloudWatch/Datadog/etc.)
- Monitoring: latency, error rate, OpenRouter failures, token usage, DB slow queries

### CI/CD Flow (Example)
1. PR: lint/typecheck/tests/build
2. Merge to main: build and push images/artifacts
3. Deploy to staging; run smoke E2E tests
4. Manual approval gate (optional)
5. Deploy to production; run migrations + smoke tests; monitor

---

## 11) Operational Concerns

### Cost Management
- Track OpenRouter usage per user/session.
- Enforce quotas and tiering (free vs paid) even with BYOK, to prevent abuse and protect platform resources (DB, bandwidth, compute).
- Communicate clearly that OpenRouter usage is billed against the user’s own OpenRouter token when BYOK is enabled.
- Cache or reuse questions cautiously (avoid cross-user leakage; prefer per-user generation).

### Data Retention
- Keep raw OpenRouter responses for debugging initially; add retention policy later (e.g., delete after 30–90 days).
- Provide user deletion flow (GDPR-style): delete sessions/questions/answers/evaluations for a user.

### Auditability
- Store: prompt, model, timestamps, raw responses (with retention controls).
- Add request IDs to correlate frontend ↔ backend ↔ OpenRouter calls.
