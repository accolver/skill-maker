## Summary

Adds Google OAuth2 login as an alternative authentication method, allowing users
to sign in with their Google accounts alongside the existing email/password
flow.

## Motivation

60% of beta users requested social login in our Q1 feedback survey. We chose
Google as the first provider because email domain analysis shows 80% of our
users already have Google accounts, maximizing adoption with minimal friction.

This is the first step toward a multi-provider OAuth strategy — adding GitHub
and Microsoft providers will follow the same pattern established here.

## Changes

- **OAuth2 authentication flow** (`src/auth/oauth2.ts`,
  `src/auth/providers/google.ts`): New OAuth2 client that handles the
  authorization redirect, token exchange, and callback processing. Google
  provider maps Google profile data to our user model.
- **Route integration** (`src/auth/router.ts`): Two new routes —
  `GET /auth/google` initiates the OAuth flow, `GET /auth/google/callback`
  handles the return from Google.
- **Session management** (`src/middleware/session.ts`): Extended session schema
  to store OAuth access and refresh tokens for future API calls on behalf of the
  user.
- **User model** (`src/models/user.ts`): Added `google_id`, `avatar_url`, and
  `auth_provider` fields to support OAuth users and distinguish auth methods.
- **Database migration** (`migrations/20260305_add_oauth_fields.sql`): Adds the
  three new columns to the users table. Migration is additive (no existing
  columns modified or removed).
- **Configuration** (`config/default.yaml`): New `oauth2` section with
  `client_id` and `client_secret` placeholders. Values must be set via
  environment variables in production.
- **Tests** (`tests/auth/oauth2.test.ts`): 15 new tests covering token exchange,
  profile mapping, session persistence, error handling, and duplicate account
  linking.

## Testing Instructions

1. Set up Google OAuth credentials:
   ```bash
   export GOOGLE_CLIENT_ID="your-test-client-id"
   export GOOGLE_CLIENT_SECRET="your-test-client-secret"
   ```
2. Run the migration: `npm run migrate`
3. Run the full test suite: `npm test -- --grep "oauth2"`
4. Verify all 15 tests pass
5. Start the dev server: `npm run dev`
6. Navigate to `http://localhost:3000/login`
7. Click "Sign in with Google"
8. Verify redirect to Google OAuth consent screen
9. Grant consent and verify redirect back to `http://localhost:3000/dashboard`
10. Verify user avatar appears in the top-right navigation
11. Check the database:
    `SELECT google_id, auth_provider FROM users WHERE auth_provider = 'google'`

**Edge cases to verify:** 12. Deny consent on the Google screen — verify
redirect to `/login?error=access_denied` with a user-friendly message 13. Sign
in with a Google account whose email matches an existing email/password user —
verify account linking prompt appears

### Automated Tests

- `oauth2.test.ts`: Token exchange with mocked Google API, profile mapping for
  complete and partial Google profiles, session token storage and retrieval,
  error handling for expired/invalid tokens, duplicate account detection

## Rollback Plan

1. Revert this PR: `git revert <merge-sha>`
2. Run the down migration: `npm run migrate:down 20260305_add_oauth_fields`
   - The migration is reversible — it only ADDs columns, and the down migration
     DROPs them
   - **Data impact**: Any users who signed up via Google OAuth will lose their
     `google_id` linkage. They can still reset their password to regain access
     via email/password auth.
3. Remove the environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
4. No other services depend on the new OAuth routes yet

## Reviewer Notes

- **`src/auth/oauth2.ts:34-58`** (token exchange): Verify the token validation
  logic — we validate the `id_token` signature using Google's public keys. This
  is security-critical; an invalid token could allow impersonation.
- **`src/middleware/session.ts:22-35`** (token storage): OAuth tokens are stored
  in the session. Verify the session store is encrypted at rest. Tokens in
  plaintext sessions would be a security risk.
- **`src/auth/providers/google.ts:15-28`** (profile mapping): The Google profile
  response can have missing fields (no `picture`, no `email_verified`). Verify
  the fallback handling is correct.
- **Migration**: The migration is additive only — no risk to existing data. But
  verify the `google_id` column has a UNIQUE constraint to prevent duplicate
  linkages.
