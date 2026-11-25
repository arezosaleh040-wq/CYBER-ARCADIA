# CYBER-ARCADIA PHP + MySQL backend

This backend is separate from GitHub Pages. GitHub Pages serves static files only and cannot execute PHP or host MySQL. Deploy the backend on a PHP 8.1+ host with MySQL 8+ and PDO MySQL enabled.

## Contents
- api/index.php — JSON API, password-hash authentication, session cookies, CSRF token, score submission, leaderboard and admin endpoints.
- config.example.php — copy to config.php on the PHP server and enter credentials there. Never commit real credentials.
- database/schema.sql — database, users, games and scores tables.
- ../admin/index.html — command-center dashboard scaffold.

## Deployment
1. Create a MySQL database and a restricted database user.
2. Import database/schema.sql in phpMyAdmin or the host SQL console.
3. Upload the backend directory to your PHP host over HTTPS.
4. Copy config.example.php to config.php on the server only. Set database credentials and allowed_origin to https://arezosaleh040-wq.github.io. Keep secure_cookies true when using HTTPS.
5. The API endpoint URL should point to api/index.php. Requests use the route query parameter, for example api/index.php?route=health.
6. Register an account through the API, then grant admin access once in the SQL console: UPDATE users SET role='admin' WHERE username='YOUR_USERNAME';
7. Open the GitHub Pages /admin/ page and save the API endpoint URL.

## API routes
GET: health, csrf, me, leaderboard, admin/overview, admin/games
POST: register, login, logout, scores, admin/games
Mutating requests require the CSRF token returned by GET csrf in the X-CSRF-Token header. Browser requests must include credentials.

## Security and current limitations
- Use HTTPS, keep config.php and all credentials off Git, back up the database, and limit DB privileges.
- Grant admin role only from the private SQL console; there is no public admin-promotion route.
- Configure host-level rate limiting and monitor server logs before public launch.
- The frontend's existing localStorage score system has not yet been migrated to this API.
- The AI module is a planned server-side integration, not active yet; never put an AI API key in browser code.
- The PHP code and dashboard are scaffolding committed to the repository. They are not live until deployed to a PHP/MySQL host and tested against a real database.
