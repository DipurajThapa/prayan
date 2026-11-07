# Auth testing (Prayan)
## Email/password (JWT httpOnly cookies)
curl -c c.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"dipurajthapa1@gmail.com","password":"PrayanOwner-CTXK8bko"}'
curl -b c.txt $API/api/auth/me
Bearer access token also accepted: Authorization: Bearer <access_token cookie value>
5 failed logins per ip:email => 429 lockout 15 min.

## Emergent Google auth (allow-listed owner emails only)
Create test session in mongo (DB test_database): users {user_id, email:'dipurajthapa1@gmail.com', role:'owner'} already exists (seeded) — insert user_sessions {user_id:<that user_id>, session_token:'test_session_x', expires_at: now+7d}.
Then: curl -H "Authorization: Bearer test_session_x" $API/api/admin/stats
Browser: add cookie session_token (httpOnly, secure, sameSite None) and open /dashboard.
Non-owner users get 403 on /api/admin/*.
Clean up: db.user_sessions.deleteMany({session_token:/test_session/})
