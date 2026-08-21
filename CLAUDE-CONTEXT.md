# FITback — context briefing

Hand this file to Claude as product + research context. Not legal advice. Dated 14–21 Aug 2026.

## What this product is

**FITback** is an app for **fitness / pilates instructors** (Israel, Hebrew audience). It is **not** a consumer gym-member app.

Core loop: **plan a class → teach it → collect client feedback → improve the next plan.**

It sits **on top of Arbox** (Israeli studio OS): scheduling, clients, enrollments live in Arbox; FITback owns lesson plans, exercises, feedback, and AI from ratings.

Repo: `/Users/oris/Personal/FITback`  
Stack: React 18 + TypeScript, Vite, React Router, Lucide. Port **5199**.  
Run: `npm run dev` (starts Vite + a read-only Arbox proxy).  
Brand: FITback. Older names in code/docs: FlowPilates, Movana.

Local Arbox proxy is **read-only** (`scripts/arbox-api.mjs`): locations, users, staff, schedule. It **blocks** `/message` and `/sms`. `sendPostClassFeedback()` currently **throws** — automatic SMS is off.

There is **no Arbox API key** in the repo, `.env`, or shell. Studios paste their own key at login; it then lives in browser `localStorage` under `movana_arbox_v1`.

---

## Product features (the app itself)

Do not list auth (Google/Apple/email) as product features.

### Current (wired in the app)

- Home dashboard (today’s classes and ratings)
- Schedule (day / week)
- Add classes by hand
- Attach a lesson plan to a class
- Connect Arbox for live schedule and clients
- Client list
- Share a class feedback link
- Client star ratings and improvement notes
- Ratings overview
- Per-lesson analytics
- Lesson library (reusable plans — distinct from the calendar)
- Lesson detail
- Build a lesson from scratch
- Build a lesson from a template
- Build a lesson with AI (from ratings / notes)
- Lesson builder (sections and exercises)
- Exercise library
- Add a custom exercise (video)
- Lesson preview / publish
- Instructor profile

### Pitch list (owner’s 7 bullets)

1. Plan future sessions and document previous ones
2. Manage individual exercises and add them to planned sessions
3. Get feedback immediately after sessions
4. Arbox integration / lesson scheduling
5. Management visibility to all content in your studio
6. AI summary of customer feedback + recommendations
7. Instructors can add videos/images on exercises/sessions

**Missing from that pitch (core in the app):** reusable lesson library; start from a template; AI *builds* the next lesson (not only summarizes).

**Overstated vs today:**

- Immediate post-class feedback = shareable form, **not** auto-send (SMS off).
- Management visibility = studio manager sees Arbox schedule, **not** a full CMS of every instructor’s library.
- Document previous sessions = calendar history + attached plan, **not** a class journal / attendance notes.

**Not core / leftover in repo, not routed:** discovery feed, coins, coin shop, earnings.

---

## Three ideas to add (stay dedicated, improve UX)

Do **not** add a marketplace, coins, or social feed.

1. **Teach this class** — From today’s schedule, open the attached plan as a floor view: exercise list, videos, next/done. Home/Schedule currently dump into the calendar, not into the class about to be taught.
2. **End-of-class feedback on the phone** — When the slot ends, the class screen becomes a big QR / link. Feedback exists but is buried as “preview form.” Collect ratings before people leave. No SMS required.
3. **Repeat last week + last-time notes** — Copy this slot (and its plan) to next week. When opening that plan, show last class’s stars and improvement notes at the top. Closes plan → teach → rate → plan again.

---

## Arbox API

### How the key works

- Studio copies key from Arbox **Settings → Club Information / Integrations**.
- Header: `api-key`
- Base: `https://arboxserver.arboxapp.com/api/public/v3`
- Docs: https://arboxserver.arboxapp.com/docs/api
- If the studio hits https://manage.arboxapp.com/external/upgrade the key is **plan-locked**.

**Do you need a paid Arbox account?** Very likely **yes**. Free Arbox ($0, 5 weekly sessions) does not list API/Zapier. Make.com says a **paid Arbox account** is required. Exact paid tier is not published — ask support@arboxapp.com / WhatsApp +972-53-965-3886 which package includes the public API.

There is **no public developer/sandbox key**. Options: own a paid studio, use a studio’s key with permission, or apply as a [tech partner](https://www.arboxapp.com/partnership-tech).

### Can we build a commercial app on this key without paying Arbox?

**Not as a free ride.** Terms (https://www.arboxapp.com/terms-of-use) bind the **studio** (Customer), not FITback.

- Integration **only** through the official API, “authorized in writing.”
- License is personal and **non-transferable**.
- Studio is liable for any third-party integrator (us).
- No scraping, bots against `manage.arboxapp.com`, or automating the member-app UI (that gets keys revoked).
- You may sell **FITback** (plans, feedback, AI) while the studio still pays Arbox — Zapier/Make/Texter model.
- You may **not** resell/clone Arbox or treat their API as a free competing studio OS.
- Apply as an Arbox **Technology Partner** before charging many studios: https://www.arboxapp.com/arboxpartner

Ask Arbox: may we use club API keys, charge our own subscription, is there a fee/revenue share?

### What the club API key can do (REST v3)

Auth: `api-key` header. Max **31 days** per schedule/report request.

**Schedule:** list classes (optional `registration_details` = who booked), class types, change instructor on a class, waitlist, trial book/cancel/list, staff via `GET /users/allStaffMembers` (used by FITback; not in n8n node).

**Members:** list/get/search, create/update/delete, waiver filter, memberships attach/list, notes, membership types, locations, custom fields.

**Leads:** list/create, update status, logs, mark lost, reasons, sources, statuses, converted/lost, notes.

**Tasks:** list/create, types.

**Forms:** list digital forms, create fill-link.

**Reports (20):** attendance, no-shows, first-time, birthdays, debt, transactions, purchases, frozen memberships, cancellations, medical certs, lead funnel, gender attendance, box categories, etc.

**Zapier/Make extras (same key, not clearly in public v3 REST):** send **push** to member-app user IDs (not generic SMS), create purchase, create group session, cancel a regular booking. Plus webhooks (new lead, check-in, purchase, form signed, …).

**Not with this key:** SMS/WhatsApp through Arbox (needs SMS credits and/or separate `vendorsToken`); creating/editing the full timetable (PATCH only swaps instructor); booking a **regular** (non-trial) class; charging cards; scraping the dashboard.

FITback today uses only: `GET /locations`, `/users`, `/users/allStaffMembers`, `/schedule`.

---

## Marketing (TikTok)

Full Ads Manager is **too expensive** for launch.

**2026 auction (global):** campaign floor ~$50/day, ad group ~$20/day, CPM ~$4–13, CPC ~$0.30–1.50. Honest test $80–150/day ($2.5–4.5k/month). Instructor CPA likely **$8–40**, not US consumer-app $1–2 CPI. January fitness CPMs +30–50%.

**Do this instead:**

- $0: organic TikTok/Reels; message 20–30 instructors; 2–3 instructors post a story for free access.
- $20–150: in-app **Promote** / Instagram boost ($5–10/day), not Ads Manager.
- WhatsApp / Facebook groups for מדריכות; Arbox studio contacts are the real channel.

Simplest launch budget: **$0 media + $0–100 to boost one winning video.**

---

## Local run

```bash
cd /Users/oris/Personal/FITback
npm run dev
```

Browser: http://localhost:5199  
Phone (same Wi‑Fi): Network URL printed in the terminal (e.g. http://\<LAN-IP\>:5199)

`.env` is optional (copy `.env.example`). Google/Apple OAuth and SMS stay off without it.

---

## Code map (for implementation)

| Area | Where |
|------|--------|
| Routes | `src/App.tsx` |
| Nav | `src/components/BottomNav.tsx` |
| Arbox proxy (read-only) | `scripts/arbox-api.mjs` |
| Arbox client | `src/services/arboxApi.ts`, `arboxLive.ts` |
| Feedback | `src/pages/FeedbackPage.tsx`, `src/services/classFeedback.ts` |
| Schedule | `src/pages/SchedulePage.tsx` |
| Analytics / “AI” | `src/pages/AnalyticsHubPage.tsx`, `LessonAnalyticsPage.tsx`, `src/data/lessonAnalytics.ts` |
| AI lesson from ratings | `src/pages/AiLessonPage.tsx`, `src/data/aiLessonSuggest.ts` |
| Builder / exercises | `LessonBuilderPage.tsx`, `ExerciseLibraryPage.tsx`, `AddExercisePage.tsx` |

If implementing the three UX ideas: start from Schedule + Dashboard (teach-now), class sheet feedback link (QR), and `attachLessonPlan` / week copy (repeat last week).
