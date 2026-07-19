# System Architecture & Technical Specification: AI-Proctored Adaptive Test Platform

This document provides a complete technical map of the MERN application codebase. It outlines the modular components, database models, mathematical algorithms, client-side hooks, custom layouts, and all backend API routing details, serving as a clean prompt for subsequent development or external AI enhancements.

---

## 1. Technological Stack

*   **Backend Server**: Node.js & Express.js.
*   **Database ORM**: MongoDB using Mongoose.
    *   *Connection Fallback Hook*: Standard connection uses a 2000ms timeout limit. If standard local ports are blocked/uninstalled, `db.js` spawns a transient `MongoMemoryServer` (in-memory DB) process.
    *   *Automatic Seeding*: Automatically runs on boot if user accounts count is 0, inserting default credentials and 10 calibrated IRT questions.
*   **Frontend Client**: Vite + React, Lucide Icons.
*   **Visual Style**: Warm Neo-Brutalism (Light-mode).
    *   *Canvas*: Soft warm sand tint (`#fcfbfa`) overlayed with an aesthetic dot-grid pattern.
    *   *Outlines*: Solid thick borders (`border: 3px solid #0d0d0d`).
    *   *Shadows*: Sharp, solid flat offsets (`box-shadow: 6px 6px 0px #0d0d0d`).
    *   *Interactive Transitions*: Buttons and tab lists depress physically on active clicks (`transform: translate(2px, 2px)`).
    *   *Performance*: No heavy CSS blur recalculations on hover to prevent browser rendering jitter.

---

## 2. Core Functional Modules

### A. Item Response Theory (IRT) Adaptive Engine
*   **Location**: `server/services/irtEngine.js`
*   **Model Math**: Employs a Three-Parameter Logistic (3PL) model. The probability of answering a question correctly is calculated as:
    $$P(\theta) = c + \frac{1 - c}{1 + e^{-a(\theta - b)}}$$
    Where:
    *   $\theta$: Candidate's current estimated ability.
    *   $b$: Question difficulty.
    *   $a$: Question discrimination.
    *   $c$: Guessing parameter (default 0.25 for 4-option questions).
*   **Estimation Method**: Expected A Posteriori (EAP) algorithm. The posterior distribution of ability is computed by integration over quadrature points spanning $[-4.0, +4.0]$.
*   **Item Selection**: Selects the next optimal question by maximizing the Item Information Function (IIF):
    $$I(\theta) = a^2 \frac{(P(\theta) - c)^2}{(1 - c)^2} \frac{1 - P(\theta)}{P(\theta)}$$

### B. Client-Side Proctoring & Security
*   **Location**: `client/src/hooks/useProctoring.js`
*   **Camera Tracking**: Loads `@vladmandic/face-api` (TinyFaceDetector) directly via CDN script inside the HTML shell, utilizing WebGL-accelerated hardware fallbacks (or CPU) to prevent WASM load dependency errors.
    *   *Options*: Configured at `inputSize: 224` and `scoreThreshold: 0.35` for reliable facial tracking.
    *   *Violations Checked*:
        *   `face-not-visible`: Triggers if 0 faces are detected for 2 consecutive seconds.
        *   `multiple-faces`: Triggers if >1 faces are detected for 2 consecutive seconds.
*   **Focus Monitoring**: Page Visibility API (`visibilitychange` / `document.hidden`) flags a `tab-switch` event if the candidate leaves the browser window. Window blur listeners are omitted to prevent system notifications or extension popups from logging false positives.
*   **Fullscreen Restraints**: The test interface (`TestTaking.jsx`) forces browser fullscreen mode. Exiting fullscreen displays a blocking lock overlay and logs a violation.
*   **Custom Thresholds**: Creators configure `maxViolationsAllowed` on a per-test-series basis. Exceeding this limit automatically disqualifies the candidate.

---

## 3. Database Schema Overview (`server/models/`)

### 1. `User.js`
*   `name` (String, required)
*   `email` (String, unique, index)
*   `password` (String, hashed with bcrypt)
*   `role` (String, enum: `['test-taker', 'content-creator', 'admin']`)

### 2. `Question.js`
*   `text` (String, required)
*   `options` ([String], required)
*   `correctOptionIndex` (Number, required)
*   `difficulty` (Number, default 0.0) -> $b$
*   `discrimination` (Number, default 1.0) -> $a$
*   `guessing` (Number, default 0.25) -> $c$
*   `category` (String, required, lowercased)
*   `creatorId` (ObjectId referencing User)

### 3. `TestSeries.js`
*   `title` (String, required)
*   `description` (String)
*   `price` (Number, default 0.0)
*   `isPremium` (Boolean, default false)
*   `maxViolationsAllowed` (Number, default 3)
*   `questions` ([ObjectId referencing Question])
*   `creatorId` (ObjectId referencing User)

### 4. `TestSession.js`
*   `user` (ObjectId referencing User, index)
*   `testSeries` (ObjectId referencing TestSeries, index)
*   `status` (String, enum: `['active', 'completed', 'disqualified']`)
*   `responses` Array of:
    *   `questionId` (ObjectId referencing Question)
    *   `selectedOptionIndex` (Number)
    *   `isCorrect` (Boolean)
    *   `timeSpent` (Number in seconds)
    *   `thetaAfter` (Number)
*   `currentTheta` (Number, default 0.0)
*   `proctoringFlags` Array of:
    *   `eventType` (String, enum: `['tab-switch', 'face-not-visible', 'multiple-faces', 'device-detected']`)
    *   `timestamp` (Date)
    *   `severity` (String)
    *   `resolved` (Boolean)
*   `reviewStatus` (String, enum: `['clean', 'pending', 'confirmed-cheat', 'dismissed']`)
*   `totalScore` (Number, default 0)
*   `percentile` (Number, default 0)
*   `startTime` (Date)
*   `endTime` (Date)

---

## 4. REST API Endpoint Mapping (Exactly 54 Unique Routes + 3 JWT Helpers)

Authentication headers require a JWT Bearer token: `Authorization: Bearer <token>`.

### Core JWT Authentication Helpers (`server/routes/auth.js`)
*   `POST /api/auth/register` - Create candidate or creator user accounts.
*   `POST /api/auth/login` - Authenticate credentials and return JWT token.
*   `GET /api/auth/profile` - Fetch authenticated user details.

### Platform API Routes (Exactly 54 Unique Paths)

#### Module 1: Adaptive Delivery Engine (`server/routes/adaptive.js`)
1.  `GET /api/adaptive/next-question` - Start/resume session and compute next optimal question.
2.  `POST /api/adaptive/submit-response` - Estimate ability ($\theta$) and Standard Error (SE) via EAP.
3.  `GET /api/adaptive/status` - Returns current ability ($\theta$), SE, and answered count.
4.  `POST /api/adaptive/pause` - Set session status to paused.
5.  `POST /api/adaptive/resume` - Resume paused session and return next question.
6.  `POST /api/adaptive/skip` - Skip a question (if allowed by test config).
7.  `POST /api/adaptive/flag` - Bookmark/flag a question for review.

#### Module 2: Test-Session Management (`server/routes/sessions.js`)
8.  `POST /api/sessions/start` - Create and return an active `TestSession` document.
9.  `POST /api/sessions/answer` - Submit an answer for a question in standard mode.
10. `POST /api/sessions/resume` - Resume interrupted sessions or verify disqualifications.
11. `POST /api/sessions/end` - Lock session inputs and compile final IRT scores (supports disqualify action).
12. `GET /api/sessions/my-sessions` - Fetch previous test completions for candidate dashboard logs.
13. `GET /api/sessions/active` - Admin/Proctor: List all active, live-monitored sessions.

#### Module 3: AI Proctoring Event Logging (`server/routes/proctoring.js`)
14. `POST /api/proctoring/log-event` - Save violation. Triggers session disqualification if violations count $\ge$ `maxViolationsAllowed`.
15. `GET /api/proctoring/session-logs/:sessionId` - Get all logged violations for a specific session.
16. `PUT /api/proctoring/config` - Admin: Configure proctoring violation sensitivity or enabled features.
17. `POST /api/proctoring/verify-webcam` - Log candidate hardware connection audits.
18. `POST /api/proctoring/auto-flag` - Trigger server-side heuristic to auto-flag a session based on flags.

#### Module 4: Anti-Cheat Flag Review Workflow (`server/routes/reviews.js`)
19. `GET /api/reviews/flagged-sessions` - Admin: Get all sessions flagged for cheating/review.
20. `GET /api/reviews/session-timeline/:sessionId` - Admin: Get detailed temporal timeline of flags for a session.
21. `PUT /api/reviews/status/:sessionId` - Admin: Update review status of a session (clean, pending, confirmed-cheat, dismissed).
22. `POST /api/reviews/comment/:sessionId` - Admin: Add notes/comments to the review history.
23. `PUT /api/reviews/disqualify/:sessionId` - Admin: Disqualify a candidate and void their test score.

#### Module 5: Content Authoring Tools (`server/routes/questions.js`)
24. `POST /api/questions/create` - Creator/Admin: Create a new question with IRT parameters.
25. `PUT /api/questions/update/:id` - Creator/Admin: Update a question.
26. `DELETE /api/questions/delete/:id` - Creator/Admin: Delete or archive a question.
27. `GET /api/questions/list` - Creator/Admin: List/search questions.
28. `POST /api/questions/bulk-import` - Creator/Admin: Bulk upload questions via JSON.
29. `POST /api/questions/test-series/create` - Creator/Admin: Create/edit a Test Series package including pricing.

#### Module 6: Detailed Analytics & Percentile Reports (`server/routes/analytics.js`)
30. `GET /api/analytics/report/:sessionId` - Get scorecard metrics.
31. `GET /api/analytics/skills/:sessionId` - Get category-wise/skill-wise performance report.
32. `GET /api/analytics/history` - Get historical trend of user's ability estimates across tests.
33. `GET /api/analytics/distribution/:testSeriesId` - Get test score distribution, mean, median, SD.
34. `GET /api/analytics/percentile/:sessionId` - Get calculated percentile ranking for the session.
35. `GET /api/analytics/export-pdf/:sessionId` - Generate download token for PDF scorecard.

#### Module 7: Payment for Premium Test Series (`server/routes/payments.js`)
36. `GET /api/payments/products` - List available test series and pricing.
37. `POST /api/payments/checkout-session` - Create Stripe checkout session for a premium test series.
38. `POST /api/payments/webhook` - Stripe Webhook handler to listen for successful checkout events.
39. `GET /api/payments/purchases` - Get user's purchased test series history.
40. `GET /api/payments/verify/:testSeriesId` - Check if user owns/has access to a specific test series.

#### Module 8: Notifications (`server/routes/notifications.js`)
41. `GET /api/notifications/my` - Get in-app notifications for logged-in user.
42. `PUT /api/notifications/read/:id` - Mark a notification as read.
43. `POST /api/notifications/send-alert` - System/Admin: Trigger/send an alert notification.
44. `PUT /api/notifications/settings` - Update notification preferences.

#### Module 9: Admin (`server/routes/admin.js`)
45. `GET /api/admin/dashboard-stats` - Get overall system stats: active users, total sales, flagged tests count.
46. `GET /api/admin/users` - List all registered users with filters.
47. `PUT /api/admin/users/:userId/role` - Update a user's role.
48. `GET /api/admin/audit-logs` - View system audit logs.
49. `GET /api/admin/export-data` - Export platform data to JSON/CSV.

#### Module 10: Peer-Comparison Leaderboard Module (`server/routes/leaderboards.js`)
50. `GET /api/leaderboards/global` - Get global standings sorted by final ability $\theta$.
51. `GET /api/leaderboards/test-series/:testSeriesId` - Get leaderboard for a specific test series.
52. `GET /api/leaderboards/user-rank/:testSeriesId` - Get specific user's rank, score, and surrounding peer list.
53. `GET /api/leaderboards/trends` - Get top performers of the week/month.
54. `GET /api/leaderboards/export/:testSeriesId` - Export leaderboard data.

---

## 5. Local Execution Details

### Default User Credentials
*   **Admin Access**: `admin@apex.com` (password: `password`)
*   **Content Creator**: `creator@apex.com` (password: `password`)
*   **Test-Taker / Candidate**: `candidate@apex.com` (password: `password`)

### Run Scripts
*   **Backend Server** (`/server`):
    ```bash
    npm install
    npm start
    ```
*   **Frontend Client** (`/client`):
    ```bash
    npm install
    npm run dev
    ```
