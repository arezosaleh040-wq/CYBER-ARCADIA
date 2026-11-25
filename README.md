# CYBER ARCADIA

A Persian (RTL), neon-themed arcade hub built as a static website.

## Stack
- HTML5 for structure and accessibility
- CSS for layout, effects, responsive behavior, and reduced-motion support
- Vanilla JavaScript for game logic, canvas rendering, audio, and local high scores

## Run locally
Open `index.html` in a modern browser, or serve this directory with any static HTTP server.

## Deploy with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select branch `main` and folder `/(root)`, then save.
4. Wait for the Pages deployment workflow to finish.

## Security and privacy
- High scores and the music preference are stored locally in the visitor's browser. They are not sent to a server.
- Storage access is guarded so browser privacy settings do not prevent the games from loading.
- External links opened in a new tab use `noopener noreferrer`.
- Never commit API keys, passwords, or private tokens to this public repository.
- GitHub Pages serves static files only. It does not execute Python or Java server code. A Python/Java backend requires separate server hosting.

## Performance and accessibility
- Background animation pauses when the page is hidden and is disabled for users who prefer reduced motion.
- The page includes a keyboard skip link and visible keyboard focus.
- Game controls support touch and keyboard where implemented.
