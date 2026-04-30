# Rally Clash Full Game Space (Mechanics + Scoring)

## 1) Scope of This Spec
This document defines the **playable game layer** as a formal game space for Rally Clash:
- state variables,
- legal actions,
- phase flow,
- resolution math,
- scoring and rewards,
- anti-degeneracy constraints.

Target: 2–4 minute matches, high readability, meaningful counterplay.

---

## 2) Core Match Structure
- Match format: **Best of 3 sets**.
- Set format: **First to 5 rally points**, win-by-1 in MVP (optional win-by-2 in competitive queue).
- Rally phases:
  1. Serve phase
  2. Attack phase
  3. Defense/Counter phase
  4. Resolution + point + state updates

### 2.1 Turn cadence
- Simultaneous hidden selection in each phase.
- Reveal and resolve.
- Max decision timer per phase: 8 seconds (AI can be instant).

---

## 3) Game State Definition
At rally `t`, player `p` has state:

`S_p(t) = {Deck, Hand, Discard, ActiveRole, Energy, Momentum, Focus, FormTable, Cooldowns, LastActions, ScoreSet, ScoreMatch}`

### 3.1 Shared state
`S_shared(t) = {Server, RallyIndex, SetIndex, Phase, EventRules, RandomSeed}`

### 3.2 Resource bounds (MVP defaults)
- Hand size target: 5 (draw back to 5 each rally end).
- Deck size: 20 cards.
- Energy curve by rally index in set: `2, 3, 4, 5, 5, ...`
- Momentum range: `0..10`
- Focus (comeback resource) range: `0..3`

---

## 4) Card Taxonomy and Role Space

## 4.1 Card categories
1. **Player cards** (units with stats + passive)
2. **Skill cards** (serve/attack/defense actions)
3. **Momentum cards** (short-term swing modifiers)
4. (Optional post-MVP) **Tactic cards** (global or phase-rule modifiers)

## 4.2 Player roles (mechanical identities)
- Setter: setup discounts/chain enablement
- Outside: flexible attack/control
- Opposite: high-pressure finisher
- Middle: block and quick-attack spikes
- Libero: defensive consistency/card flow
- Utility: hybrid bridge

## 4.3 Base stat vector
Each Player card has:
`[Attack, Block, Serve, Defense, Set, Clutch, Form]`
with each base stat on 0–100 scale.

---

## 5) Action Classes (Counter Topology)
Every Skill/Momentum action gets one macro tag:
- **Pressure (P)**: high ceiling, higher error profile
- **Control (C)**: stable value, lower variance
- **Read/Counter (R)**: punishes predictability and pressure

Counter edges are probabilistic and additive (not auto-win):
- `P > C`
- `C > R`
- `R > P`

### 5.1 Counter-edge bonus
If attacker class has edge over defender class: `CounterEdge = +8` (tune 6..10).
If countered: `CounterEdge = -8`.
Else: `0`.

---

## 6) Legal Moves Per Phase

## 6.1 Serve phase (both players choose)
Allowed:
- Serve skill (Jump Serve, Float Serve, Safe Serve...)
- Setup/momentum (Home Crowd, Calm Reset...)
- Pass (no card)

Outputs:
- ServePressure contribution,
- Ace chance modifier,
- Error risk modifier,
- early momentum swing.

## 6.2 Attack phase (attacking side chooses)
Allowed:
- Attack skill (Power Spike, Line Shot, Back Row...)
- Optional supporting momentum card (if energy permits and rules allow 2-card play)

## 6.3 Defense/Counter phase (defender chooses)
Allowed:
- Defense skill (Double Block, Read Setter, Pancake Save...)
- Optional momentum response

## 6.4 Availability constraints
- Energy must cover card costs.
- Cooldown-gated cards unavailable until cooldown expires.
- Duplicate anti-spam penalties apply (Section 10).

---

## 7) Resolution Mathematics

## 7.1 Phase subtotals
For player `p` in rally `t`:

`ServePower_p = ServeStat + ServeCardBonus + FormServe + MomentumServe + Noise_s`

`AttackPower_p = AttackStat + AttackCardBonus + SetAssist + FormAttack + MomentumAttack + Noise_a`

`DefensePower_p = DefenseStat + DefenseCardBonus + BlockAssist + FormDefense + MomentumDefense + Noise_d`

Where each `Noise_* ~ Uniform(-4, +4)`.

## 7.2 SetAssist and role synergy
- If active player role matches skill affinity, add synergy:
  - Strong affinity: `+10`
  - Weak affinity: `+4`
  - Off-role mismatch: `0`

## 7.3 Predictability penalty
Let `rep_p` be number of times same macro class was used in last 3 rallies.

`PredictabilityPenalty_p = min(8, 3 * max(0, rep_p - 1))`

So repeats incur `0, 3, 6, 8`.

## 7.4 Effective rally power
Attacker effective:

`ER_att = AttackPower_att + 0.25*ServePower_att + CounterEdge_att - PredictabilityPenalty_att + ClutchBonus_att`

Defender effective:

`ER_def = DefensePower_def + 0.15*ServePower_def + CounterEdge_def - PredictabilityPenalty_def + ClutchBonus_def`

With clutch:
- `ClutchBonus = +6` when rally is set-point or score tied at 4-4.

## 7.5 Rally outcome rule
Compute:

`Delta = ER_att - ER_def`

- If `Delta >= 1`: attacker wins rally.
- If `Delta <= -1`: defender wins rally.
- If `-0.99 <= Delta <= 0.99`: resolve coin flip weighted by Control class presence (Control gets +10% tie-break weight).

---

## 8) Scoring Systems (Mechanics + Engagement)

## 8.1 In-match objective scoring (official points)
- Rally winner gets +1 point in current set.
- First to 5 points wins set.
- First to 2 sets wins match.

## 8.2 Per-rally mechanical score (telemetry)
For each player `p`:

`RS_p = W + E + A + K + H`

Components:
- `W` (Result): `12` if rally win, else `4` for close defended loss (`|Delta|<=5` and played counter-class), else `0`.
- `E` (Efficiency): `0..10` = normalized `(NetPowerGain / EnergySpent)`.
- `A` (Adaptation): `0..8` for class switch after prior counter, prediction hit, anti-repeat choice.
- `K` (Risk Quality): `-3..+6` based on chosen line EV vs baseline.
- `H` (Handling): `0..2` no timeout/AFK.

Clamp: `RS_p in [0, 30]`.

## 8.3 Match Engagement Score (MES)
Per player:

`MES = 0.45*SkillExpr + 0.20*Variety + 0.15*Tension + 0.10*Pace + 0.10*Completion`

Each component normalized to 0..100:
- `SkillExpr`: counter accuracy, timing, efficiency
- `Variety`: action entropy, role diversity
- `Tension`: close-rally and comeback participation
- `Pace`: decision latency + total match duration target fit
- `Completion`: full participation/no disconnect

## 8.4 Session Engagement Score (SES)
Across day/session:

`SES = 0.60*avg(MES) + 0.25*Progress + 0.15*Social`

- `Progress`: missions, card mastery, deck iteration
- `Social`: friend matches, rematches, event queue usage

---

## 9) Economy Mapping from Scores

## 9.1 Base rewards
- Match played: base XP + small currency.
- Match win: +win bonus.

## 9.2 Quality multipliers
By MES tier:
- `MES >= 75`: `1.25x` XP, +mastery shard bonus
- `55 <= MES < 75`: `1.00x`
- `MES < 55`: `0.75x` + coaching prompt

## 9.3 Ranked integrity
- MMR changes from W/L + opponent strength only.
- MES/SES do **not** change MMR.
- MES/SES affect pass progression, mastery, cosmetics, and quests.

---

## 10) Anti-Degeneracy Constraints

1. **Modifier cap**: `CardBonus + Form + Momentum <= +25`.
2. **Live form cap**: per stat `FormModifier in [-8, +8]`.
3. **Momentum decay**: unspent momentum `-1` after each rally.
4. **Comeback focus**: after losing 2 consecutive rallies, gain `+1 Focus` (max 3); spend to add `+5` once.
5. **Action repetition tax**: predictability penalty (Section 7.3).
6. **Deck role quota** (20-card deck):
   - >=3 defense-tagged cards,
   - >=3 serve-tagged cards,
   - >=6 attack-tagged cards,
   - >=2 setup cards.

---

## 11) Deck Construction Rules (MVP)
- 20-card deck.
- Max duplicates:
  - Common: 2
  - Rare+: 1
- Player cards: 5–7 total in deck list.
- Skill cards: 9–12.
- Momentum cards: 3–6.

Goal: prevent single-axis optimization and enforce tactical breadth.

---

## 12) AI and Async PvP Formalization

## 12.1 AI policy tiers
- Tier 1 (tutorial): noisy heuristic policy, teaches counters.
- Tier 2 (standard): policy with expected-value action selection + occasional bluff.
- Tier 3 (boss): opponent-modeling with repetition punishment.

## 12.2 Async defense evaluation
A defending deck is simulated over `N` sampled matchups.
Store:
- defense win rate,
- average MES against challengers,
- anti-exploit confidence score.

Reward defense owner by robust performance, not raw sample size.

---

## 13) MVP Telemetry Schema
Log per rally:
- chosen class tags,
- energy spent,
- ER_att / ER_def,
- Delta,
- counter-edge trigger,
- predictability penalty,
- RS components.

Log per match:
- MES components,
- set scoreline,
- duration,
- disconnect/timeout flags.

This enables balance patches from evidence instead of intuition.

---

## 14) Worked Rally Example
Attacker plays Opposite + Power Spike (Pressure).
Defender plays Middle + Double Block (Read/Counter).

Assume:
- `AttackPower_att = 101`
- `DefensePower_def = 96`
- `ServePower_att = 82`
- `ServePower_def = 76`
- Defender class edge vs Pressure: defender `+8`, attacker `-8`
- Predictability: attacker `3`, defender `0`
- Clutch: none

Then:
- `ER_att = 101 + 0.25*82 - 8 - 3 = 110.5`
- `ER_def = 96 + 0.15*76 + 8 - 0 = 115.4`
- `Delta = -4.9` => defender wins rally.

RS example:
- Defender: `W=12, E=7, A=6, K=4, H=2 => RS=31 => clamped to 30`
- Attacker: `W=4 (close loss + attempted pressure), E=5, A=0, K=1, H=2 => RS=12`

---

## 15) Balance KPIs
Weekly checkpoints:
- top-deck play-rate concentration (HHI / entropy),
- class usage distribution by rank,
- comeback rate when trailing 0-2,
- average match duration,
- mismatch stomp rate,
- MES quartile vs D1/D7 retention.

Balance target: strategic diversity with stable short-session pacing.
