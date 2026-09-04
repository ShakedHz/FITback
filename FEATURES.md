# FITback

Last checked against the running app: **September 2026**.

Use this file as the feature list. Status means:

- **Done** — already in the app (do not open a Jira task)
- **To add** — copy into Jira as a new task

---

## What the product is

FITback is an app for **fitness instructors, studios, and gyms**.

It is meant to cover three jobs:

1. **Plan** a class (sections, exercises, timing, notes)
2. **Schedule** that class (calendar + optional Arbox studio schedule)
3. **Learn** from clients (ratings and notes after class, then improve the next plan)

---

## Who uses it

| Role | What they can do today |
|------|------------------------|
| Instructor | Build lessons, manage exercises, attach plans to classes, collect feedback, see ratings |
| Studio manager | See **all Arbox schedule slots** for the studio; invite instructors by email link |
| Client | Open a feedback link, rate 1–5 stars, optionally leave an improvement note |

Clients do **not** have a full app. They only get the public feedback page.

---

## Done

Copy into Jira as completed.

- Account & SSO
- Settings
- Instructor lessons
- Instructor templates
- Duplicate lessons & templates
- Lesson builder
- Exercise library
- Exercise & lesson video
- Class schedule
- Attach lesson plan
- Client roster
- Arbox schedule sync (read) — initial check only
- Post-class feedback — first version
- Ratings dashboard — first version, no real AI
- Studio team invites

---

## To add

Copy into Jira as new tasks.

### Improve existing

- **Client feedback page** — the page clients use after class exists, but it needs a clearer, more complete experience (copy, flow, and what we ask them).
- **Ratings page** — the instructor ratings screen is in the app without real AI. Improve the content, and replace the current summary with actual AI insights and recommendations.
- **Arbox integration (full test)** — only a short initial check was done. Run a full test of schedule sync, staff, clients, attaching plans, and edge cases before treating Arbox as ready.

### New

- User guide
- **Built-in templates per class type**
- **Ready-made lessons**
- Instant post-class feedback — when a class ends, clients get the feedback request automatically (no need for the instructor to remember and send it)
- Manager view of all studio content
- AI-generated session from instructor input
- AI agent bot

Out of scope unless you bring them back: marketplace, coins, built-in exercise catalog.

---

## Suggested order (from the original brief)

If the goal is still “plan → schedule → improve from feedback”:

1. **User guide** — so instructors can use what already works
2. **Client feedback page** — clients need a better form before the loop works
3. **Ratings page (content + real AI)** — replace the demo summary
4. **Arbox integration (full test)** — confirm the studio schedule path end to end
5. **Instant post-class feedback** — send the survey to clients automatically when class ends
6. **AI session from instructor input** — the optional generator in the brief
7. **Manager view of all studio content** — the management-visibility item
8. **AI agent bot** — only after ratings AI is real, or it will be another empty “AI” screen
9. **Built-in templates / ready-made lessons** — only if you still want starters; the current product is “instructor builds everything”

---

## App map (what is already built)

| Screen | Purpose |
|--------|---------|
| Login / Register | Email, Google, Apple, optional Arbox key |
| Home | Today’s classes, shortcuts |
| Schedule | Calendar, add class, roster, attach plan |
| Library | Tabs: **Lessons** and **Templates** |
| Builder | Edit a lesson or template |
| Exercise library | Pick / create exercises for a section |
| Ratings | Feedback analytics |
| Profile / Settings / Studio | Account, look & feel, team invites |

---

## How to use this file

- If a feature is **Done**, do not re-specify it as new work.
- If a feature is **To add**, it is a Jira task.
- When a feature ships, move it from To add into Done and update the date at the top.
