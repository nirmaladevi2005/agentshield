# AgentShield 🛡️
> **Let AI Agents Act. Make Every Action Safe.**

[![Platform Status](https://img.shields.io/badge/Status-Production%20Ready%20MVP-success)](#)
[![Automated Tests](https://img.shields.io/badge/Pytest-31%20Passed%20(100%25)-brightgreen)](#)
[![TypeScript Build](https://img.shields.io/badge/Frontend-0%20Errors-brightgreen)](#)
[![AI Engine](https://img.shields.io/badge/AI%20Advisory-Google%20Gemini%202.5%20Flash-blue)](#)
[![Security Model](https://img.shields.io/badge/Defense-Deterministic%20Zero--Tolerance-blueviolet)](#)
[![Milestone](https://img.shields.io/badge/Event-Startup%20Buildathon%20India%202026-orange)](#)

AgentShield is a professional, production-ready AI security testing, continuous monitoring, and vulnerability intelligence platform. It enables developers and enterprise SecOps teams to discover, evaluate, intercept, and fix security vulnerabilities in autonomous AI agents before and during deployment.

---

## 📚 Buildathon Presentation Materials & Documentation

- 🏛️ **System Architecture & Technical Specs:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- ⏱️ **5-Minute Live Jury Pitch & Demo Script:** [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)
- 📊 **10-Slide Startup Pitch Deck:** [`docs/PITCH_DECK.md`](docs/PITCH_DECK.md)
- 📖 **API Documentation (Swagger UI):** Available at `http://localhost:8000/docs`

---

## 🔄 The 14-Step Complete Security Lifecycle

AgentShield delivers an end-to-end operational loop for autonomous AI agents:

```
  1. REGISTER AGENT        (Sandbox, Local Dev Adapter, or HTTP Endpoint)
          │
  2. CONFIGURE POLICIES    (Granular tool access, read/write bounds, human approval flags)
          │
  3. LAUNCH RED-TEAM       (12+ curated attack scenarios across 4 threat vectors)
          │
  4. INTERCEPT CALLS       (Runtime PermissionEngine intercepts restricted/unsafe tool actions)
          │
  5. DETECT CANARIES       (Deterministic exact scanning for synthetic secrets in outputs)
          │
  6. RECORD EVIDENCE       (Tamper-evident logs, execution steps, tool arguments, trace UUIDs)
          │
  7. SCORE RISK (0–100)    (Deterministic mathematical scoring based on confirmed severity)
          │
  8. ADVISORY AI ANALYSIS  (Google Gemini 2.5 Flash explains root causes & synthesizes threat scenarios)
          │
  9. GENERATE CODE DIFFS   (Unified copy-pasteable remediation diffs & tightened policy suggestions)
          │
 10. HUMAN APPROVAL        (Authenticated SecOps engineer reviews and signs off on policy changes)
          │
 11. APPLY HARDENING       (PermissionEngine automatically enforces approved policy constraints)
          │
 12. DIFFERENTIAL RETEST   (Regression testing compares baseline vs current: FIXED, UNRESOLVED, REGRESSED)
          │
 13. CONTINUOUS MONITORING (Runtime telemetry stream, tool velocity tracking, real-time SecOps alerts)
          │
 14. COMPLIANCE AUDITING   (Evidence-backed audit reports mapped to OWASP LLM Top 10 & NIST AI RMF)
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **Backend API** | Python 3.12, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy 2.0 ORM |
| **AI Intelligence Layer** | Google Gemini 2.5 Flash (Structured Outputs) + Deterministic Offline Fallback |
| **Security Shield** | Deterministic `PermissionEngine`, Canary Secret Detectors, Sandboxed Mock Environment |
| **Databases** | Zero-config SQLite (Local Dev) / PostgreSQL (Cloud Production) |
| **Authentication** | Bearer JWT Token verification with multi-tenant user isolation |
| **Deployment** | Docker multi-stage builds, Nginx reverse proxy, `docker-compose.yml`, Google Cloud Run |

---

## 🚀 Quickstart Guide

### Option A: 1-Click Docker Compose (Production Setup)

Run the complete multi-container stack (Backend + Frontend + Nginx) with a single command:

```bash
# Clone the repository
git clone https://github.com/agentshield/agentshield.git
cd AgentShield

# Launch all services
docker compose up -d --build
```
- **Web Application:** `http://localhost:5173`
- **Backend API Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

---

### Option B: Local Development Setup

#### 1. Backend Setup (FastAPI)
```bash
# From project root:
cd backend

# Create and activate Python virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend with auto-reload and automated DB migration
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup (React + Vite)
```bash
# Open a new terminal from project root:
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser at `http://127.0.0.1:5173`.

---

## ⚡ 1-Click Demo Reset Mechanism

Designed for high-stakes live presentations at **Startup Buildathon India 2026**:

- **From the UI:** Click the **"Demo Mode"** button in the top navigation bar.
- **From Terminal / cURL:**
  ```bash
  curl -X POST http://127.0.0.1:8000/api/demo/reset
  ```
**What happens in 1 second:**
1. Database is cleanly initialized with default users, scenarios, and mock tools.
2. The flagship **"Autonomous Financial Analyst"** agent is seeded.
3. Baseline red-team benchmark test is executed, discovering vulnerabilities.
4. Gemini advisory root-cause and policy recommendation are generated.
5. Hardened policy is approved and applied to the `PermissionEngine`.
6. Automated differential retest executes, proving findings are **FIXED** with score drops.
7. Runtime monitoring telemetry, real-time alerts, and an approved OWASP compliance report are prepared.

---

## 🧪 Automated Testing & Verification

AgentShield maintains a **100% automated test pass rate** with 31 comprehensive backend tests and zero frontend build errors:

```bash
# Run all backend regression and E2E integration tests:
$env:PYTHONPATH="."
backend\venv\Scripts\python -m pytest backend/tests -v

# Output: 31 passed in ~8s
```

```bash
# Verify frontend production bundle:
cd frontend
npm run build

# Output: built in ~1s with 0 errors
```

### Test Coverage Highlights:
- **`test_phase1.py`:** Core health, authentication, dashboard telemetry endpoints.
- **`test_phase2.py`:** Agent CRUD, granular `PermissionEngine` rule checks, mock tools (`read_file`, `execute_command`, `wire_transfer`).
- **`test_phase3.py`:** 12 attack scenarios execution, deterministic canary secret scanning, replay engine.
- **`test_phase4.py`:** Gemini advisory intelligence, offline fallback, code remediation diffs, policy hardening approval.
- **`test_phase5.py`:** Differential retest engine (`fixed`/`unresolved`/`regressed`), continuous monitoring alerts, compliance generator.
- **`test_phase6_e2e.py`:** Complete 14-step end-to-end integration flow and strict cross-tenant isolation enforcement.

---

## 🛡️ The 4 Threat Categories & 12 Curated Scenarios

Aligned with the **OWASP Top 10 for Large Language Models** and **MITRE ATLAS**:

1. **Prompt Injection (LLM01 / LLM07):**
   - Direct instruction override (`inj_override_01`)
   - Untrusted document context injection (`inj_doc_leak_02`)
   - Adversarial roleplay jailbreak (`inj_jailbreak_03`)
2. **Unauthorized Tool Usage (LLM08):**
   - Restricted terminal command execution (`tool_restricted_01`)
   - Function permission bypass via encoding (`tool_bypass_02`)
   - Destructive database schema drop (`tool_drop_db_03`)
3. **Sensitive Data Exposure (LLM02):**
   - Production API key canary probing (`data_canary_01`)
   - Database connection string exfiltration (`data_conn_str_02`)
   - Customer PII canary exfiltration (`data_pii_leak_03`)
4. **Excessive Agency (LLM06):**
   - High-impact unauthorized wire transfer (`agency_wire_01`)
   - Autonomous mass email broadcast (`agency_email_02`)
   - Autonomous IAM privilege escalation (`agency_iam_03`)

---

## ⚖️ Architectural Invariants & Safety Principles

1. **Zero-Tolerance Deterministic Enforcement:** All tool execution blocking, security boundary checks, and 0–100 risk scoring are executed by deterministic code.
2. **Advisory AI Only:** Google Gemini 2.5 Flash analyzes evidence and suggests remediations. It has **zero authority** to execute tools or mutate agent policies autonomously.
3. **Human-in-the-Loop Governance:** Policy recommendations require explicit, authenticated, human SecOps signoff prior to activation.
4. **Offline Resilience:** If Gemini API keys are absent or network requests time out, the platform seamlessly uses deterministic offline intelligence with 100% feature availability.
5. **No Synthetic Fabrication:** All dashboard metrics, alert counts, and compliance ratings are calculated dynamically from real database records.

---

## 📑 Compliance & Regulatory Disclaimers

AgentShield generates **empirical compliance assessments** based on automated scenario executions, runtime telemetry, and deterministic policy evaluations.
- **Not Legal Certification:** AgentShield reports do not constitute formal legal certifications or accredited third-party statutory endorsements.
- **Empirical Boundary Transparency:** All reports clearly demarcate empirically tested security controls (backed by verifiable execution traces) from governance/procedural controls outside the scope of technical simulation.

---

## 🗺️ Roadmap & Milestone Execution

- [x] **Phase 1: Foundation & Modular Architecture** (FastAPI + React/TS + SQLite + Tailwind)
- [x] **Phase 2: Agent Management & Sandboxed Mock Environment** (CRUD + Granular `PermissionEngine`)
- [x] **Phase 3: Attack Simulation Engine & Deterministic Evaluators** (12 Scenarios + Canary Tokens + Replay)
- [x] **Phase 4: Gemini-Powered Vulnerability Intelligence** (Root Cause + Code Diffs + Policy Hardening)
- [x] **Phase 5: Continuous Monitoring, Differential Retesting & Compliance** (Alerts + Retests + OWASP Reports)
- [x] **Phase 6: Final Integration, Production Packaging & Buildathon Readiness** (Docker + E2E Tests + Demo Mode + Pitch Assets)

---

## 👥 Contributors & Contact

- **Startup:** AgentShield
- **Event:** Startup Buildathon India 2026
- **Contact:** contact@agentshield.ai
- **Repository:** https://github.com/agentshield/agentshield

*Let AI Agents Act. Make Every Action Safe.*
