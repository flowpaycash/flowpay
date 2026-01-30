<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
  ADR-003 · SQLite Local Persistence
      NEØ Protocol Strategy
========================================
```

Date: 2026-01-30
Status: **ACCEPTED** ✅
Decider: Mellø (Node Architect)
Supersedes: ADR-002 (Layer 2 strategy)

────────────────────────────────────────

## Context

FlowPay requires persistent storage for:
- Payment orders lifecycle tracking
- UNLOCK_RECEIPT sovereign records
- Product catalog
- Retry queue (failed operations)
- Audit logs

**CRITICAL CONSTRAINT:**
NEØ Protocol REJECTS centralized cloud
databases (Supabase, Firebase, etc).

Philosophy:
> "If it doesn't run local, it's not
>  sovereign."

────────────────────────────────────────

## Decision

**We adopt SQLite as primary persistence:**

> Local-first, sovereign, battle-tested,
> zero dependencies on cloud providers.

**Rationale:**
1. Runs 100% local (full sovereignty)
2. No accounts, no billing, no lock-in
3. Battle-tested (20+ years, billions deployed)
4. ACID transactions (data integrity)
5. Fast (faster than network DBs)
6. File-based (easy backup/export)
7. Used by FlowCloser (proven in ecosystem)

────────────────────────────────────────

## Architecture

### Storage Layers

```text
┌────────────────────────────────────────┐
│ LAYER 1: SQLite (Primary)             │
├────────────────────────────────────────┤
│ • Orders (payment tracking)            │
│ • Receipts (unlock records)            │
│ • Products (catalog)                   │
│ • Retry Queue (error handling)         │
│ • Audit Log (compliance)               │
│                                        │
│ Location: data/flowpay/flowpay.db     │
│ Access: better-sqlite3 (sync)         │
│ Backup: File copy to IPFS/iCloud      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ LAYER 2: JSON Files (Backup)          │
├────────────────────────────────────────┤
│ • One file per order/receipt           │
│ • Human-readable (debug)               │
│ • Immutable records                    │
│                                        │
│ Location: data/flowpay/{type}/*.json  │
│ Purpose: Export, audit, recovery       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ LAYER 3: IPFS (Anchoring)             │
├────────────────────────────────────────┤
│ • UNLOCK_RECEIPT (immutable proof)     │
│ • Permanent anchoring                  │
│ • Content-addressed                    │
│                                        │
│ Provider: Storacha (w3up)             │
│ Purpose: Sovereign proof, portability  │
└────────────────────────────────────────┘
```

────────────────────────────────────────

## Schema Design

### Core Tables

**orders**
- Tracks payment lifecycle
- CREATED → PIX_PAID → PENDING_REVIEW
  → APPROVED → SETTLED → COMPLETED
- Stores: charge_id, amount, product,
  customer, status, timestamps

**receipts**
- UNLOCK_RECEIPT sovereign records
- Generated when access granted
- Stores: JWT, permissions, signature
- Optional: IPFS CID for anchoring

**products**
- Service/product catalog
- Pre-seeded with Smart Factory, WOD,
  FLUXX offerings
- Defines: price, permissions, access_url

**retry_queue**
- Failed operations (blockchain, IPFS)
- Automatic retry with backoff
- Status: PENDING → PROCESSING → COMPLETED

**audit_log**
- Compliance and forensics
- Who did what when
- Immutable append-only log

### Views

- `v_orders_pending_review`: Admin list
- `v_orders_recent`: Last 7 days
- `v_retry_queue_active`: Failed tasks

────────────────────────────────────────

## Consequences

### ✅ Positive

1. **Full Sovereignty**
   - No cloud provider lock-in
   - Data lives on our machines
   - Zero external dependencies

2. **Performance**
   - Local = instant queries
   - No network latency
   - Scales to millions of rows

3. **Simplicity**
   - Single file database
   - No connection pooling
   - No authentication/authorization

4. **Cost**
   - Zero ongoing cost
   - No per-query pricing
   - No storage limits

5. **Backup**
   - File copy = backup
   - iCloud, IPFS, USB all work
   - Easy disaster recovery

6. **Development**
   - Instant local testing
   - No staging environments needed
   - Reproducible state

### ⚠️ Negative

1. **Single Machine**
   - Not distributed by default
   - Manual replication needed
   - (Acceptable: This is orchestrator,
     not public API)

2. **Concurrency**
   - SQLite has write serialization
   - (Acceptable: Low volume, single
     writer pattern)

3. **Backup Manual**
   - No automatic cloud backup
   - Need cron job for IPFS sync
   - (Acceptable: We control schedule)

4. **No Built-in Replication**
   - If machine dies, recovery from backup
   - (Acceptable: IPFS anchoring provides
     proof, can rebuild from receipts)

────────────────────────────────────────

## Alternatives Considered

### Alternative A: Supabase (PostgreSQL)

**Pros:**
- Real-time subscriptions
- Row-level security
- Built-in auth

**Cons:**
- Centralized (against NEØ philosophy)
- Requires account (lock-in)
- Monthly cost
- Network latency
- Single point of failure

**Rejected because:** Violates sovereignty.

────────────────────────────────────────

### Alternative B: Kwil DB (Decentralized SQL)

**Pros:**
- Fully decentralized
- SQL interface
- Blockchain-backed
- Used in AGENT-FULL

**Cons:**
- Requires network nodes
- Slower than local
- More complex setup
- Gas fees for writes

**Deferred because:** Overkill for MVP.
May adopt for multi-node future.

────────────────────────────────────────

### Alternative C: Pure File-Based (JSON)

**Pros:**
- Simplest possible
- Human-readable
- Easy backup

**Cons:**
- No queries (must scan all)
- No indexes (slow)
- No transactions (data corruption risk)
- No relations (manual joins)

**Rejected because:** Doesn't scale.

────────────────────────────────────────

## Implementation

### Dependencies

```json
{
  "better-sqlite3": "^11.x"
}
```

Why `better-sqlite3` over `sqlite3`?
- Synchronous API (simpler)
- Faster (no async overhead)
- Better error messages
- Active maintenance

### Database Location

```text
/Users/nettomello/CODIGOS/neobot/
├─ data/flowpay/
│  ├─ flowpay.db          (SQLite)
│  ├─ flowpay.db-shm      (Shared memory)
│  ├─ flowpay.db-wal      (Write-ahead log)
│  ├─ schema.sql          (Schema definition)
│  ├─ orders/*.json       (JSON backup)
│  ├─ receipts/*.json     (JSON backup)
│  └─ .gitignore          (NEVER commit DB)
```

### Initialization

```bash
# Auto-initialize on first skill call
moltbot flowpay:buy --help

# Or manual:
node scripts/flowpay-init-db.js
```

### Backup Strategy

**Daily (Cron):**
1. Copy `flowpay.db` to `backups/`
2. Upload to IPFS/Storacha
3. Store CID in iCloud Keychain
4. Alert Telegram if failed

**Manual (On-Demand):**
```bash
moltbot flowpay:backup
```

**Recovery:**
```bash
moltbot flowpay:restore --from-ipfs <CID>
moltbot flowpay:restore --from-file <path>
```

────────────────────────────────────────

## Future Enhancements

**Phase 2: Kwil DB (Multi-Node)**

If we need distributed:
- Migrate schema to Kwil
- Keep SQLite as local cache
- Sync: SQLite ↔ Kwil
- Best of both worlds

**Phase 3: Ceramic Network (DID)**

For user-owned data:
- User receipts on Ceramic
- User controls access
- Portable across apps

────────────────────────────────────────

## Success Metrics

**Week 1 (MVP):**
- [ ] DB initializes automatically
- [ ] Orders persist correctly
- [ ] Receipts are queryable
- [ ] No data corruption

**Month 1 (Production):**
- [ ] 100+ orders processed
- [ ] Zero data loss
- [ ] < 10ms query time (p95)
- [ ] Backup cron running

**Quarter 1 (Scale):**
- [ ] 1000+ orders
- [ ] < 100MB database size
- [ ] Kwil migration planned (if needed)

────────────────────────────────────────

## References

**SQLite:**
- https://sqlite.org/whentouse.html
- https://sqlite.org/fasterthanfs.html

**better-sqlite3:**
- https://github.com/WiseLibs/better-sqlite3

**NEØ Philosophy:**
- ADR-001: FlowCloser Remote Integration
- ADR-002: Access Unlock Primary

────────────────────────────────────────

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Local first. Sovereign always.
 Cloud is someone else's computer."

If it doesn't run offline, it's not NEØ.
────────────────────────────────────────
