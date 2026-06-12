# Retail VCS MVP — Implementation Log

## Implementation Record

---
Task ID: 1
Agent: Main
Task: Implement Prisma schema for backend

Work Log:
- Replaced starter User/Post schema with CatalogItem, TransactionRepo, TransactionCommit models
- Ran `bun run db:push` to apply schema to SQLite
- Seeded 18 catalog items (burgers, sides, drinks, desserts, modifiers) via seed-catalog.ts

Stage Summary:
- Database has 3 models: CatalogItem (product catalog), TransactionRepo (one per order), TransactionCommit (append-only ledger)
- 18 seeded catalog items across 5 categories

---
Task ID: 2
Agent: Main
Task: Build VCS Core Types

Work Log:
- Created `src/lib/vcs/types.ts` with all v2.0.0-PRO compliant TypeScript interfaces
- Defined discriminated union for AllocationBlock (AssignmentAllocation, PaymentAllocation, FulfillmentAllocation)
- Defined all 6 Delta types: declare_allocation, add_item, remove_item, modify_item_allocations, modify_sku, batch_by_filter
- Defined ProjectedState, VCSCommit, VCSRepo, BranchMap, CatalogItemEntry, FilterRule types

Stage Summary:
- Full type system covering the entire VCS data model
- Allocations are decoupled (referenced by ID string, not embedded objects)

---
Task ID: 3
Agent: Main
Task: Build VCS Core Reducer

Work Log:
- Created `src/lib/vcs/reducer.ts` with the `projectState()` function
- Implemented all 6 delta actions with correct v2.0.0-PRO semantics
- Implemented cascading deletion (iterative orphan pruning)
- Implemented late-bound catalog resolution (prices/names resolved at projection time)
- Implemented filter evaluation engine for batch_by_filter
- Implemented all 4 batch mutation types: batch_duplicate_and_reallocate, batch_modify_allocations, batch_remove_items, batch_modify_sku
- Created `src/lib/vcs/id.ts` with cuid2-based ID generation + deriveCloneId()

Stage Summary:
- Core reducer handles all delta types correctly
- State is computed on the fly (never stored) — RAM only
- Prices are never in commits — resolved from trusted catalog at projection time

---
Task ID: 4
Agent: Main
Task: Build VCS Engine + Zustand Store

Work Log:
- Created `src/lib/vcs/engine.ts` — VCSEngine class (repo management, commit, branch, checkout)
- Created `src/store/vcs-store.ts` — Zustand store bridging engine to React UI
- Engine provides: commit(), projectAt(), projectCurrent(), createBranch(), checkout(), mimicOrder()
- Store provides: addItemWithAllocations(), addModifier(), removeItem(), mimicOrder(), viewRevision(), persist(), hydrate()
- localStorage persistence for offline survival
- Created barrel export at `src/lib/vcs/index.ts`

Stage Summary:
- VCSEngine is the "Git" engine — the UI never touches business logic
- Store persists repo to localStorage on every commit (offline-first)

---
Task ID: 5
Agent: Main
Task: Build Backend API Routes + Seed Data

Work Log:
- Created `src/app/api/catalog/route.ts` — GET (list catalog), POST (seed/upsert)
- Created `src/app/api/sync/push/route.ts` — POST (push commit log, idempotent)
- Created `src/app/api/sync/pull/route.ts` — GET (pull commits since hash)
- Created `seed-catalog.ts` — 18 items across burger, side, drink, dessert, modifier categories

Stage Summary:
- Backend is the "origin" server — accepts pushes, serves catalog
- Push endpoint is idempotent (deduplicates by commit hash)

---
Task ID: 6
Agent: Main
Task: Build Frontend UI — 3-Panel POS Terminal

Work Log:
- Created full `src/app/page.tsx` — single-page 3-panel POS terminal
- Left panel: Catalog (grouped by category, search, tooltips with dietary info)
- Center panel: Active Check projection (tree view, allocation badges, financial bar with person breakdown)
- Right panel: Commit Ledger (DAG visualization, time-travel, author badges)
- Header: Branch tabs, person selector, payment method selector
- AI Agent panel: Mimic Order (batch_duplicate_and_reallocate)
- Footer: Sticky with system description
- Components used: Button, Badge, Input, Select, ScrollArea, Separator, Tooltip, Toast

Stage Summary:
- Full 3-panel POS terminal matching the prototype's layout
- Enhanced with shadcn/ui components, responsive design, accessibility
- Person-based financial breakdown in the header bar

---
Task ID: 7
Agent: Main
Task: End-to-end Verification with Agent Browser

Work Log:
- Verified page loads with all 18 catalog items from backend
- Added Classic Cheeseburger for Bob — 3 deltas (declare_allocation x2, add_item)
- Added Fountain Soda + Cookie Skillet for Alice — financial breakdown shows correctly
- Executed AI Mimic Order (batch_duplicate_and_reallocate) — cloned Alice's items for George
- Verified person breakdown: Alice $14.97, Bob $12.99, George $14.97, Total $42.93
- Tested time-travel: clicked historical commit, state correctly showed only items at that point
- Verified "Back to HEAD" restores full $42.93 total
- Confirmed localStorage persistence (7 commits survive reload)
- Confirmed zero runtime errors in dev.log

Stage Summary:
- All core VCS flows verified:
  1. ✅ Add items with decoupled allocations
  2. ✅ Late-bound catalog resolution
  3. ✅ Multi-person ordering with financial breakdown
  4. ✅ AI batch_duplicate_and_reallocate (Mimic Order)
  5. ✅ Time-travel to historical commits
  6. ✅ Return to HEAD
  7. ✅ localStorage persistence
  8. ✅ Zero runtime errors

---
Task ID: 8
Agent: Main
Task: Order Init Flow — POS Config, dynamic customer form, repo initialization

Work Log:
- Added `PosConfig` model to Prisma schema (key, label, config JSON, active flag)
- Created `/api/pos-config` route with auto-seed: 3 order types (walk-in, pickup, delivery)
- Each order type defines its own required/optional customer fields with validation rules
- Walk-in: name only. Pickup: name + phone + notes. Delivery: name + phone + address + notes
- Extended VCS types with `OrderContext`, `CustomerFieldConfig`, `OrderTypeConfig`, `PosConfigResponse`
- Added `orderContext` field to `VCSRepo` (set once at init, never mutated)
- Extended Zustand store with `isInitialized`, `orderContext`, `initRepo()`, `resetOrder()`
- `initRepo()` creates fresh repo with orderContext attached, preserves catalog cache
- `resetOrder()` clears localStorage and returns to uninitialized state
- `hydrate()` checks persisted repo for `orderContext` to restore `isInitialized` state
- Built `OrderInitScreen` component: 2-step flow (order type cards → dynamic customer form)
- Step indicator, validation with field-level errors, character counters
- Split `page.tsx` into `POSTerminal` (gate) + `POSTerminalInner` (POS UI) to fix hooks-after-return lint error
- Added `OrderContextBanner` in POS header showing order type, customer name, phone, address, ETA
- Added "New Order" button with confirmation dialog in POS header
- Zero runtime errors, all lint passing

Stage Summary:
- Full order initialization flow: fetch config → select type → fill customer details → init repo → POS terminal
- Dynamic form fields driven entirely by backend config (add/change order types without code changes)
- Order context persisted in repo's localStorage for offline survival
- "New Order" reset clears everything and returns to init screen
- Verified via Agent Browser: Walk In (1 field), Pickup (3 fields), Delivery (4 fields), reset flow

---
Task ID: 15
Agent: Main
Task: Replace hardcoded guests with dynamic guest list seeded from order context

Work Log:
- Removed hardcoded `PERSON_OPTIONS` (Bob, Alice, George, Charlie) and `getPersonColor()`
- Added `GUEST_PALETTE` (8 colors, cycled by index) and `getGuestColor(name, guests)` with name-hash fallback
- Guest list initialized from `orderContext.customerFields.name` (the primary customer)
- Added `guests: string[]` state, `addGuest()`, `removeGuest()` to POSTerminalInner
- Primary guest (index 0) cannot be removed — toast error if attempted
- Guest selector shows first name truncated (max-w-60px) with full name in tooltip
- Removable guests show × overlay on hover (absolute positioned, opacity transition)
- "Add guest" button (UserPlus icon) opens inline text input with Enter/Escape/Blur handling
- Duplicate guest names rejected (case-insensitive check)
- `mimicTarget` auto-updates via useEffect when guests or selectedPerson changes
- Mimic Order disabled when no target available; hint text changes dynamically
- `LineItemNode` now accepts `guests` prop for color resolution
- Financial breakdown uses `getGuestColor()` with dynamic guest list
- Removing a guest removes them from the selector but VCS items remain (immutability)
- Future note: walk-in table config can preload guests array from seat configuration

Stage Summary:
- Guest list is fully dynamic — no hardcoded names
- Seeded from customer name during order init
- Add/remove guests at any time during the order
- AI Mimic Order works with dynamic guest names (full names like "John Smith")
- Color assignment is deterministic by position in guest list
- Verified: 3 guests added, items assigned per guest, mimic cloned Jane's items to John, John removed from selector (items persist in VCS)

---
Task ID: 16
Agent: Main
Task: Shared allocation system — default allocations, payment switching, split payments, correlation IDs, auto-naming

Work Log:
- Extended POS config API with `defaultPaymentMethod` field (default: "cash")
- Updated `PosConfigResponse` type to include `defaultPaymentMethod`
- Added backward-compatible parsing in GET endpoint (fallback for old array format)
- Completely rewrote `vcs-store.ts` with new allocation management:
  - `initRepo()` now creates default allocation pair (assignment + payment) in a `system-init` commit
  - `addItemWithDefaults()` adds items referencing shared default allocation IDs (no per-item declare)
  - `changeDefaultPayment(method, mode)` — batch-swaps all items or creates new default only
  - `splitItemPayment(lineId, splits)` — creates correlated payment allocations with auto-generated correlationId
  - `reassignItem(lineId, newAssignee)` — creates new assignment allocation, swaps via modify_item_allocations
  - `resetItemPaymentToDefault(lineId)` — removes split/custom payment, reverts to shared default
  - Hydration recovers default allocation IDs from the system-init commit
- Added allocation auto-naming utilities:
  - `getPaymentAllocDisplayName()` — single: "cash — Alice", split: "Alice 60% / Bob 40%"
  - `getAssignmentAllocDisplayName()` — "Alice"
  - `generateSplitCorrelationId()` — "split-Alice-60-Bob-40" (sorted by percentage desc)
- Built `PaymentSwitchDialog` component:
  - Two options: "Change all existing items" (batch modify) vs "New allocation for future items"
  - Shows affected item count, VCS delta operation names
- Built `AllocationConfigDialog` component:
  - Shows current assignment and payment allocations with auto-generated names
  - Reassign to another guest (dropdown + Apply)
  - Split Payment editor: add/remove split members, adjust percentages, live total validation
  - Auto-name preview: "Alice 60% / Bob 40%"
  - Correlation ID preview: "split-Alice-60-Bob-40"
  - Reset to default button (only shown for non-default payments)
- Updated `page.tsx`:
  - Removed `selectedPayment` local state, derives from `defaultPaymentMethod` in store
  - Payment dropdown triggers `PaymentSwitchDialog` on change
  - Items clickable to open `AllocationConfigDialog`
  - Allocation badges show auto-generated names (not raw allocation IDs)
  - Split items show "split" badge; custom payment items show "custom" badge
  - Items show gear icon (Settings2) on hover for allocation config access
  - `handleAddItem` uses `addItemWithDefaults()` + `reassignItem()` for non-primary guests
  - Ledger commit badges show `system-init` in muted style
  - `modify_item_allocations` deltas show truncated lineId in ledger

Stage Summary:
- Items now share a single default allocation (no per-item declare_allocation) — adding items is a single `add_item` delta
- Switching payment method triggers a popup: "Change all existing" or "New for future only"
- "Change all existing" creates 1 declare + N modify_item_allocations deltas
- Split payments: e.g., Alice 60% / Bob 40% with auto-generated name and correlation ID
- Correlation ID format: `split-{payer1}-{pct1}-{payer2}-{pct2}` (percentage-descending)
- All allocation names auto-generated from config data (no manual naming)
- Verified end-to-end: init → add 2 items → switch cash→visa (2 items updated) → add guest → split cheeseburger 60/40 → correlation ID and auto-name correct → zero errors

## Implementation Plan (Archived)

## Document Conflict Analysis

### Source Documents
1. **HTML Prototype** (`Pasted Content` inline in user message) — Version 1.0.0-PRO, "Local-First Reducer" demo
2. **Full Specification** (`upload/Pasted Content_1781285637958.txt`) — Version 2.0.0-PRO, "Master Specification" (2594 lines)

### Critical Conflicts Identified

#### Conflict 1: Allocations Architecture (SEVERITY: HIGH)
| Aspect | HTML Prototype (v1) | Specification (v2) |
|--------|---------------------|---------------------|
| Storage | Embedded objects inside `item.allocations[]` | First-class decoupled entities declared via `declare_allocation` at repo level |
| Reference | Full object with `{type, entity, payer, method}` inline | Flat array of `allocation_id` strings: `["alloc-001-assign-bob"]` |
| Mutation | `modify_allocation` replaces one allocation by ID | `modify_item_allocations` replaces the whole ID array (with `before_allocations` for 3-way merge) |

**Resolution**: Follow v2.0.0-PRO. The decoupled model is fundamental to the 3-way merge conflict matrix and AI agent statelessness.

#### Conflict 2: Commit Envelope Schema (SEVERITY: MEDIUM)
| Aspect | HTML Prototype | Specification |
|--------|---------------|---------------|
| `merge_parent_hashes` | Missing | Required field (null or string[]) |
| `branch` | Missing (implicit "main") | Required string field |
| `metadata` | Missing | Optional object |
| `declare_allocation` | Not a delta type | First-class delta action |
| `modify_sku` | Not a delta type | First-class delta action |

**Resolution**: Follow v2.0.0-PRO full schema. The prototype was a simplified demo.

#### Conflict 3: `batch_by_filter` — Allocation Patching (SEVERITY: MEDIUM)
- **Prototype**: `patch_allocations` contains **full allocation objects** with `allocation_id`, `type`, `entity`, etc.
- **Spec**: `patch_allocations` (for `batch_duplicate_and_reallocate`) contains **allocation_block references** — but the actual `batch_modify_allocations` mutation takes a single `patch_allocation` block.

**Resolution**: Follow v2.0.0-PRO. For `batch_duplicate_and_reallocate`, the patch_allocations are full allocation_block objects (with allocation_id + type), which is consistent.

#### Conflict 4: Storage & Persistence (SEVERITY: LOW)
- **Prototype**: Pure in-memory React state
- **Spec**: IndexedDB (browser) + SQL (backend), bidirectional sync

**Resolution**: For MVP, use Zustand (in-memory) with `localStorage` persistence for the VCS engine client side. Use Prisma/SQLite for backend. Implement basic sync endpoints.

#### Conflict 5: Branching & Merging (SEVERITY: LOW)
- **Prototype**: Not implemented
- **Spec**: Full branching with LCA-based 3-way merge, conflict detection matrix

**Resolution**: Implement branch creation and time-travel viewing. Defer complex 3-way merge conflict resolution UI to post-MVP. The merge data model (merge_parent_hashes) will be supported in the schema.

---

## Architecture Design

### Three-Tier Separation (As Specified)

```
┌──────────────────────────────────┐
│  Tier 1: UI (Next.js / React)    │  ← Zero business logic, pure view
│  - POS Terminal                   │
│  - Cart Projection                │
│  - Commit Ledger                  │
│  - AI Agent Panel                 │
└──────────┬───────────────────────┘
           │ Read projected state / Dispatch commits
           ▼
┌──────────────────────────────────┐
│  Tier 2: VCS Engine (Zustand)    │  ← The "Git" Engine
│  - Commit Log (append-only)      │
│  - Branch Pointers               │
│  - Reducer (projectState)        │
│  - Filter Engine                 │
│  - Local Catalog Cache           │
│  - Cascading Deletion            │
│  - Late-Bound Resolution         │
└──────────┬───────────────────────┘
           │ Sync (push/pull)
           ▼
┌──────────────────────────────────┐
│  Tier 3: Backend (API Routes)    │  ← The "Origin" Server
│  - Product Catalog (Prisma)      │
│  - Transaction Ledger (Prisma)   │
│  - Sync Endpoints                │
│  - Seed Data                     │
└──────────────────────────────────┘
```

### MVP Feature Scope

**In Scope (Must Have):**
1. ✅ VCS Core Reducer — all 6 delta actions: `declare_allocation`, `add_item`, `remove_item`, `modify_item_allocations`, `modify_sku`, `batch_by_filter`
2. ✅ Decoupled Allocations — first-class allocation contracts referenced by ID
3. ✅ Cascading Deletion — recursive orphan pruning
4. ✅ Late-Bound Catalog Resolution — prices/names resolved from catalog at projection time
5. ✅ Branch creation and switching (time-travel viewing)
6. ✅ POS Terminal UI with 3-panel layout
7. ✅ Product Catalog backend + seed data
8. ✅ Sync push/pull endpoints
9. ✅ AI "Mimic Order" (batch_duplicate_and_reallocate)
10. ✅ Financial projection (subtotal, per-person totals)

**Deferred (Post-MVP):**
- ❌ Full 3-way merge with conflict resolution UI
- ❌ Conditional promotional evaluation pipeline (BOGO, threshold discounts)
- ❌ AI agent natural language chat interface (LLM integration)
- ❌ Kitchen Display System (KDS) view mode
- ❌ Fulfillment allocation type with delivery routing
- ❌ Inventory connector webhooks
- ❌ CRM connector
- ❌ Filter-to-SQL compiler (backend query engine)
- ❌ Cryptographic hash verification on push

---

## File Structure

```
src/
  lib/
    vcs/
      types.ts              # All TypeScript interfaces (VCSDelta, Commit, Allocation, etc.)
      engine.ts             # Core VCS Engine class (repo management)
      reducer.ts            # projectState() — the main reduction function
      filter.ts             # Filter rule evaluation engine
      merge.ts              # LCA finding, conflict detection (skeleton)
      catalog-resolver.ts   # Late-bound catalog lookup
      id.ts                 # Deterministic ID generation
    db.ts                   # Prisma client (existing)
    utils.ts                # cn() utility (existing)

  store/
    vcs-store.ts            # Zustand store: local VCS state + actions
    catalog-store.ts        # Zustand store: local catalog cache

  app/
    page.tsx                # Main POS page (only route) — 3-panel layout
    layout.tsx              # Existing root layout
    globals.css             # Existing styles
    api/
      catalog/
        route.ts            # GET /api/catalog (list), POST /api/catalog (seed/admin)
      sync/
        push/route.ts       # POST /api/sync/push
        pull/route.ts       # GET /api/sync/pull?context_id=X&since_hash=Y
      transactions/
        route.ts            # GET /api/transactions (list all repos)

  components/
    vcs/
      pos-terminal.tsx       # Left panel — catalog item buttons + modifier buttons
      cart-projection.tsx    # Center panel — active check state tree
      commit-ledger.tsx      # Right panel — commit DAG log
      line-item-node.tsx     # Tree node for line item (recursive children)
      allocation-badge.tsx   # Assignment/payment/fulfillment badge
      branch-tabs.tsx        # Branch selector tabs
      financial-bar.tsx      # Subtotal/total summary bar
      ai-actions-panel.tsx   # AI agent operation buttons (mimic order, batch realloc)
      empty-cart.tsx         # Empty state placeholder

prisma/
  schema.prisma             # Updated: CatalogItem, TransactionRepo, TransactionCommit, etc.
```

---

## Data Model (Prisma Schema)

```prisma
model CatalogItem {
  sku           String   @id
  name          String
  basePrice     Float
  category      String   @default("general")
  type          String   @default("item")  // "item" | "modifier"
  dietaryFlags  String   @default("[]")     // JSON array
  allergens     String   @default("[]")     // JSON array
  brand         String   @default("")
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
}

model TransactionRepo {
  id            String   @id @default(cuid())
  contextType   String   @default("cart")    // "cart" | "catalog" | "inventory_warehouse"
  contextId     String                        // e.g. "table-12"
  createdAt     DateTime @default(now())
  commits       TransactionCommit[]
}

model TransactionCommit {
  id                  String   @id @default(cuid())
  repoId              String
  repo                TransactionRepo @relation(fields: [repoId], references: [id])
  commitHash          String   @unique
  parentHash          String?
  mergeParentHashes   String   @default("[]")    // JSON array of strings
  branch              String   @default("main")
  timestamp           DateTime
  authorId            String
  deltas              String                    // JSON array of delta operations
  metadata            String   @default("{}")    // JSON object
}
```

---

## Delta Actions — Implementation Priority

| Priority | Action | Complexity | Description |
|----------|--------|------------|-------------|
| P0 | `declare_allocation` | Low | Register/update allocation contract by ID |
| P0 | `add_item` | Low | Add line item with allocation ID refs |
| P0 | `remove_item` | Low | Decrement qty, triggers cascade |
| P1 | `modify_item_allocations` | Medium | Swap allocation ID arrays with before/after check |
| P1 | `modify_sku` | Low | Swap SKU on existing line |
| P1 | `batch_by_filter` | High | Declarative filter + template mutation |
| P2 | Merge commit handling | High | LCA + 3-way conflict detection |

---

## Implementation Phases

### Phase 1: Foundation (Tasks 1-2)
- Prisma schema with seed data
- VCS TypeScript types
- Core reducer with P0 deltas

### Phase 2: Engine & State (Tasks 3-4)
- VCS Engine class
- Zustand store with localStorage persistence
- Catalog resolver
- All delta actions including batch

### Phase 3: Backend API (Task 5)
- Catalog endpoint
- Sync push/pull endpoints
- Seed script

### Phase 4: Frontend UI (Tasks 6-7)
- 3-panel POS layout
- Cart projection with tree rendering
- Commit ledger
- AI actions panel
- Branch tabs + time travel

### Phase 5: Integration & Verification (Task 8)
- End-to-end testing
- Agent browser verification