# Colin Hu // JARVIS Interface

A personal site styled after Iron Man's JARVIS holographic system. Pure HTML/CSS/JS —
no build step, works on GitHub Pages as-is.

## The scenes (top to bottom)

1. **Boot** — arc-reactor hero with typewriter boot line. Scrolling zooms through the reactor.
2. **New York** — a wireframe holographic Earth spins with gold pings over every place
   visited (Switzerland, Mexico, Canada, China, Japan, South Korea, England, Iceland,
   France, Spain, Italy), locks onto NYC, and the camera dives into a landmark skyline
   (One WTC, Empire State, Chrysler, Brooklyn Bridge). A "personnel file" intro panel
   slides in over the skyline (placeholder text). Park for ~2.5s and the city montage pans.
3. **Encore** — k-pop concert: spotlit holographic stage, a dance line snapping into the
   finger-gun chorus pose with strobe hits, then the whole stage pixelates away
   into an aurora afterglow.
4. **Broadcast** — a white cursor flies in and clicks the Instagram icon; the reel
   feed blooms out of the click with three linked reels + follow button.
5. **Project Hangar** — six holographic project bays. Bay 01 links to the poker build.
6. **Stark Optics** — exploded Meta glasses components fly together as you scroll,
   the assembled frames rotate, then the camera dives into the right lens revealing
   the Poker Copilot HUD (github.com/ColinHu07/poker).
7. **Socials** — Instagram, YouTube, GitHub, LinkedIn, email tiles.

## Edit the content

- Intro paragraph: `index.html`, search for `city-intro`.
- Reel links: `index.html`, search for `reel-card`.
- Project cards: `index.html`, search for `BAY 01` … `BAY 06`.
- Poker lens content: `index.html`, search for `lens-view`.
- Socials: `index.html`, search for `socials-grid`.
- Visited places on the globe: `script.js`, `VISITED` array.
- Montage stops: `script.js`, `MONTAGE_STOPS` array.
- Parallax feel: each scrubbed scene reads a `--p` (0..1) variable set by `script.js`;
  the transforms live in `styles.css` per scene.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a repository named `yourusername.github.io` (or enable Pages on any repo).
2. Push these files to the repository root.
3. Settings > Pages > deploy from the main branch.
