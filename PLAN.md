**Project Plan — QR‑Based Scavenger Hunt (AWS Serverless)**

Short, actionable plan to turn the existing design notes into an execution-ready project plan with milestones, tasks, estimates, and acceptance criteria.

**Overview**
- **Goal:** Deliver a QR‑code driven scavenger hunt web app using S3, CloudFront, API Gateway, Lambda, and DynamoDB.
- **Primary deliverable:** A hosted static frontend plus a serverless backend that validates answers and advances players through clues.

**Objectives**
- **MVP:** 5 seeded clues, QR links, basic mobile-friendly UI, Lambda answer validation, DynamoDB persistence.
- **Quality:** Mobile-first UI, CORS-enabled API, automated seed script, clear deployment steps.

**Milestones**
- **Milestone 1 — Prepare data model & seed (2 days):**
  - **Tasks:** Define DynamoDB schema; create JSON seed with 5 clues; write small seed script (Node/Python).
  - **Owner:** TBD
  - **Acceptance Criteria:** `Clues` table schema documented; seed script inserts 5 items successfully.

- **Milestone 2 — Backend API (2 days):**
  - **Tasks:** Implement Lambda (Node.js 20) to accept `{ clueId, answer }`, validate against DynamoDB, return `{ correct, nextClueId }`; configure API Gateway POST `/answer`; set IAM role and env var `TABLE_NAME`.
  - **Owner:** TBD
  - **Acceptance Criteria:** API returns correct JSON and handles errors; CORS headers present.

- **Milestone 3 — Frontend (2 days):**
  - **Tasks:** Build small mobile-first static site that reads `id` from query string, shows question/choices, POSTs answers to `/answer`, handles next clue navigation; include simple styling.
  - **Owner:** TBD
  - **Acceptance Criteria:** Frontend shows clues, submits answers, and navigates to next clue on success.

- **Milestone 4 — Hosting & Delivery (1 day):**
  - **Tasks:** Host static site on S3; configure CloudFront; point QR URLs to `https://<domain>/clue?id=N`.
  - **Owner:** TBD
  - **Acceptance Criteria:** Static site is served via CloudFront and QR URLs resolve reliably.

- **Milestone 5 — QA & Deploy (1 day):**
  - **Tasks:** End-to-end tests, CloudFront invalidation, verify QR codes on multiple devices.
  - **Owner:** TBD
  - **Acceptance Criteria:** All flows verified on mobile; deployment checklist completed.

**Task Breakdown (quick view)**
- **Schema & Seed:** define fields, create `seed.json`, write `seed.js` or `seed.py`.
- **Lambda:** `index.js` (AWS SDK v3), input validation, error handling, CORS, env `TABLE_NAME`.
- **API Gateway:** POST `/answer`, integrate with Lambda, enable CORS.
- **Frontend:** `index.html`, `style.css`, `script.js` — mobile-first, small footprint.
- **Infra:** S3 bucket, CloudFront distribution, minimal IAM roles for Lambda and DynamoDB.

**Estimates & Timeline**
- **Total effort (rough):** 8 working days (can be compressed to ~4 with parallel work).
- **Suggested order:** Seed → Backend → Frontend → Hosting → QA.

**Acceptance Criteria (project-level)**
- API and frontend handle invalid inputs gracefully.
- DynamoDB contains seeded clues and nextClueId links correctly.
- QR links load the correct clue and advance players on correct answers.

**Risks & Mitigations**
- **Risk:** CORS or IAM misconfiguration blocks requests.  **Mitigation:** Test locally with mocked endpoints; add CORS headers in Lambda; use least-privilege IAM and test permissions.
- **Risk:** QR links cached by CloudFront after changes.  **Mitigation:** Invalidate CloudFront on deploy; use cache-control headers during development.

**Deliverables**
- `seed` script and `seed.json`
- Lambda function source and deployment notes
- Static frontend files (`index.html`, `style.css`, `script.js`)
- Deployment checklist (S3/CloudFront/Lambda/DynamoDB steps)

**Next Steps (short)**
- Finalize owners and set a start date.
- I can generate the seed script, Lambda template, and minimal frontend now — which would you like first?

**Appendix — References**
- Original README-style notes were the source for this plan; the full README and AI prompts can be extracted into `README.md` if you want the separate developer-facing document.
