# Responsive test matrix

Written by `npm run matrix:write` on 2026-11-01. **Simulated viewports in headless Chromium on Linux: not real devices, not Safari/Firefox, no touch hardware, no screen reader.**

Checks per profile: no horizontal scroll, nothing past the right edge, headings not clipped, no visible text under 10px, buttons/inputs at least 24x24 CSS px (WCAG 2.2 target size), artwork square and >= 200px, sticky header <= 30% of the viewport height, no console errors.

| Viewport | Device class | Theme | Result | Smallest text |
|---|---|---|---|---|
| 280x653 | Galaxy Fold, folded | light | pass | 10px |
| 320x568 | iPhone SE (1st gen) | light | pass | 10px |
| 320x568 | iPhone SE (1st gen) | dark | pass | 10px |
| 344x882 | Galaxy Z Fold, cover screen | light | pass | 10px |
| 360x640 | small Android | light | pass | 10px |
| 360x800 | Android | light | pass | 10px |
| 375x667 | iPhone SE / 8 | light | pass | 10px |
| 375x812 | iPhone X / 12 mini | light | pass | 10px |
| 390x844 | iPhone 12-15 | light | pass | 10px |
| 390x844 | iPhone 12-15 | dark | pass | 10px |
| 393x852 | iPhone 15 Pro / Pixel | light | pass | 10px |
| 412x915 | Pixel / Galaxy S | light | pass | 10px |
| 414x896 | iPhone 11 / XR | light | pass | 10px |
| 430x932 | iPhone Pro Max | light | pass | 10px |
| 480x800 | large phone | light | pass | 10px |
| 540x720 | Surface Duo | light | pass | 10px |
| 600x960 | small tablet | light | pass | 10px |
| 640x360 | phone, landscape | light | pass | 10px |
| 667x375 | iPhone SE, landscape | light | pass | 10px |
| 844x390 | iPhone 12-15, landscape | light | pass | 10px |
| 768x1024 | iPad mini / iPad (portrait) | light | pass | 10px |
| 768x1024 | iPad mini / iPad (portrait) | dark | pass | 10px |
| 820x1180 | iPad Air (portrait) | light | pass | 10px |
| 834x1112 | iPad Pro 11 (portrait) | light | pass | 10px |
| 912x1368 | Surface Pro 7 | light | pass | 10px |
| 1024x768 | iPad (landscape) | light | pass | 10px |
| 1024x768 | iPad (landscape) | dark | pass | 10px |
| 1024x1366 | iPad Pro 12.9 (portrait) | light | pass | 10px |
| 1024x1366 | iPad Pro 12.9 (portrait) | dark | pass | 10px |
| 1180x820 | iPad Air (landscape) | light | pass | 10px |
| 1280x720 | HD laptop | light | pass | 10px |
| 1280x720 | HD laptop | dark | pass | 10px |
| 1280x800 | MacBook Air | light | pass | 10px |
| 1280x800 | MacBook Air | dark | pass | 10px |
| 1366x768 | common laptop | light | pass | 10px |
| 1440x900 | MacBook Pro 15 | light | pass | 10px |
| 1536x864 | Windows laptop 125% | light | pass | 10px |
| 1600x900 | HD+ monitor | light | pass | 10px |
| 1920x1080 | Full HD monitor | light | pass | 10px |
| 1920x1080 | Full HD monitor | dark | pass | 10px |
| 2560x1440 | QHD monitor | light | pass | 10px |
| 3440x1440 | ultrawide | light | pass | 10px |
