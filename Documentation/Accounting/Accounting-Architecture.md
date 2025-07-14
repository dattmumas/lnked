# Accounting Ledger Architecture

> **Status:** Active in Staging (`LEDGER_DUAL_WRITE=true`) – planned production cut-over to ledger-only mode (`LEDGER_DUAL_WRITE=only`) after 72 h validation.

---

## 1. Schema

### `accounting.accounts`

```sql
-- src/lib/database.types.ts excerpt
accounts (
  id                  uuid      PRIMARY KEY,
  type                text      CHECK (type IN ('creator','collective','platform')),
  currency            text      NOT NULL DEFAULT 'usd',
  current_balance_cents bigint   NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now()
)
```

_Every money-bearing entity (creator, collective or the platform itself) has exactly one row in `accounts`._

### `accounting.ledger_entries`

```sql
ledger_entries (
  id                   bigint       PRIMARY KEY,
  account_id           uuid         REFERENCES accounting.accounts(id),
  stripe_object_id     text         NOT NULL,
  event_type           text         NOT NULL,
  amount_cents         bigint       NOT NULL, -- signed (+ credit / – debit)
  currency             text         NOT NULL,
  entry_ts             timestamptz  NOT NULL DEFAULT now(),
  balance_after_cents  bigint       NOT NULL,
  memo                 jsonb        NOT NULL DEFAULT '{}'
)
```

_Immutable, append-only. **Never** update or delete rows – corrections are negative follow-up entries._

---

## 2. Write Path

### 2.1 TypeScript helper (`src/lib/ledger.ts`)

```ts
export async function insertLedgerEntries(entries: LedgerInsert[]) {
  if (entries.length === 0) return;
  const { error } = await (supabaseAdmin as any).rpc('ledger_insert_batch', {
    entries,
  });
  if (error) throw error;
}
```

✔ Early-return on empty batches | ✔ Propagates Postgres errors

### 2.2 Postgres function `ledger_insert_batch`

1. `FOR row IN entries …` loop (PL/pgSQL).
2. `UPDATE … SET current_balance_cents = balance + amount_cents … FOR UPDATE` → obtains row-level lock to ensure atomicity.
3. `INSERT INTO ledger_entries (…) VALUES (…) ON CONFLICT DO NOTHING` → idempotent.

> _The function lives in the **database**, versioned via migrations; the helper merely forwards JSONB._

### 2.3 Stripe Webhook Dual-Write

_Location:_ `src/app/api/stripe-webhook/route.ts`

| Stripe Event                                        | Creator Entry                  | Platform Entry |
| --------------------------------------------------- | ------------------------------ | -------------- |
| `invoice.payment_succeeded`                         | `+net`                         | `+fee`         |
| `charge.refunded \| charge.dispute.funds_withdrawn` | `−net`                         | `−fee`         |
| Future: `transfer.paid`                             | revenue-share logic (worker)   | –              |
| Future: `payout.paid`                               | `−amount` (creator withdrawal) | –              |

Feature flag behaviour:

- `LEDGER_DUAL_WRITE=true` – **Legacy + Ledger** (staging)
- `LEDGER_DUAL_WRITE=only` – **Ledger-only**; any ledger failure aborts webhook → Stripe retries.

Legacy `creator_earnings` table writes are skipped automatically in _only_ mode, allowing safe removal after rollout.

---

## 3. Read Path

### 3.1 Materialised Views

- `accounting.v_monthly_creator_earnings` – aggregates gross/net per creator, per month.
- `accounting.v_creator_totals` – current and lifetime balances.

### 3.2 API / UI Consumers

- **`GET /api/creator/earnings`** – now selects from `v_monthly_creator_earnings`.
- **Creator Dashboard** – fetches the same view for charts & totals.

Both fallback to `'usd'` default currency if the view returns no rows.

---

## 4. Testing

### Jest Unit

- `__tests__/ledger/insertLedgerEntries.test.ts`
  - Empty batch short-circuit
  - Happy-path RPC envelope
  - Error propagation when RPC returns error

### Integration (todo)

- Stripe Test-Clock scenarios: subscription, renewal, refund.

---

## 5. Roll-out Checklist

| Step                                                    | Environment | Owner   |
| ------------------------------------------------------- | ----------- | ------- |
| Deploy helper + webhook dual-write                      | Staging     | BE      |
| Verify ledger rows vs. Stripe dashboard                 | Staging     | Finance |
| Set `LEDGER_DUAL_WRITE=only`                            | Prod        | BE      |
| Remove legacy `creator_earnings` writes + archive table | Prod        | DBA     |

---

## 6. Future Enhancements

- **Revenue-share Worker** – populate ledger during `transfer.paid` event for collectives → members.
- **Payout Tracking** – ledger debits on `payout.paid` to keep balances zero-sum.
- **Automated Back-fill** – one-time script to mirror historical `creator_earnings` into ledger for analytics continuity.

---

**TL;DR:** All money movements are now funneled into an immutable, append-only ledger with atomic balance tracking. Analytics & dashboards consume pre-aggregated views, ensuring consistency while letting us deprecate bespoke earnings tables.

---

## 7. Operational Automation *(2025-07)*

| Automation | Location | Purpose |
|------------|----------|---------|
| **Hourly view refresh** | `pg_cron` job `refresh_monthly_creator_earnings` | `REFRESH MATERIALIZED VIEW CONCURRENTLY accounting.v_monthly_creator_earnings` runs at minute 0 every hour ensuring near-real-time dashboard data. |
| **Ledger mapper** | `src/lib/ledger/stripe-event-mapper.ts` | Centralizes mapping of Stripe events → `LedgerInsert[]`; reused across webhook & future workers. |
| **Ledger service wrapper** | `src/lib/ledger/ledger-service.ts` | Generates + inserts ledger rows with uniform idempotency/error telemetry; respects `LEDGER_DUAL_WRITE` modes. |
| **Balance sanity tests** | `__tests__/ledger/balanceSanity.test.ts` | Table-driven Jest tests asserting creator balance returns to zero after refund/chargeback sequences. |
| **CI Workflow** | `.github/workflows/ledger-tests.yml` | Spins up Postgres, runs migrations, executes Jest ledger suite on every PR/commit. |

The table above complements §4 *Testing* and §5 *Roll-out* ensuring the ledger remains correct and observable in all environments.
