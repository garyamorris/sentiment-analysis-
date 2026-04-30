# Rally Clash — Game Theory Critique & Engagement Scoring

## Objective
Create a simple, repeatable, skill-expressive rally card game that:
- avoids deterministic "best deck" lock-in,
- prevents runaway leads,
- rewards adaptation and bluffing,
- keeps average match length at 2–4 minutes.

## Expert Critique (Game-Theory Lens)

### 1) Hidden-information + simultaneous choice is correct
Your secret card selection per phase creates a mixed-strategy game (players should randomize to avoid exploitation). This is good.

**Risk:** if one action dominates in too many states (e.g., always playing top Attack + top Skill), the equilibrium collapses into repetitive play.

**Fix:** maintain a clear counter triangle and soft caps on stacking bonuses.

---

### 2) Add explicit counter-classes (RPS+, not pure RPS)
Current actions can be reframed as three macro classes:
- **Pressure** (hard serve/spike, high ceiling, higher error risk)
- **Control** (safe placement, consistency, lower variance)
- **Read/Counter** (block/dig/anticipation, punishes predictable pressure)

Target relation:
- Pressure > Control
- Control > Read/Counter
- Read/Counter > Pressure

Keep this as a **probabilistic advantage** (e.g., +6 to +10 effective points), not an auto-win.

---

### 3) Avoid first-mover and tempo snowball
Momentum cards + streak bonuses can produce runaway victories.

**Fixes:**
- Momentum decay: every rally, unspent momentum reduces by 1.
- Comeback battery: trailing player gets +1 "focus" resource after losing 2 consecutive rallies.
- Cap additive rally modifiers from all sources (e.g., max +25 pre-variance).

---

### 4) Force diminishing returns on superstar stacks
Without constraints, optimal decks converge to highest Attack + best boosts.

**Fixes:**
- Role quota in 20-card deck (minimum counts by role archetype).
- Synergy budget: each card has a synergy value; deck has max budget.
- Duplicate penalty: repeated use of same action in adjacent rallies incurs -X predictability penalty.

---

### 5) Make adaptation visible and rewarded
Skill expression should come from reading the opponent’s sequence.

**Fixes:**
- "Scout" mechanic: track opponent’s last 3 action classes.
- Adaptive bonus: if player switches class after being countered, grant small bonus (+3).
- Prediction bonus: correctly countering a repeated class gives bonus draw or energy refund.

---

### 6) Variance should add drama, not invalidate decisions
Randomness is needed but should not overpower stat/card choices.

**Rule of thumb:**
- 70% outcome from stats + card interactions,
- 20% from form/momentum,
- 10% from randomness.

Use bounded randomness (e.g., uniform -4..+4), and surface odds in UI.

---

### 7) Separate onboarding meta from ranked meta
New players need forgiving systems, ranked players need depth.

**Recommendation:**
- Casual/AI: wider variance, stronger comeback aid.
- Ranked: tighter variance, stricter deck constraints, visible MMR bands.

## Engagement Scoring Mechanism

Use a composite **Engagement Score (ES)** to drive rewards, quests, and matchmaking quality checks.

### A. Rally Score (per rally)
For player `i` in rally `r`:

`RS(i,r) = Outcome + Decision + Adaptation + Risk + Sportsmanship`

Where:
- `Outcome`: +12 for rally win, +4 for "good loss" (lost by <= 5 points after counter attempt), 0 otherwise.
- `Decision`: 0..10 based on efficiency (value generated per energy spent).
- `Adaptation`: 0..8 for successful class switch, prediction hits, anti-repeat play.
- `Risk`: -3..+6 depending on selected line risk-adjusted success.
- `Sportsmanship`: 0..2 for full-turn completion, no idle timeout.

Cap `RS` in `[0, 30]`.

### B. Match Engagement Score (MES)

`MES = 0.45*SkillExpr + 0.20*Variety + 0.15*Tension + 0.10*Pace + 0.10*Completion`

Normalized components (0–100):
- `SkillExpr`: counter accuracy, energy efficiency, timing quality.
- `Variety`: action entropy, role diversity, non-repetition.
- `Tension`: close-rally ratio, comeback attempts, clutch rallies.
- `Pace`: turn latency and total match duration within target window.
- `Completion`: no disconnect, no AFK penalties.

### C. Session Engagement Score (SES)
Across multiple matches/day:

`SES = 0.6*avg(MES) + 0.25*Progress + 0.15*Social`

- `Progress`: quests completed, deck iteration, mastery XP.
- `Social`: friend matches, rematches, event participation.

Use SES for streak rewards and personalized objectives.

## Reward Mapping (Anti-Grind)

Use MES/SES to reward **quality of play**, not only wins:
- MES >= 75: full rewards + mastery bonus.
- MES 55–74: normal rewards.
- MES < 55: reduced rewards, plus coaching hints.

This keeps losing players engaged if they play well.

## Ranked Integrity Rules
- Win/Loss changes MMR.
- MES affects **bonus progression** only (battle pass, mastery, cosmetics), not core rank delta.
- Detect exploit loops (same opponent farming, intentional stalling) and nullify MES bonuses.

## Live-Data Modifier Guardrails
Real-world form is compelling but can destabilize balance.

Guardrails:
- Hard cap live Form bonus to +/-8.
- Decay boosts every 24h.
- Convert extreme real-world events into temporary mode rules, not permanent card inflation.

## MVP Implementation Order
1. Add counter-class tags to all skill/momentum cards.
2. Implement capped rally formula with bounded variance.
3. Add per-rally RS telemetry.
4. Compute MES post-match.
5. Tie MES to rewards and coaching.
6. Add SES-based daily mission personalization.

## Minimal Rally Resolution Formula (Practical)
`RallyPower = BaseStat + CardBonus + Form + Momentum + CounterEdge - PredictabilityPenalty + Random(-4..+4)`

Constraints:
- `CardBonus + Form + Momentum <= +25`
- `PredictabilityPenalty` starts at 0, grows to max 8 for repeated class spam
- `CounterEdge` in range 0..10 when class advantage triggers

## KPIs to Validate Engagement
Track weekly:
- D1 / D7 retention by MES quartile
- Matches per DAU
- Median session length
- Deck diversity index (Shannon entropy across top 1,000 decks)
- Comeback win rate when trailing 0–2 rallies
- Repeat-action rate by rank tier

Success signature: higher retention with stable match duration and no single-deck dominance.
