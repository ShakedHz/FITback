# FITback — Full Product Description for AI Analysis

Copy everything below and give it to an analysis agent.

---

## Executive Summary

**FITback** is a Hebrew-first, mobile-first **Progressive Web App (PWA)** for **fitness instructors and trainers**. It lets them create structured lesson plans ("מערכים"), sell and discover peer content via an internal coin economy, manage a teaching schedule (with mock Arbox studio integration), analyze lesson performance, and collect experiential client feedback.

**Current state:** Frontend prototype with **mock data only** — no backend, no real auth, no real payments, no real video hosting. All state lives in React Context and resets on refresh.

**Codebase:** `/Users/oris/Personal/FITback`

**Dev:** React 18 + TypeScript + Vite, port `5199`, RTL Hebrew UI

---

## 1. Brand & Positioning

| Field | Value |
|-------|-------|
| **Product name** | FITback |
| **Virtual currency** | FITbackCoins (מטבעות) |
| **Core unit** | מערך / מערכים — a structured lesson plan (workout blueprint) |
| **Tagline (EN)** | "Share workouts. Learn together. Grow with feedback." |
| **Tagline (HE)** | "קהילה למדריכים ומאמנים — שיתוף מערכים, תיעוד שיעורים ופידבק" |
| **Target audience** | Fitness instructors/trainers (Hebrew UI, female-oriented copy) |
| **Scope** | Multi-discipline: pilates, yoga, HIIT, barre, cycle, stretch (not pilates-only despite repo name) |

### Product Philosophy

1. **"Black box" lesson plans** — Buyers see metadata + a 3-exercise preview. Full exercise structure unlocks only after purchase.
2. **Dual-sided marketplace** — Instructors create/sell; peers buy to learn and remix.
3. **Experiential client feedback** — Students rate the class experience; instructors see aggregated analytics, not raw exercise-level critique.
4. **Community discovery** — Feed of purchasable lesson plans from other instructors.
5. **Instructor operations** — Schedule management, analytics, wallet, profile.

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|-------|------------|
| UI | React 18 + TypeScript |
| Build | Vite 5 (port 5199, `host: 0.0.0.0` for phone testing) |
| Routing | React Router DOM v6 |
| Icons | Lucide React |
| Font | Heebo (Google Fonts) |
| State | Single React Context (`AppContext`) — no Redux, no backend |
| PWA | `manifest.json`, Apple web-app meta tags, add-to-home-screen support |

### Architecture

```
BrowserRouter
  └── AppProvider (global in-memory state)
        └── AppLayout
              ├── Scrollable route content
              └── BottomNav (conditional)
```

- All mock data in `src/data/`
- Path alias: `@/` → `src/`
- Mobile shell: max-width 390px on desktop (phone frame); full viewport on real mobile/PWA
- Overlays (schedule sheets, preview sheets) use React portals into `#app-shell`
- iOS safe-area handling via `visualViewport` and CSS `env(safe-area-inset-*)`

### Planned but NOT implemented
- Backend (Supabase/Firebase mentioned in README)
- Real authentication
- Real video CDN/streaming
- Stripe / real payments

---

## 3. Navigation (Critical: בית vs דאשבורד)

Bottom navigation layout:

```
[ בית ]  [ דאשבורד ]  [ פיד ]     ( + חדש )     [ יומן ]  [ ספרייה ]  [ פרופיל ]
```

| Tab Label | Route | Purpose |
|-----------|-------|---------|
| **בית** (Home) | `/dashboard` | Daily home hub — greeting, wallet, today's schedule, shortcuts |
| **דאשבורד** (Dashboard) | `/analytics` | Performance analytics — KPIs, charts, AI insights |
| **פיד** (Feed) | `/feed` | Discovery marketplace |
| **חדש** (New) | `/create` | Create new lesson (center FAB) |
| **יומן** (Schedule) | `/schedule` | Calendar / schedule |
| **ספרייה** (Library) | `/library` | Personal lesson collection |
| **פרופיל** (Profile) | `/profile` | Account & settings |

**Important:** `/dashboard` is **בית** (home), NOT analytics. `/analytics` is **דאשבורד** (analytics dashboard). README may conflate these; the live app does not.

Bottom nav is **hidden** on: `/` (splash), `/feedback/*` (client feedback flow).

---

## 4. Complete Route Map

| Route | Page | Description |
|-------|------|-------------|
| `/` | SplashPage | Onboarding/login; student entry to feedback |
| `/dashboard` | DashboardPage | Home hub (בית) |
| `/feed` | FeedPage | Inspiration/discovery feed |
| `/schedule` | SchedulePage | Weekly/day calendar + Arbox sync |
| `/analytics` | AnalyticsHubPage | Analytics dashboard (דאשבורד) |
| `/analytics/:id` | LessonAnalyticsPage | Per-lesson deep analytics |
| `/lesson/:id` | LessonDetailPage | Lesson detail, purchase, full view if owned |
| `/library` | LibraryPage | Created / purchased / saved lessons |
| `/create` | CreateLessonPage | New lesson entry menu |
| `/builder` | LessonBuilderPage | Lesson builder with templates |
| `/exercises` | ExerciseLibraryPage | Browse/search exercises |
| `/exercises/new` | AddExercisePage | Upload custom exercise video |
| `/preview` | LessonPreviewPage | Pre-publish preview |
| `/feedback/:id?` | FeedbackPage | Client post-lesson feedback (`/feedback/demo`) |
| `/earnings` | EarningsPage | Wallet, earn methods, transaction history |
| `/shop` | CoinShopPage | Buy FITbackCoins packages (mock) |
| `/profile` | ProfilePage | Instructor profile, logout |
| `*` | — | Redirect to `/` |

---

## 5. Core Features (Detailed)

### 5.1 Home — בית (`/dashboard`)
- Time-based Hebrew greeting (בוקר / צהריים / ערב)
- Hero: instructor avatar, name, specialty chips
- Dynamic subtitle: today's event count OR library lesson count
- **Wallet card:** FITbackCoins balance → links to Shop & Earnings
- **"היום ביומן":** Up to 3 today's schedule events + Arbox connection status
- CTA: "שיעור חדש" → `/create`
- **Quick actions:** יומן, דאשבורד (→ `/analytics`), ספרייה, פיד
- Stats: rating, lesson count, retention %
- **Recommended lesson:** highest `wantsMoreRate` from analytics
- **Community tip:** AI-style insight + sentiment tags

### 5.2 Feed — פיד השראה (`/feed`)
- Filters: All, Trending (likes ≥ 400), by training type
- Cards show: cover, instructor avatar, rating, training type badge, level, duration, equipment, tags, likes, comments
- **Purchase flow:** preview sheet or lesson detail → redirect to `/shop` if insufficient coins
- Owned lessons: "המערך שלך — צפייה"
- Feed excludes: Maya's own content, free lessons (`price > 0 && instructorId !== 'maya'`)
- ~20 marketplace lessons from 4 other instructors

### 5.3 Library — ספרייה (`/library`)
Tabs:
- **שיעורים שלי** — created lessons (Maya has 7)
- **נרכשו** — purchased from feed
- **שמורים** — UI stub, always empty (not implemented)

Filter by training type. Tap → `/lesson/:id`

### 5.4 Schedule — יומן (`/schedule`)
- Day view + week view, week navigation, "היום" shortcut
- **Dual event sources:**
  - **Arbox** — external studio scheduling (mock)
  - **FITback** — lessons added by user (`source: 'flowpilates'`, UI label "FITback")
- Arbox connect: paste API key (≥8 chars), mock sync ~800ms
- **Add lesson FAB (2-step):** (1) pick training type grid → (2) filtered lessons + time slots
- Event detail sheet: location, instructor, enrollment, source
- Only FITback events are deletable
- Time grid: 8:00–20:00, 15-min snap (drag/move API exists but UI is add-only)

### 5.5 Lesson Creation Flow
**Entry (`/create`):** New from scratch | Duplicate existing | Import template

**Builder (`/builder`):**
- Select training type (6 options) → auto-loads section template
- Title, duration, cover image upload
- Section/exercise list from template
- Link to exercise library
- Publish → flat **200 coins** price, level "בינוני", added to library

**Preview (`/preview`):**
- Pre-publish review
- States black-box principle: clients see experience, not exercise list

### 5.6 Exercise Library (`/exercises`)
- 10 default pilates exercises (Hebrew + English names, categories, AI poster images)
- Categories: חימום, ליבה, גב, מתיחות, סיום
- Search + category filter
- Custom exercises: video upload (blob URL), stored in context
- "Add to lesson" is UI-only (not wired to draft)

### 5.7 Analytics — דאשבורד (`/analytics`)
**Hub:**
- Period toggle: 7d / 30d (30d scales totals × 0.28)
- Top lesson hero, KPI grid (views, sales, completion, rating, lesson count)
- Weekly views/sales charts
- Community comparison, aggregated feedback preferences
- Per-lesson ranked list with sparklines
- "ממתינים לנתונים" — lessons without analytics yet

**Per-lesson (`/analytics/:id`):**
- Hero metric: `wantsMoreRate` (% who want more)
- KPIs: views, unique students, sales, completion, avg watch minutes, rating
- Revenue in coins (marketplace lessons)
- Weekly charts, feedback breakdown (5 preference types)
- Section engagement (completion + replay rates)
- Sentiment tags, benchmark comparisons, AI insights
- Retention + drop-off rates

Analytics exists for lessons: `l1`, `l2`, `l3`, `l4`, `l23`, `l25`, `l27`

### 5.8 FITbackCoins Economy
- **Starting balance:** 1,250 coins (Maya)
- **Earn (shown in Earnings):** lesson sale (+250), high rating (+50), retention (+30)
- **Spend:** purchase lesson plans from feed
- **Buy packages (mock ILS):** ₪9.9–₪99.9
- Transaction ledger with Hebrew descriptions

**Coin packages:**

| Package | Coins | Bonus | Price |
|---------|-------|-------|-------|
| התחלה | 100 | 0 | ₪9.9 |
| פופולרי | 300 | 50 | ₪24.9 |
| מקצועי | 600 | 150 | ₪44.9 |
| סטודיו | 1500 | 500 | ₪99.9 |

### 5.9 Profile (`/profile`)
- Avatar, rating, bio, specialty chips
- Stats: 133 lessons, 340 students, 87% retention
- Wallet → shop; history → earnings
- Logout → splash

### 5.10 Client Feedback (`/feedback/:id?`)
- Star rating (required), free text (liked / improve), preference chips
- Submit → thank you → redirect home
- Entry from splash: "לקוחות? כניסה לשיעור" → `/feedback/demo`
- Instructor sees aggregated analytics only

---

## 6. Data Models

### Exercise
```
{ id, name, nameHe, duration, category, videoUrl, posterUrl?, isCustom?, createdBy? }
```

### LessonSection
```
{ id, title, duration, exercises: Exercise[] }
```
Default: חימום (10m) → חלק עיקרי (30m) → סיום (10m)

### Lesson
```
{
  id, title, instructorId, instructorName, duration,
  level: 'מתחילות' | 'בינוני' | 'מתקדם',
  trainingType, equipment, tags[], rating, reviews, price,
  likes, comments, description, sections: LessonSection[],
  isOwned?, isCreated?, coverImage?, albumImages[]
}
```
- `albumImages`: 4-image Spotify-style collage if no custom cover
- `isOwned` / `isCreated`: library ownership flags

### Instructor (current user)
```
{ id, name, avatar, bio, specialties[], lessonsCount, studentsCount, retention, rating, coins }
```

### FeedPost
Lesson metadata + `instructorTier`, `trending?` — derived from lessons array

### ScheduleEvent
```
{
  id, title, lessonId?, start (ISO), duration,
  source: 'arbox' | 'flowpilates',
  arboxId?, location?, instructor?, enrolled?, capacity?,
  category?: EventCategory
}
```

### LessonAnalytics
```
views, sales, revenue, completionRate, wantsMoreRate, dropOffRate,
avgWatchMinutes, retention, weeklyViews[], weeklySales[],
feedbackBreakdown[], sectionEngagement[], sentimentTags[], insights[], comparisons[]
```

### FeedbackPreference
```
{ id: 'more'|'calm'|'hard'|'stretch'|'core', label, emoji }
```

### LessonDraft (in-progress creation)
```
{ title, duration, trainingType, coverImage, albumImages, exerciseIds }
```

---

## 7. Training Types, Equipment & Templates

### Training Types (6)
| ID | Hebrew | Color |
|----|--------|-------|
| pilates | פילאטיס | Blue |
| yoga | יוגה | Green |
| hiit | HIIT | Red |
| barre | ברה | Pink |
| cycle | אופניים | Amber |
| stretch | מתיחות | Teal |

Maps to schedule event categories via `trainingTypeToEventCategory()`.

### Equipment Types
| Type | Hebrew | Default for |
|------|--------|-------------|
| mat | מזרן | pilates, yoga, stretch |
| reformer | ריפורמר | inferred from "ריפורמר" tag |
| bike | אופניים | cycle |
| barre | בר | barre |
| none | ללא ציוד | hiit |

### Lesson Templates
Per training type: 3 sections with predefined exercise IDs and durations (~45–50 min total).

Example (Pilates): חימום → חלק עיקרי — ליבה → סיום  
Example (Yoga): נשימה ומרכז → זרימת ויניאסה → שבאסנה

---

## 8. User Personas (Mock Data)

### Protagonist — מאיה כהן (`maya`)
- Bio: "מדריכת כושר מוסמכת | פילאטיס, יוגה ושיקום"
- Specialties: pilates, yoga, stretch
- Stats: 133 lessons, 340 students, 87% retention, 4.8★, 1,250 coins
- Creates **free** lessons (price 0); excluded from feed as seller
- 7 owned/created lessons across pilates, yoga, stretch

### Marketplace Instructors

| ID | Name | Tier | Label | Rating | Students | Sold | Specialties | Base Price |
|----|------|------|-------|--------|----------|------|-------------|------------|
| dana | דנה לוי | leading | מדריכה מובילה | 4.9 | 520 | 890 | pilates, hiit | 360 |
| noa | נועה ברק | established | מדריכה מנוסה | 4.8 | 340 | 520 | pilates, yoga | 195 |
| shira | שירה אברהם | established | מדריכה מנוסה | 4.7 | 280 | 410 | pilates, stretch, barre | 195 |
| yael | יעל פרידמן | rising | מדריכה חדשה | 4.6 | 95 | 120 | pilates, cycle, stretch | 115 |

**Dynamic pricing formula:** tier base + duration bonus (+45 if ≥50m, +25 if ≥40m) + level adjustment (+35 advanced, -25 beginner), min 80, rounded to nearest 5.

### Client Persona
Anonymous student → `/feedback/demo` from splash

### Lesson Catalog
**27 lessons total** (`l1`–`l27`), all 6 training types represented

---

## 9. Key User Flows

### A. Instructor Onboarding
```
Splash (/) → התחברות/הרשמה → login() → /dashboard
```
No real auth; `isLoggedIn` boolean only.

### B. Discover & Purchase
```
/feed → filter → preview OR /lesson/:id
→ insufficient coins? → /shop
→ purchaseLesson() → owned → full structure unlocked
→ optional Remix → /builder (not fully wired)
```

### C. Create & Publish
```
/create → /builder → set type/title/cover
→ /exercises (optional) → /preview → publish
→ addCreatedLesson() → /library
```

### D. Schedule
```
/schedule → connect Arbox (API key) → syncArbox()
→ OR FAB: training type → lesson → time slot → add to calendar
→ view day/week agenda
```

### E. Analytics
```
/analytics (hub) → pick lesson → /analytics/:id
OR /dashboard recommended lesson card
```

### F. Client Feedback
```
Splash → "כניסה לשיעור" → /feedback/demo
→ rate + preferences → submit → thank you → /
```

### G. Coin Economy
```
/dashboard wallet → /shop → purchase package (mock)
OR /earnings → view history + earn methods
```

---

## 10. UI/UX Design System

### RTL & Hebrew
- `html dir="rtl" lang="he"`
- All primary copy in Hebrew; exercise names bilingual
- Back buttons use `→` (RTL convention)

### Mobile-First / iPhone Feel
- **Desktop:** 390×844px phone frame with rounded corners + purple glow
- **Mobile/PWA:** full viewport, safe-area insets, `100dvh`
- Touch targets: min 44–48px
- Font: Heebo
- **Color palette:**
  - Background: dark purple gradient (`#0f0a1a` → `#1a0f2e`)
  - Accent: violet (`#8b5cf6`)
  - Coins: gold (`#fbbf24`)
  - Positive metrics: green
- Cards: glassy dark, purple borders, glow shadows
- Bottom sheet pattern for modals
- Fade-in page transitions
- Hidden scrollbars, overscroll containment

### Preview Gating (Black Box)
- **3 exercises** shown in preview (`PREVIEW_EXERCISE_COUNT`)
- Remainder shown as locked count
- Unpurchased feed covers have locked overlay

### Cover Imagery
- Custom `coverImage` OR auto 4-image album from exercise posters (Spotify-style)

---

## 11. Arbox Integration (Mock)

Israeli gym/studio scheduling platform simulation.

- Connect: paste API key (length ≥ 8)
- Club name hardcoded: "הסטודיו של מאיה"
- `fetchArboxSchedule()`: 800ms delay, returns ~15 mock events/week
- Studios: א׳, ב׳, reformer room, bike room
- Categories: pilates, reformer, prenatal, stretch, power, yoga, hiit, barre, cycle
- Shows enrollment/capacity, instructor names
- Manual sync button with spinner
- FITback-added events tagged separately; only FITback events removable

---

## 12. Gamification & Instructor Tiers

| Tier | Hebrew Label | Effect |
|------|--------------|--------|
| leading | מדריכה מובילה | Highest base price (360 coins) |
| established | מדריכה מנוסה | Mid-tier pricing |
| rising | מדריכה חדשה | Entry-tier pricing |

**Gamification elements:**
- Tier-based marketplace pricing
- Trending badge (likes ≥ 400)
- Analytics: wantsMoreRate, benchmarks, AI insights
- Earnings rewards: +250 sale, +50 rating, +30 retention
- Feed engagement: likes, comments
- Dashboard community tips + sentiment tags

Note: `instructorTier` exists in data model but is **not rendered in Feed UI** currently.

---

## 13. Splash / Onboarding

**SplashPage (`/`):**
1. Hero image + FITback logo badge
2. Brand title + EN/HE taglines
3. Feature pills: שיתוף מערכים · תיעוד שיעורים · פידבק מלקוחות
4. Social proof: 3 avatars + "+340 מדריכים פעילים בקהילה"
5. CTAs: "התחברות" + "הרשמה חינם" (both → same `login()` → `/dashboard`)
6. Student link: "לקוחות? כניסה לשיעור" → `/feedback/demo`

No multi-step onboarding, no permissions, no profile setup — instant entry.

---

## 14. Global State (AppContext)

All in-memory; resets on page refresh.

| State | Initial |
|-------|---------|
| coins | 1250 |
| ownedLessonIds | Maya's owned lessons |
| createdLessons | Maya's created lessons |
| customExercises | [] |
| lessonDraft | Default pilates draft |
| scheduleEvents | arbox + flow events merged |
| arboxConnection | disconnected |
| isLoggedIn | false |
| transactions | 4 seed transactions |

**Key actions:** `purchaseLesson`, `purchaseCoinPackage`, `addCreatedLesson`, `addCustomExercise`, `connectArbox`, `syncArbox`, `addLessonToSchedule`, `removeScheduleEvent`, `login`, `logout`

---

## 15. Known Gaps & Demo Limitations

1. **No backend** — all state client-side, lost on refresh
2. **No real auth, payments, or video streaming**
3. **Saved library tab** — empty stub
4. **`/builder?template=1`** — query param unused
5. **Exercise "add to lesson"** — UI toggle only, not persisted
6. **Remix button** — navigates to `/builder` without loading purchased lesson
7. **README** mislabels `/dashboard` as analytics; app uses בית/דאשבורד split
8. Internal schedule source tag still `'flowpilates'` (legacy; UI label is FITback)
9. **`instructorTier`** not shown in Feed UI
10. **Maya excluded from feed** — demo positions her as creator/buyer, not seller

---

## 16. Competitive Context (for analysis)

FITback is **not** a consumer fitness app (like Nike Training Club or Peloton). It is an **instructor tooling + marketplace** app, closer to:

- **Lesson plan marketplace** (like Gumroad for workout content)
- **Studio scheduling** (Arbox integration direction)
- **Instructor analytics** (like creator dashboards on Teachable/Thinkific)
- **Internal economy** (FITbackCoins vs real money)

Differentiation vs generic fitness apps:
- Black-box lesson IP protection
- Hebrew RTL instructor community
- Multi-training-type support beyond pilates
- Coin-based peer-to-peer content economy
- Client experiential feedback loop (not exercise critique)

---

## 17. Suggested Analysis Questions for the AI Agent

When analyzing, consider:

1. **Product-market fit:** Does the black-box + coin economy model work for Hebrew fitness instructors?
2. **MVP prioritization:** What should ship first when moving from mock to production?
3. **UX gaps:** Which flows are broken or incomplete?
4. **Monetization:** Is FITbackCoins the right model vs direct ILS/Stripe?
5. **Competitive positioning:** How does this compare to Arbox, Fittix, Trainerize, or content marketplaces?
6. **Technical debt:** What blocks production readiness?
7. **Retention hooks:** What drives daily/weekly instructor engagement?
8. **Expansion:** Should FITback stay instructor-focused or add a student-facing app?

---

*End of FITback product description. Version as of August 2026. Codebase: `/Users/oris/Personal/FITback`.*
