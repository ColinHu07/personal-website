# Colin Hu // Personal Website

Colin Hu’s personal website — projects, experiments, and ways to connect. Pure
HTML/CSS/JS, with no build step, so it works on GitHub Pages as-is.

## The scenes (top to bottom)

1. **Boot** — arc-reactor hero with typewriter boot line. Scrolling zooms through the reactor.
2. **New York** — a wireframe holographic Earth spins with gold pings over every place
   visited (Switzerland, Mexico, Canada, China, Japan, South Korea, England, Iceland,
   France, Spain, Italy), locks onto NYC, and dives into a real, native-resolution drone
   flight through the Manhattan street canyon. A personnel-file intro panel glides over
   the footage near the end of the pass.
3. **Broadcast** — a white cursor flies in and clicks the Instagram icon; the reel
   feed blooms out of the click with three linked reels, real reel thumbnails, and a
   follow button.
4. **Project Hangar** — six holographic project bays. Bay 03 opens the scroll-driven
   CheatGPT responsible-AI demonstration.
5. **Meta Display Optics** — a physically lit Three.js product model separates into
   parallel hardware layers during a full studio turntable, reassembles, and rotates
   to the wearer side. The camera then eases through the right display into a recreated
   Poker Copilot HUD (github.com/ColinHu07/poker). No reference footage or screenshot
   is shipped.
6. **Socials** — Instagram, YouTube, GitHub, LinkedIn, email tiles.

## Edit the content

- Intro paragraph: `index.html`, search for `city-intro`.
- Reel links: `index.html`, search for `reel-card`.
- Project cards: `index.html`, search for `BAY 01` … `BAY 06`.
- Poker lens content: `index.html`, search for `lens-view`.
- Socials: `index.html`, search for `socials-grid`.
- Visited places on the globe: `script.js`, `VISITED` array.
- Drone-flight labels: `script.js`, `CITY_FLIGHT_STOPS` array.
- Parallax feel: each scrubbed scene reads a `--p` (0..1) variable set by `script.js`;
  the transforms live in `styles.css` per scene.
- Glasses geometry, materials, lighting, and camera: `glasses-product.js`.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a repository named `yourusername.github.io` (or enable Pages on any repo).
2. Push these files to the repository root.
3. Settings > Pages > deploy from the main branch.
