# Living Globe

The globe shows the real day and night for the current time, with Bangladesh and Finland outlined in white and the cities Dhaka and Helsinki marked. Drag sideways to turn it, use the + and − buttons (or hold Ctrl and scroll, or pinch on a phone) to zoom.

## Show or hide the globe
Open `src/App.tsx`, find `SHOW_LIVING_GLOBE` and set it to `true` (show) or `false` (hide). The globe is loaded only when it is shown, so hiding it costs nothing.

## The Earth images
The realistic Earth uses three images in `public/textures/`:

| File | Content |
|---|---|
| `earth-daymap-2k.jpg` | daytime colours |
| `earth-nightmap-2k.jpg` | city lights |
| `earth-clouds-2k.jpg` | clouds (grey on black, used as an opacity map) |

When all three files are present at build time, the credit line "Textures: Solar System Scope (CC BY 4.0), based on NASA Blue Marble." appears under the globe automatically. Keep it: the licence requires the credit. If a file is missing, the globe draws a simple Earth by code instead and nothing is requested from the server.

No image is loaded from another website: everything comes from your own site, which keeps the strict security policy and your visitors' privacy.

## Borders
`src/components/LivingGlobe/data/borders.ts` holds the outlines of Bangladesh and Finland (Natural Earth, public domain, 1:50m, rounded to 0.01 degree).

## Day and night
The Sun's position is calculated in `src/components/LivingGlobe/astronomy/sunPosition.ts` and checked by `npm run test:unit`. The shading uses the Earth-fixed Sun direction, so it stays correct however the globe is turned.

## Tests
`npm run test:e2e` checks that the globe loads without console errors, that the three images are served, that zoom and drag change the view, and that only your own site is contacted.
