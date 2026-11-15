# Glass Wallet

An offline money tracker where your monthly budget is a glass of liquid. Spend and the
liquid sinks; tilt the phone and it sloshes. No account, no network, nothing leaves the phone.

- Web: https://jerrynifemi72y6.github.io/glass-wallet/
- APK: https://jerrynifemi72y6.github.io/glass-wallet/GlassWallet.apk

## How it is built

Vite + vanilla JS + Canvas 2D. The liquid is a row of coupled springs (`src/liquid.js`).
Menu switches use a ColorOS-style directional transition with staged content.
A service worker (`public/sw.js`) makes the web build installable and fully offline.

`npm run build` produces `dist/`, which GitHub Actions publishes to Pages.
The Android APK is built from the same `dist/` by Capacitor in GitHub Actions.

`public/GlassWallet.apk` is a copy of the current release APK so it can be downloaded
directly from Pages (no redirects). Replace it when a new APK is released.
