# IB MSc Finance & Accounting - Corporate Finance

Interactive tools for BUSI70597 Corporate Finance, built with Astro and Svelte in the same style as the IB PhD Macroeconomics 1 site.

Live site: https://adityapolisetty.github.io/IB-MSc-Corporate-Finance/

## Pages
- `npv-irr/` - NPV and IRR: enter cash flows, move the hurdle rate, and see when the IRR rule works, flips (financing pattern) or breaks (mixed pattern). Ported from the Streamlit app in `IB-Corporate-Finance-2025`.

## Commands
- `npm install` - install dependencies
- `npm run dev` - local preview at http://127.0.0.1:4321/
- `npm test` - check the NPV/IRR helpers (PS3 Problem 2 IRR = 8.19%)
- `npm run publish` - build with the Pages base path and push `dist/` to the `gh-pages` branch
