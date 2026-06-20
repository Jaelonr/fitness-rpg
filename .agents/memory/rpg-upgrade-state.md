---
name: RPG upgrade state
description: What's already built for the fitness-driven RPG upgrade vs. what was added
---

## Already existed before the upgrade session
- `artifacts/api-server/src/combat-engine.ts` — full 6-style engine (strength/striking/conditioning/grappling/recovery/discipline), 3 narrative intensities, hybrid archetypes, raid style bonuses. Do not rebuild this.
- `lib/db/src/schema/combat.ts` — `combat_replays` and `player_style_identity` tables, all columns.
- `lib/db/src/schema/inventory.ts` — `store_items` (with `style_affinity`, `section`, `category`) and `player_inventory` tables.
- 145 store items seeded (13 daily / 79 permanent / 23 raid / 30 weekly); 41 items have `style_affinity`.
- API routes: `battle-log.ts` (GET /battle-log, GET /player/style-identity), `inventory.ts` (GET /store/sections with daily rotation, POST /store/purchase, POST /inventory/:id/sell).
- `training.ts` — full combat replay generation on session complete, upserts `player_style_identity`.
- `artifacts/fitness-rpg/src/pages/battle-log.tsx` — Chronicle page with 6 tabs.
- `artifacts/fitness-rpg/src/pages/active-session.tsx` — `CombatReplayModal` with staggered event reveal + count-up animations.
- Narrative intensity setting in `settings.tsx`, read by `active-session.tsx` on session complete.
- Bottom nav: Hall / Training / Nutrition / Chronicle / Character.

## Added in upgrade session
- `CombatReplayModal`: animated style score breakdown bars shown after all events reveal (sorted by score, dominant style on top).
- `inventory.tsx`: fetches `useGetPlayerStyleIdentity`; shows "⚔ Your Style: <style>" personalized featured row at top of permanent store tab.
- `openapi.yaml` RpgGear schema: added 9 missing fields (`displayName`, `loreText`, `affinity`, `iconUrl`, `iconKey`, `mannequinLayerUrl`, `mannequinLayerKey`, `layerOrder`, `cosmeticVariant`); ran codegen → web typecheck now clean.

**Why:** These close the gap between "fitness tracker with RPG layers" and "fitness-driven RPG" — the combat replay now explicitly maps each workout to a style identity, and the store responds to that identity.

## GitHub
- New repo created: `Jaelonr/ascension-quest-legends-of-aeothir` (pushed via direct URL push, not `git remote add` — that operation is blocked in main agent).
