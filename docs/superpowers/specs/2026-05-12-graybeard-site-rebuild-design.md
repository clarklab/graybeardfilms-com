# Graybeard Films site rebuild — design

Rebuild the (hacked) graybeardfilms.com homepage and per-video pages from a screenshot capture (`index.png`) and the available cover images.

## Goals

- Vanilla HTML + CSS, no build step, no JS framework.
- Pixel-faithful enough to `index.png`: left sidebar nav, 3-column grid of 18 portrait cards.
- Each cover: grayscale by default, fades to full color on hover.
- Each card links to a standalone, linkable page that embeds the corresponding Vimeo video full-size.
- Typewriter font for nav, Public Sans everywhere else (both from Google Fonts).

## File layout

```
index.html                     # homepage (= FILMS)
contact.html                   # placeholder contact page
films/<slug>.html              # 18 video pages
styles.css                     # shared stylesheet
graybeard-logo.svg             # existing
[cover images]                 # existing, untouched
```

URLs are linkable as `/index.html`, `/contact.html`, `/films/baroness.html`, etc.

## Card data (order in grid, left→right, top→bottom)

| # | Title | Tag | Image | Slug |
|---|-------|-----|-------|------|
| 1 | The Baroness from Kaufman County | documentary | for-graybeard-website0.png | baroness |
| 2 | "The Baroness from Kaufman County" Official Trailer | documentary | graybeard-website-stills0.png | baroness-trailer |
| 3 | Graybeard Films Reel | film | vermin.png | reel |
| 4 | Onnit Stories Presents: True Wrestling | commercials | truewrestlingcropped.jpg | true-wrestling |
| 5 | Donald Cerrone: Cowboy | commercials | cover-cowboy-1.jpg | cowboy |
| 6 | Austin Bands for Bernie | event | good-bernie.png | bands-for-bernie |
| 7 | Alamo Drafthouse Presents: THE SANDLOT Ultimate Party and Actor Q&A | event | pat-2-768x1152.jpg | sandlot |
| 8 | We Spent a Weekend With Val Kilmer Watching TOMBSTONE and TOP GUN | event | ringleaderreal-768x1152.png | val-kilmer |
| 9 | SuperHyperCube: The Retro-Futurist VR Game 7 Years in the Making | documentary | cover-superhyper.jpg | superhypercube |
| 10 | Joe Rogan: Be The Hero of Your Own Movie | commercials | cover-joe-hero.jpg | joe-rogan-hero |
| 11 | NFL DB WEEK Recap ft. NFL's Elite | documentary | kennycrop5-768x1152.jpg | nfl-db-week |
| 12 | Harum Skarum | film | cover-harum.jpg | harum-skarum |
| 13 | Marvel Hero Elite Series – Iron Man Kettlebell | commercials | cover-kettlebell.jpg | iron-kettlebell |
| 14 | Ringo Deathstarr – Stare at the Sun | music-video | cover-ringo.jpg | ringo-deathstarr |
| 15 | Marvel Hero Elite Series – Captain America Shield Barbell Weight Plates | commercials | cover-capt.jpg | captain-shield |
| 16 | Joe Rogan on Happiness | commercials | cover-joe-happiness-1.jpg | joe-happiness |
| 17 | House Bill 2 | documentary | cover-house-2.jpg | house-bill-2 |
| 18 | Luke Phelps-Roper | documentary | cover-house-1.jpg | luke-phelps-roper |

## Visual design

### Typography
- **Nav (sidebar links):** Special Elite from Google Fonts. Small caps via `text-transform: uppercase`, letter-spacing ~0.15em.
- **Everything else:** Public Sans from Google Fonts. Weight 400 for body, 500–600 for titles.

### Sidebar
- Fixed left, ~120px wide, full viewport height, white background.
- Logo at top (~40px below top edge), sized to ~60px wide (matches SVG default).
- Below logo: `FILMS` and `CONTACT` links stacked, vertically spaced, small uppercase letter-spaced typewriter style.

### Grid
- 3 columns, ~32px gap, generous outer padding (~48px sides, ~48px top/bottom of main area).
- Main area is `margin-left: 120px` (room for sidebar).
- Each card occupies one cell.

### Card
- Image: `aspect-ratio: 3 / 4`, `object-fit: cover`, `filter: grayscale(100%)`, transitions `filter` over 400ms ease.
- On `:hover` (or focus within), `filter: grayscale(0)`.
- Title below image: Public Sans, ~14–15px, dark gray, line-height ~1.4. Two lines OK (titles wrap).
- Tag below title: black pill `padding: 4px 10px`, white Public Sans ~11px, lowercase with leading `#`. Inline-block.
- Whole card is a single `<a>` so the entire surface is clickable. No underline. Title color stays consistent on hover.

### Hover state details
- Grayscale → color transition on image (400ms).
- Cursor pointer over whole card.
- No card-level scale/shadow. Keep it minimal to match the capture.

## Video pages

Layout:
- Same fixed sidebar (logo + nav).
- Main column: small "← Films" back link, then category pill, then title (Public Sans, ~28px, weight 600), then 16:9 responsive Vimeo `<iframe>` (max-width 1200px, full available width below that).
- Iframe uses `loading="lazy"`, `allow="autoplay; fullscreen; picture-in-picture"`, `allowfullscreen`.
- Placeholder Vimeo ID across all 18 pages: a known public Vimeo demo video. Swappable per file later by editing the `src`.

## Contact page

Same sidebar. Main: "Contact" title in Public Sans, then a placeholder email line and city line. To be replaced with real info by the user.

## Responsive

- `>= 900px`: layout as described.
- `< 900px`: sidebar collapses to a horizontal top bar (logo left, nav links inline right). Main area's left margin drops to 0. Grid → 2 columns.
- `< 600px`: grid → 1 column.

## Out of scope

- No filtering or search.
- No JS.
- No analytics, SEO tags beyond basic `<title>`/`<meta description>`.
- No favicon (could be added trivially later from the logo SVG).
- No actual Vimeo IDs — placeholder only.

## Risks / open items

- Slug stability: if user ever wants real Vimeo URLs to redirect to these pages, the slugs above lock the URL shape. Picked them for readability.
- Pink Baroness posters become light gray under `grayscale(100%)`. Confirmed acceptable — uniform treatment beats per-card exception.
