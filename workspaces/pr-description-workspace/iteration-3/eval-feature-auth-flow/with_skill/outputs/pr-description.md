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
- **Data model** (`src/models/user.ts`,
  `migrations/20260305_add_oauth_fields.sql`): Added `google_id`, `avatar_url`,
  and `auth_provider` fields. Migration is additive only — no existing columns
  modified.
- **Configuration** (`config/default.yaml`): New `oauth2` section with
  `client_id` and `client_secret` placeholders.
- **Tests** (`tests/auth/oauth2.test.ts`): 15 new tests covering token exchange,
  profile mapping, session persistence, error handling, and duplicate account
  linking.

## Testing Instructions

1. Set up test OAuth credentials:
   ```bash
   export GOOGLE_CLIENT_ID="your-test-client-id"
   export GOOGLE_CLIENT_SECRET="your-test-client-secret"
   ```
2. Run the migration: `npm run migrate`
3. Run the OAuth test suite: `npm test -- --grep "oauth2"`
4. Verify all 15 tests pass
5. Start the dev server: `npm run dev`
6. Navigate to `http://localhost:3000/login`
7. Click "Sign in with Google"
8. Verify redirect to Google OAuth consent screen
9. Grant consent and verify redirect back to `http://localhost:3000/dashboard`
   with user avatar in the top-right navigation

**Edge case — consent denied:** 10. Open an incognito window, navigate to
`http://localhost:3000/login` 11. Click "Sign in with Google", then click
"Cancel" on the Google consent screen 12. Verify redirect to
`http://localhost:3000/login?error=access_denied` 13. Verify a user-friendly
error message appears (not a raw OAuth error)

**Edge case — duplicate account:** 14. Create a user with email `test@gmail.com`
via email/password registration 15. Sign in with a Google account that uses
`test@gmail.com` 16. Verify an account linking prompt appears (not a duplicate
key error)

### Automated Tests

- `oauth2.test.ts`: Token exchange with mocked Google API, profile mapping for
  complete and partial profiles, session token storage, error handling for
  expired/invalid tokens, duplicate account detection, consent denial handling

## Rollback Plan

1. Revert this PR: `git revert <merge-sha>`
2. Run the down migration: `npm run migrate:down 20260305_add_oauth_fields`
   - The migration is reversible — it only ADDs columns, the down migration
     DROPs them
   - **Data impact**: Users who signed up via Google OAuth will lose their
     `google_id` linkage. They can reset their password to regain access via
     email/password.
3. Remove environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
4. No other services depend on the new OAuth routes yet

## Reviewer Notes

- **`src/auth/oauth2.ts:34-58`** (token exchange): Security-critical — verify
  the `id_token` signature validation using Google's public keys. Invalid token
  acceptance could allow impersonation.
- **`src/middleware/session.ts:22-35`** (token storage): OAuth tokens stored in
  session. Verify session store is encrypted at rest — plaintext tokens are a
  security risk.
- **`src/auth/providers/google.ts:15-28`** (profile mapping): Google profile
  responses can have missing fields. Verify fallback handling for missing
  `picture` and `email_verified`.
- **Migration**: Verify `google_id` column has a UNIQUE constraint to prevent
  duplicate linkages.
