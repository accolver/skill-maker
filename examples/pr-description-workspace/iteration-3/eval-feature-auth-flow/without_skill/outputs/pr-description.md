## PR Description

This PR adds Google OAuth2 login to the application.

### Changes

- Added `src/auth/oauth2.ts` — OAuth2 client setup and token exchange
- Added `src/auth/providers/google.ts` — Google profile mapping
- Modified `src/auth/router.ts` — added OAuth routes
- Modified `src/middleware/session.ts` — extended session for OAuth tokens
- Modified `src/models/user.ts` — added google_id, avatar_url, auth_provider
  fields
- Added `migrations/20260305_add_oauth_fields.sql` — database migration
- Added `tests/auth/oauth2.test.ts` — 15 new tests
- Modified `config/default.yaml` — added oauth2 config section

### How to test

Run the tests with `npm test`. You can also test manually by setting up Google
OAuth credentials and trying the login flow.

### Notes

This is a new feature that adds social login. The existing email/password
authentication is unchanged.
