# Auth testing (Prayan)

Credentials are NOT stored here. Read them from `backend/.env`
(`ADMIN_EMAIL` / `ADMIN_PASSWORD`) or export them to your shell first:

    export ADMIN_EMAIL=... ADMIN_PASSWORD=...

## Email/password (JWT httpOnly cookies)
curl -c c.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
curl -b c.txt $API/api/auth/me
Bearer access token also accepted: Authorization: Bearer <access_token cookie value>
5 failed logins per ip:email => 429 lockout 15 min.

## Emergent Google auth (allow-listed owner emails only)
Owner emails are allow-listed via `OWNER_EMAILS` in `backend/.env`.
Create test session in mongo (DB from DB_NAME): users {user_id, email:<owner email>, role:'owner'} already exists (seeded) — insert user_sessions {user_id:<that user_id>, session_token:'test_session_x', expires_at: now+7d}.
Then: curl -H "Authorization: Bearer test_session_x" $API/api/admin/stats
Browser: add cookie session_token (httpOnly, secure, sameSite None) and open /dashboard.
Non-owner users get 403 on /api/admin/*.
Clean up: db.user_sessions.deleteMany({session_token:/test_session/})
