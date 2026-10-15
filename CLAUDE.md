# Mito Admin

Admin portal (React client, Express + SQLite server). Growth modules: Promo Codes (`server/promo/`), Bonus Schemes and the one customer bonus wallet (`server/bonus/`), Referral (`server/referral.js`, wired to Bonus only through `server/referralHost.js`).

## Rewards contract tests

The Promo, Bonus and Referral modules are implemented and working. Their rules are pinned by contract tests in `server/tests/contracts/` (`promo`, `bonus`, `referral`, `independence`) and, for admin-panel rules, `tests/e2e/rewards_contract.spec.js`.

- Before changing promo, bonus or referral code, run `npm run test:contracts --prefix server`. Run it again before you commit.
- When a contract fails, read the `CONTRACT <id> BROKEN` block at the top of the failure. It says which rule broke, why the rule exists, how it is implemented and which files hold it. Restore the implemented behaviour in the code. Do not edit the test to make it pass.
- Only change a contract if the product owner (Mohammad) has explicitly changed the rule. In that case update the test, its `why` / `fix` / `where` text and the matching spec in `Docs/Requirements/` in the same PR, and state the reason in the PR description.
- Keep the modules independent: no direct imports between `promo/`, `bonus/` and `referral*`; cross-module wiring goes through ports in the host (`server/server.js`, `server/referralHost.js`). Each module receives transfer events on its own endpoint.
