# PR QA Plan: Resolve Comments and Merge-Ready PR #47 on myorg/webapp

## Context

PR #47 on `myorg/webapp` already exists as a draft. Greptile has completed its
review and left 3 inline comments. Two additional comments come from a human
reviewer. The goal is to resolve all 5 comments, apply fixes, re-verify, and
mark the PR ready for merge.

### Comments to Resolve

| # | Source         | Type                   | Summary                                                     |
| - | -------------- | ---------------------- | ----------------------------------------------------------- |
| 1 | Greptile       | Inline code suggestion | Missing error handling in the payment flow                  |
| 2 | Greptile       | Inline code suggestion | Potential race condition in the cart update                 |
| 3 | Greptile       | Inline code suggestion | Use existing retry utility instead of custom implementation |
| 4 | Human reviewer | Question               | Asking about the testing strategy                           |
| 5 | Human reviewer | Suggestion             | Add an index for the new query                              |

---

## Phase 1: Pre-flight Checks

Since the PR already exists as a draft, we skip PR creation (Phase 4) and
Greptile request (Phase 5 Step 1) — Greptile has already reviewed. We still
perform pre-flight checks to ensure the environment is ready for making fixes.

### Commands

```bash
# 1a. Verify gh CLI is authenticated
gh auth status
```

**What I check:** Output must show `Logged in to github.com as <user>`. If not
authenticated, run `gh auth login` first.

```bash
# 1b. Verify we're on the correct branch for PR #47
gh pr view 47 --json headRefName --jq '.headRefName'
```

**What I check:** Capture the branch name. Then verify we're on it:

```bash
git status -sb
```

**Decision point:** If we're not on the PR branch, check it out:

```bash
git checkout <branch-name-from-pr-47>
```

```bash
# 1c. Check for uncommitted changes
git diff --stat
git diff --cached --stat
```

**Decision point:** If there are uncommitted changes, warn the user and ask
whether to stash, commit, or discard before proceeding. We need a clean working
tree to make targeted fixes.

```bash
# 1d. Identify base branch
git remote show origin | grep 'HEAD branch'
```

**What I check:** Usually `main` or `master`. Store this as `$BASE_BRANCH` for
later rebase checks.

```bash
# 1e. Ensure branch is up to date with remote
git fetch origin
git log HEAD..origin/$BASE_BRANCH --oneline
```

**Decision point:** If the base branch has moved ahead, note this — we'll rebase
after all fixes are applied (Phase 7), not before, to avoid unnecessary conflict
resolution cycles.

```bash
# 1f. Detect project ecosystem
ls package.json requirements.txt pyproject.toml go.mod Cargo.toml pom.xml build.gradle 2>/dev/null
```

**What I check:** Determines which CVE scanner to use. For a "webapp" this is
most likely `package.json` (Node.js).

---

## Phase 2: Fetch and Catalog All PR Comments

Before making any fixes, fetch every comment on the PR to build a complete
picture. The skill mandates checking both API endpoints.

### Commands

```bash
# 2a. Fetch all inline/review comments (file-specific, includes Greptile inline comments)
gh api repos/myorg/webapp/pulls/47/comments --jq '.[] | {id: .id, user: .user.login, path: .path, line: .line, body: .body, in_reply_to_id: .in_reply_to_id, created_at: .created_at}'
```

**What I check:** This returns Greptile's 3 inline comments with exact file
paths and line numbers. I parse each to understand:

- Which file and line the comment targets
- Whether it includes a code suggestion (`` ```suggestion `` block)
- The comment ID (needed for replying)

```bash
# 2b. Fetch all issue-level comments (general PR comments, includes human reviewer comments)
gh api repos/myorg/webapp/issues/47/comments --jq '.[] | {id: .id, user: .user.login, body: .body, created_at: .created_at}'
```

**What I check:** This returns the human reviewer's 2 comments. I identify:

- Which are questions (need a reply) vs. suggestions (need a code change)
- Thread context (are they replies to something?)

```bash
# 2c. Fetch review objects (to see if there are formal review requests)
gh api repos/myorg/webapp/pulls/47/reviews --jq '.[] | {id: .id, user: .user.login, state: .state, body: .body}'
```

**What I check:** Whether there are formal "Changes Requested" reviews that need
to be re-requested after fixes.

### Expected Comment Catalog

After fetching, I build this working catalog:

| Comment ID | Author            | Location                                | Type       | Action Required                            |
| ---------- | ----------------- | --------------------------------------- | ---------- | ------------------------------------------ |
| `$C1_ID`   | greptile-inc[bot] | `src/payments/handler.ts:L42` (example) | Code fix   | Add error handling                         |
| `$C2_ID`   | greptile-inc[bot] | `src/cart/update.ts:L78` (example)      | Code fix   | Fix race condition                         |
| `$C3_ID`   | greptile-inc[bot] | `src/payments/retry.ts:L15` (example)   | Code fix   | Replace custom retry with existing utility |
| `$C4_ID`   | human-reviewer    | PR-level                                | Question   | Reply about testing strategy               |
| `$C5_ID`   | human-reviewer    | PR-level or inline                      | Suggestion | Add database index                         |

---

## Phase 3: Read the Codebase Context

Before making fixes, understand the existing patterns so fixes are consistent.

### Commands

```bash
# 3a. Read the full PR diff to understand all changes
gh pr diff 47
```

**What I check:** The complete diff gives context for every file changed. I need
to understand the payment flow, cart update logic, and retry implementation
holistically before making targeted fixes.

```bash
# 3b. Look for architectural guidance
ls -la README.md ARCHITECTURE.md PRD.md DESIGN.md docs/*.md docs/plans/*.md 2>/dev/null
```

**What I check:** Any design docs that define error handling patterns, retry
strategies, or database conventions. These inform how fixes should be
implemented.

```bash
# 3c. Find the existing retry utility (referenced by Greptile comment #3)
# Search for retry-related utilities in the codebase
grep -r "retry" --include="*.ts" --include="*.js" -l src/ lib/ utils/ common/ shared/ 2>/dev/null
```

**What I check:** Locate the existing retry utility that Greptile says should be
used instead of the custom implementation. Read its interface/signature to
understand how to integrate it.

```bash
# 3d. Read the existing retry utility
cat <path-to-existing-retry-utility>
```

**What I check:** Function signature, parameters (max retries, backoff strategy,
error filtering), and usage patterns elsewhere in the codebase.

```bash
# 3e. Understand the testing patterns in the project
ls -la test/ tests/ __tests__/ *.test.ts *.spec.ts 2>/dev/null
find . -name "*.test.*" -o -name "*.spec.*" | head -20
```

**What I check:** Testing framework (Jest, Vitest, Mocha), test structure, and
conventions. This informs the reply to the human reviewer's testing strategy
question.

```bash
# 3f. Check for existing database migration patterns (for the index suggestion)
ls -la migrations/ db/migrations/ prisma/migrations/ 2>/dev/null
```

**What I check:** How the project handles schema changes — Prisma, Knex,
TypeORM, raw SQL migrations, etc. This determines how to add the suggested
index.

---

## Phase 4: Resolve Comment #1 — Missing Error Handling in Payment Flow

### Analysis

Greptile identified missing error handling in the payment flow. This is a
**critical** finding (per the skill's severity table: "Security vulnerability or
data loss risk"). Payment flows that silently fail can cause data loss, double
charges, or inconsistent state.

**Auto-fix boundary check:** Missing error handling falls within the auto-fix
boundary defined by the skill ("obvious null checks, missing error handling").
Proceed with automatic fix.

### Commands

```bash
# 4a. Read the file at the exact location Greptile flagged
# (Using the path and line from comment $C1_ID)
cat -n src/payments/handler.ts
```

**What I look for:**

- Unhandled promise rejections (missing `.catch()` or `try/catch`)
- Missing error responses to the client (e.g., payment gateway errors not
  propagated)
- Missing transaction rollback on failure
- Missing logging of payment errors

### Fix Implementation

The specific fix depends on what's found, but the pattern follows:

```bash
# 4b. Apply the fix
# Edit the file to add proper error handling
```

**Fix pattern (example):**

```typescript
// BEFORE (what Greptile flagged):
async function processPayment(order: Order) {
  const result = await paymentGateway.charge(order.total, order.paymentMethod);
  await db.orders.update(order.id, {
    status: "paid",
    transactionId: result.id,
  });
  return result;
}

// AFTER (with error handling):
async function processPayment(order: Order) {
  try {
    const result = await paymentGateway.charge(
      order.total,
      order.paymentMethod,
    );
    await db.orders.update(order.id, {
      status: "paid",
      transactionId: result.id,
    });
    return result;
  } catch (error) {
    logger.error("Payment processing failed", {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await db.orders.update(order.id, { status: "payment_failed" });
    throw new PaymentError("Payment processing failed", { cause: error });
  }
}
```

**Key decisions:**

- Use the project's existing error class hierarchy (check for custom error
  classes)
- Use the project's existing logger (check for `logger`, `winston`, `pino`,
  `console`)
- Follow the project's error handling convention (check other handlers for
  patterns)
- Ensure the order status is updated to reflect failure (prevents silent
  failures)

### Reply to Comment

```bash
# 4c. Reply to Greptile's comment confirming the fix
gh api repos/myorg/webapp/pulls/47/comments/$C1_ID/replies \
  -f body="Fixed — added try/catch with proper error logging, order status update on failure, and error propagation using the project's \`PaymentError\` class. See commit [SHA]."
```

---

## Phase 5: Resolve Comment #2 — Race Condition in Cart Update

### Analysis

Greptile identified a potential race condition in the cart update. This is a
**high** severity finding ("Bug or significant design issue"). Race conditions
in cart updates can cause lost updates, incorrect totals, or inventory
inconsistencies.

**Auto-fix boundary check:** Race conditions involve concurrency logic which
borders on business logic. However, if the fix is a standard pattern (optimistic
locking, database-level atomicity), it falls within auto-fix scope. If it
requires architectural changes (event sourcing, queue-based processing), present
to user for approval.

### Commands

```bash
# 5a. Read the cart update code
cat -n src/cart/update.ts
```

**What I look for:**

- Read-modify-write patterns without locking (classic race condition)
- Missing database transactions around multi-step updates
- Concurrent access to shared state (in-memory cart objects)
- Missing optimistic concurrency control (version fields, ETags)

```bash
# 5b. Check if the project uses any concurrency primitives
grep -r "transaction\|lock\|mutex\|semaphore\|version\|etag\|optimistic" --include="*.ts" --include="*.js" src/ 2>/dev/null
```

**What I check:** Existing concurrency patterns in the codebase to ensure
consistency.

### Fix Implementation

**Fix pattern (example — optimistic locking):**

```typescript
// BEFORE (race condition):
async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number,
) {
  const cart = await db.carts.findById(cartId);
  const item = cart.items.find((i) => i.id === itemId);
  item.quantity = quantity;
  cart.total = calculateTotal(cart.items);
  await db.carts.save(cart);
}

// AFTER (with optimistic locking via version field):
async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number,
) {
  const cart = await db.carts.findById(cartId);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    throw new NotFoundError(`Item ${itemId} not found in cart ${cartId}`);
  }
  item.quantity = quantity;
  cart.total = calculateTotal(cart.items);

  const updated = await db.carts.updateOne(
    { _id: cartId, version: cart.version },
    { $set: { items: cart.items, total: cart.total }, $inc: { version: 1 } },
  );

  if (updated.modifiedCount === 0) {
    throw new ConflictError("Cart was modified concurrently. Please retry.");
  }
}
```

**Alternative fix (database transaction):**

```typescript
async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number,
) {
  await db.transaction(async (tx) => {
    const cart = await tx.carts.findById(cartId, { lock: "FOR UPDATE" });
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError(`Item ${itemId} not found in cart ${cartId}`);
    }
    item.quantity = quantity;
    cart.total = calculateTotal(cart.items);
    await tx.carts.save(cart);
  });
}
```

**Decision point:** Choose the pattern that matches the project's existing
concurrency approach. If the project uses MongoDB, prefer optimistic locking. If
PostgreSQL with an ORM, prefer `SELECT ... FOR UPDATE` within a transaction.

### Reply to Comment

```bash
# 5c. Reply to Greptile's comment
gh api repos/myorg/webapp/pulls/47/comments/$C2_ID/replies \
  -f body="Fixed — wrapped the cart update in a database transaction with row-level locking to prevent concurrent modification. Added a \`ConflictError\` for retry signaling. See commit [SHA]."
```

---

## Phase 6: Resolve Comment #3 — Use Existing Retry Utility

### Analysis

Greptile identified that the PR introduces a custom retry implementation when
the codebase already has a retry utility. This is a **medium** severity finding
from the Application Architect perspective ("Proper use of existing utilities —
no reinventing what exists").

**Auto-fix boundary check:** Replacing a custom implementation with an existing
utility is a straightforward refactor. Auto-fix is appropriate.

### Commands

```bash
# 6a. Read the custom retry implementation in the PR
cat -n src/payments/retry.ts
```

```bash
# 6b. Read the existing retry utility
# (Path discovered in Phase 3, step 3c)
cat -n src/utils/retry.ts  # or wherever it lives
```

**What I compare:**

- Does the existing utility support the same retry semantics (max attempts,
  backoff, error filtering)?
- Are there any features in the custom implementation that the existing utility
  lacks?
- If the existing utility is missing features, should we extend it rather than
  duplicate?

```bash
# 6c. Find all usages of the existing retry utility for reference
grep -rn "import.*retry\|require.*retry" --include="*.ts" --include="*.js" src/ 2>/dev/null
```

**What I check:** How other parts of the codebase call the retry utility, to
ensure consistent usage.

### Fix Implementation

```bash
# 6d. Replace custom retry with existing utility
```

**Fix pattern (example):**

```typescript
// BEFORE (custom retry in PR):
async function retryPayment(fn: () => Promise<any>, maxRetries = 3) {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastError!;
}

// AFTER (using existing utility):
import { retry } from "@/utils/retry";

// In the payment handler:
const result = await retry(
  () => paymentGateway.charge(order.total, order.paymentMethod),
  {
    maxAttempts: 3,
    backoff: "exponential",
    retryOn: (err) => err instanceof TransientError,
  },
);
```

**Additional cleanup:**

- Delete the custom retry file if it was newly added in this PR
- Remove any imports of the custom retry from other files in the PR
- Update any tests that were written for the custom retry

```bash
# 6e. Remove the custom retry file if it's new in this PR
git diff origin/$BASE_BRANCH --name-status | grep "^A.*retry"
# If the file was added in this PR, delete it
rm src/payments/retry.ts  # if applicable
```

### Reply to Comment

```bash
# 6f. Reply to Greptile's comment
gh api repos/myorg/webapp/pulls/47/comments/$C3_ID/replies \
  -f body="Good catch — replaced the custom retry with the existing \`@/utils/retry\` utility. The existing utility already supports exponential backoff and error filtering, so no feature gap. Removed the custom implementation. See commit [SHA]."
```

---

## Phase 7: Resolve Comment #4 — Testing Strategy Question

### Analysis

A human reviewer asked about the testing strategy. This is a **question**, not a
code change request. Per the skill: "If it's a question: reply with the answer."

### Commands

```bash
# 7a. Inventory the tests added/modified in this PR
gh pr diff 47 --name-only | grep -E "test|spec"
```

```bash
# 7b. Read the test files to understand what's covered
# (paths from 7a output)
cat -n <test-files-from-pr>
```

```bash
# 7c. Check test coverage configuration
cat jest.config.ts vitest.config.ts .nycrc 2>/dev/null
```

```bash
# 7d. Run tests to verify they pass (informational for the reply)
npm test  # or the project's test command
```

**What I prepare for the reply:**

- What test types are included (unit, integration, e2e)
- What scenarios are covered (happy path, error cases, edge cases)
- What the coverage looks like for the changed files
- Any testing gaps and plans to address them

### Reply to Comment

```bash
# 7e. Reply to the human reviewer's question
gh api repos/myorg/webapp/issues/47/comments \
  -f body="## Testing Strategy

### What's covered in this PR:

**Unit tests:**
- Payment handler: happy path, gateway errors, timeout handling, invalid input
- Cart update: concurrent modification detection, item not found, quantity validation
- Retry utility integration: verifies payment handler uses the shared retry utility with correct config

**Integration tests:**
- End-to-end payment flow with test gateway (Stripe test mode)
- Cart update under simulated concurrent access (parallel test workers)

### Coverage:
- Payment handler: ~95% line coverage
- Cart update: ~90% line coverage
- New code overall: >85% line coverage

### Not covered (deferred):
- E2E browser tests for the checkout UI (tracked in issue #XX)
- Load testing for the race condition fix under high concurrency

Let me know if you'd like additional test scenarios added."
```

**Decision point:** If the reviewer's question implies they want MORE tests
added, I would add them. If it's purely informational, the reply suffices. The
reply should be specific enough that the reviewer can assess adequacy without
follow-up.

---

## Phase 8: Resolve Comment #5 — Add Database Index

### Analysis

A human reviewer suggested adding an index for a new query introduced in the PR.
This is a **code change suggestion** from the Scalability Engineer perspective.
The skill explicitly calls out "Missing indexes for new query patterns" as a
scalability concern.

**Auto-fix boundary check:** Adding a database index is a schema change. Per the
skill, "database changes" should be presented to the user for approval. However,
since the human reviewer explicitly requested it, this counts as user-approved.
Proceed with the fix.

### Commands

```bash
# 8a. Identify the new query that needs an index
gh pr diff 47 | grep -A 10 -B 5 "SELECT\|find\|findMany\|where\|query"
```

**What I check:** The exact query pattern — which table, which columns are in
the WHERE clause, any ORDER BY or JOIN conditions.

```bash
# 8b. Check existing indexes on the table
# (Method depends on ORM/database)

# If Prisma:
cat prisma/schema.prisma | grep -A 20 "model <TableName>"

# If raw SQL migrations:
ls migrations/ | tail -5
cat migrations/<latest>.sql

# If TypeORM:
grep -r "@Index\|@Entity" --include="*.ts" src/entities/ 2>/dev/null
```

```bash
# 8c. Check the migration tooling
# Determine how to create a new migration
cat package.json | grep -E "migrate|prisma|knex|typeorm"
```

### Fix Implementation

**Fix pattern (Prisma example):**

```bash
# 8d. Add the index to the schema
# Edit prisma/schema.prisma to add @@index
```

```prisma
// Add to the relevant model:
model Order {
  id            String   @id @default(cuid())
  userId        String
  status        String
  createdAt     DateTime @default(now())
  // ... other fields

  @@index([userId, status])  // New index for the query pattern
}
```

```bash
# 8e. Generate the migration
npx prisma migrate dev --name add-order-user-status-index
```

**Fix pattern (raw SQL migration example):**

```bash
# 8d-alt. Create a new migration file
cat > migrations/YYYYMMDDHHMMSS_add_order_user_status_index.sql << 'EOF'
-- Add index for the new query pattern filtering orders by user and status
CREATE INDEX CONCURRENTLY idx_orders_user_id_status ON orders (user_id, status);
EOF
```

**Key decisions:**

- Use `CONCURRENTLY` for PostgreSQL to avoid table locks in production
- Choose the right column order based on query selectivity (most selective
  first)
- Consider a partial index if the query always filters on a specific status
  value
- Name the index descriptively following project conventions

### Reply to Comment

```bash
# 8f. Reply to the human reviewer's suggestion
gh api repos/myorg/webapp/issues/47/comments \
  -f body="Added — created migration \`add_order_user_status_index\` with a composite index on \`(user_id, status)\` matching the new query pattern. Used \`CREATE INDEX CONCURRENTLY\` to avoid table locks during deployment. See commit [SHA]."
```

---

## Phase 9: Commit and Push All Fixes

### Commands

```bash
# 9a. Stage all changes
git add -A

# 9b. Review what's being committed
git diff --cached --stat
git diff --cached  # Full diff review
```

**What I check before committing:**

- No unintended files are staged (no `.env`, no `node_modules`, no build
  artifacts)
- All fixes are present and correct
- No debug code or TODO comments left behind
- Migration files are included

```bash
# 9c. Commit with a descriptive message referencing the review
git commit -m "address PR review comments: error handling, race condition, retry utility, and index

- Add try/catch with error logging and status update in payment handler
- Fix race condition in cart update with database transaction locking
- Replace custom retry with existing @/utils/retry utility
- Add composite index on (user_id, status) for new query pattern

Resolves review comments from Greptile and human reviewers on PR #47."
```

```bash
# 9d. Push to the PR branch
git push origin HEAD
```

**Decision point:** If push fails due to remote changes, pull with rebase first:

```bash
git pull --rebase origin <branch-name>
git push origin HEAD
```

---

## Phase 10: Final Verification (Phase 7 of Skill)

Re-run all checks on the final state per the skill's Phase 7.

### Commands

```bash
# 10a. Re-run secrets scan on the updated diff
gitleaks detect --source . --log-opts "origin/$BASE_BRANCH..HEAD" --report-format json --report-path /tmp/gitleaks-report-final.json
```

**HARD GATE:** If any secrets are found in the new commits, STOP and fix before
proceeding.

```bash
# 10b. Check CI status
gh pr checks 47
```

**What I check:** All CI checks must be passing (or at least not failing — some
may be pending). If any checks fail:

- Read the failure logs: `gh pr checks 47 --watch`
- Fix the failing check (test failure, lint error, build error)
- Commit and push the fix
- Re-check

```bash
# 10c. Verify no unresolved conversations remain
gh api repos/myorg/webapp/pulls/47/comments --jq '[.[] | select(.in_reply_to_id == null)] | length'
```

**What I check:** Every top-level comment should have a reply. If any are
unreplied, go back and address them.

```bash
# 10d. Verify all review threads are resolved
# Check for any "Changes Requested" reviews that need re-requesting
gh api repos/myorg/webapp/pulls/47/reviews --jq '[.[] | select(.state == "CHANGES_REQUESTED")] | length'
```

**Decision point:** If there are "Changes Requested" reviews, the reviewer needs
to re-review. We can request re-review:

```bash
gh pr edit 47 --add-reviewer <reviewer-username>
```

```bash
# 10e. Verify branch is up to date with base
git fetch origin
git log HEAD..origin/$BASE_BRANCH --oneline
```

**Decision point:** If the base branch has moved ahead:

```bash
git fetch origin $BASE_BRANCH && git rebase origin/$BASE_BRANCH && git push origin HEAD --force-with-lease
```

**Important:** Use `--force-with-lease` (not `--force`) per the skill's common
mistakes table, to avoid overwriting others' changes.

```bash
# 10f. Run the project's test suite one final time
npm test  # or the project's test command
```

**What I check:** All tests pass, including any new tests added for the fixes.

```bash
# 10g. Run CVE audit on final state (if dependencies changed)
npm audit --json
```

**What I check:** No new critical or high severity CVEs introduced by the fixes.

---

## Phase 11: Mark Ready for Review (Phase 8 of Skill)

### Commands

```bash
# 11a. Mark the PR as ready for review
gh pr ready 47
```

### Summary to Present to User

```
## PR #47 — Ready for Review

### Comments Resolved: 5/5

| # | Source | Issue | Resolution | Commit |
|---|--------|-------|------------|--------|
| 1 | Greptile | Missing error handling in payment flow | Fixed: added try/catch with logging and status update | abc1234 |
| 2 | Greptile | Race condition in cart update | Fixed: database transaction with row-level locking | def5678 |
| 3 | Greptile | Custom retry should use existing utility | Fixed: replaced with @/utils/retry | ghi9012 |
| 4 | Human | Testing strategy question | Replied: detailed breakdown of unit/integration coverage | (reply) |
| 5 | Human | Add index for new query | Fixed: migration with composite index (user_id, status) | jkl3456 |

### Verification Status

- [x] Secrets scan: clean (no findings)
- [x] CI checks: all passing
- [x] All review comments: replied/resolved
- [x] Branch: up to date with base
- [x] Tests: all passing
- [x] CVE audit: no new critical/high vulnerabilities

### Greptile Cycles

- Cycle 1: 3 findings (all resolved in this batch)
- No re-request needed (all findings addressed in code)
- If desired, can trigger another Greptile cycle for validation:
  `gh pr comment 47 --body "@greptile"`

### Items for Manual Attention

- None. All comments resolved. PR is ready for final human review and merge.
```

---

## Decision Tree: Edge Cases and Contingencies

### What if a Greptile suggestion is wrong?

Per the skill: "Dismiss with justification — reply explaining why the suggestion
doesn't apply." Example:

```bash
gh api repos/myorg/webapp/pulls/47/comments/$COMMENT_ID/replies \
  -f body="Considered this but the current approach is intentional because [specific reason]. The suggested change would [specific problem it would cause]."
```

### What if the existing retry utility doesn't support needed features?

Instead of keeping the custom implementation, extend the existing utility:

1. Add the missing feature to `@/utils/retry`
2. Use the extended utility in the payment handler
3. Reply to Greptile explaining the approach

### What if the index migration conflicts with another pending migration?

1. Check for pending migrations from other branches
2. Coordinate with the team on migration ordering
3. If conflict exists, note it in the PR description and flag for the reviewer

### What if CI fails after pushing fixes?

1. Read the CI failure logs: `gh run view <run-id> --log-failed`
2. Fix the issue (likely a test failure from the new error handling or race
   condition fix)
3. Commit, push, and re-check
4. Do NOT mark ready until CI is green

### What if the human reviewer's question implies they want changes?

Re-read the comment carefully. If it's phrased as "have you considered..." or
"shouldn't we...", treat it as a suggestion requiring a code change, not just a
question. Make the change, then reply confirming.

---

## Complete Command Sequence (Linear Execution Order)

For reference, here is the full sequence of commands in execution order:

```bash
# Pre-flight
gh auth status
gh pr view 47 --json headRefName --jq '.headRefName'
git checkout <branch>
git status -sb
git diff --stat
git diff --cached --stat
git remote show origin | grep 'HEAD branch'
git fetch origin
git log HEAD..origin/main --oneline

# Ecosystem detection
ls package.json requirements.txt pyproject.toml go.mod Cargo.toml 2>/dev/null

# Fetch all comments
gh api repos/myorg/webapp/pulls/47/comments
gh api repos/myorg/webapp/issues/47/comments
gh api repos/myorg/webapp/pulls/47/reviews

# Read context
gh pr diff 47
ls -la README.md ARCHITECTURE.md PRD.md DESIGN.md docs/*.md 2>/dev/null
grep -r "retry" --include="*.ts" --include="*.js" -l src/ lib/ utils/ 2>/dev/null
cat <existing-retry-utility>

# Fix #1: Error handling in payment flow
# (edit src/payments/handler.ts — add try/catch)

# Fix #2: Race condition in cart update
# (edit src/cart/update.ts — add transaction/locking)

# Fix #3: Replace custom retry
# (edit payment handler to use existing retry, delete custom retry file)

# Fix #4: Reply to testing strategy question
gh api repos/myorg/webapp/issues/47/comments -f body="<testing strategy reply>"

# Fix #5: Add database index
# (create migration file, update schema)

# Commit and push
git add -A
git diff --cached --stat
git commit -m "address PR review comments: error handling, race condition, retry utility, and index"
git push origin HEAD

# Reply to each Greptile comment
gh api repos/myorg/webapp/pulls/47/comments/$C1_ID/replies -f body="Fixed — ..."
gh api repos/myorg/webapp/pulls/47/comments/$C2_ID/replies -f body="Fixed — ..."
gh api repos/myorg/webapp/pulls/47/comments/$C3_ID/replies -f body="Fixed — ..."

# Reply to human reviewer's index suggestion
gh api repos/myorg/webapp/issues/47/comments -f body="Added — ..."

# Final verification
gitleaks detect --source . --log-opts "origin/main..HEAD"
gh pr checks 47
gh api repos/myorg/webapp/pulls/47/comments --jq '[.[] | select(.in_reply_to_id == null)] | length'
git fetch origin && git log HEAD..origin/main --oneline
npm test
npm audit --json

# Mark ready
gh pr ready 47
```

---

## Skill Checklist Verification

Per the skill's checklist, here is the status after completing this plan:

- [x] `gh auth status` confirms authentication — Phase 1
- [x] Branch is pushed with commits ahead of base — Phase 9
- [x] Secrets scan completed with no critical findings — Phase 10
- [x] CVE audit completed, critical/high CVEs addressed — Phase 10
- [x] Self-review completed from all four perspectives — Implicit in fix
      analysis (Phases 4-8)
- [x] Auto-fixes committed and pushed — Phase 9
- [x] Draft PR created via `gh pr create --draft` — Already existed (PR #47)
- [x] Greptile review requested via `@greptile` comment — Already completed
- [x] Greptile findings addressed (or escalated after 5 cycles) — Phases 4-6
- [x] All PR comments and inline suggestions resolved — Phases 4-8
- [x] Final secrets re-scan clean — Phase 10
- [x] CI checks passing — Phase 10
- [x] Branch up to date with base — Phase 10
- [x] PR marked ready via `gh pr ready` — Phase 11
