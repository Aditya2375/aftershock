# aftershock

[Open the live experiment](https://aditya2375.github.io/aftershock/)

A volatility-clustering workbench, with an explicit Java reference and a dependency-free browser implementation. Compare autocorrelation of signed, absolute and squared daily log returns against the same observations shuffled into a different order.

## Explore

- Two archived daily stock series: MSFT and AAPL, 2007-2017, with 2007-2009 and 2013-2017 subwindows.
- A seeded GARCH(1,1) control, generated locally with specified parameters, not fitted to market data.
- A chronological return strip with trailing 20-session root-mean-square returns. Switch it to the shuffled ordering without changing any observation.
- Three ACF plots on a shared vertical scale, at 20/40/60 lags. Inspect exact values with a keyboard-accessible slider.
- Export original/shuffled ACF values to a numeric CSV.

No trading, forecast, account, paid data, uploads, analytics or visitor-data persistence. The app fetches one bundled CSV from its own host. All calculations then run in the tab. System fonts only.

## Reproduce

Requires JDK 21+, Node 22+ and Python 3. Browser checks also need `google-chrome` on PATH.

```sh
javac -d build/classes src/aftershock/*.java tools/*.java tests/aftershock/*.java
java -cp build/classes aftershock.TestRunner
node tests/parity.mjs
python3 tools/prepare-data.py
node tools/build-web.mjs
node tests/browser-smoke.mjs
python3 -m http.server 8080 --directory docs
```

Open localhost:8080. `SMOKE_SHOTS=1 node tests/browser-smoke.mjs` saves images for separate visual review. The data preparation script works offline against a hash-pinned source archive. CI runs analytical/Java checks, fresh Java/JS full-path parity, browser behavior, data/build drift checks and narrow static security rules.

## A reproducibility fixture, not a market verdict

MSFT full archive has 2,766 returns. At lag one, signed ACF is approximately -0.059139, absolute-return ACF 0.234902 and squared-return ACF 0.151301. AAPL and subwindows produce different results. The synthetic control (seed 42) has absolute-return lag-one ACF about 0.156187; the one fixed shuffle gives 0.025269. These are descriptive sample statistics, not forecasts or significance claims.

The shuffled comparator is a single seeded Fisher-Yates permutation, **not** a confidence band, hypothesis test or proof of independence. A weak signed-return ACF can coexist with nonlinear dependence. Positive magnitude ACF cannot establish asymptotic long memory from 60 lags, identify causes, predict direction or establish a profitable strategy. Heavy tails and structural changes affect finite-sample ACF estimates. Exploring different windows is not a prespecified statistical test.

See [NUMERICS.md](NUMERICS.md) for estimator/PRNG/model conventions and [DATA.md](DATA.md) for source permissions, dates, hashes and selection limits. Code and data permissions are separate.

## Sources

- Rama Cont, [Long range dependence in financial markets](http://rama.cont.perso.math.cnrs.fr/pdf/FE05.pdf).
- Rama Cont, [Volatility Clustering in Financial Markets: Empirical Facts and Agent-Based Models](http://rama.cont.perso.math.cnrs.fr/pdf/clustering.pdf).
- [NIST sample ACF definition](https://itl.nist.gov/div898/handbook/eda/section3/eda331.htm).

This project illustrates those concepts on a different, small historical sample. It does not reproduce the papers' original empirical studies.

## License

MIT OR Apache-2.0, at your option. Full texts in LICENSE-MIT and LICENSE-APACHE. Historical data has a separate provider public-domain statement, documented in DATA.md.
