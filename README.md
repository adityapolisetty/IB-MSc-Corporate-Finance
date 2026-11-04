# IB MSc Finance & Accounting - Corporate Finance

Interactive tools for BUSI70597 Corporate Finance, built with Astro and Svelte in the same style as the IB PhD Macroeconomics 1 site.

Live site: https://adityapolisetty.github.io/IB-MSc-Corporate-Finance/

## Pages
- `npv-irr/` - NPV and IRR: enter cash flows, move the hurdle rate, and see when the IRR rule works, flips (financing pattern) or breaks (mixed pattern). Ported from the Streamlit app in `IB-Corporate-Finance-2025`.
- `leverage/` - Debt makes equity riskier: one V_D slider moves the cash flows to debt and equity in the up and down states, the returns, r_E and WACC; a switch adds a 20% corporate tax (Tutorial 4, Recap 4 and 5).

## Commands
- `npm install` - install dependencies
- `npm run dev` - local preview at http://127.0.0.1:4321/
- `npm test` - check the NPV/IRR helpers (PS3 Problem 2 IRR = 8.19%) and the leverage helpers (Recap 4: r_E = 15%; Recap 5: WACC = 9.5%)
- `npm run publish` - build with the Pages base path and push `dist/` to the `gh-pages` branch
