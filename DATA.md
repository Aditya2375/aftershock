# Daily archive and rights

AAPL and MSFT adjusted daily closes, January 3, 2007 through December 29, 2017. There are 2,767 aligned price dates and 2,766 log returns in the full window. Prices are old observations, not current quotes. Chosen short windows have their own in-window initial prices, so return counts differ by one from price counts.

## Provenance

The original data is Quandl WIKI, mirrored at a pinned [source revision](https://github.com/nickola/stock-prices-storage/blob/7a12184c3c70a66a92223c62cd70dd3dff3736b6/_example/quandl-WIKI-AAPL-MSFT.csv). `data/provenance.json` records the exact download URL and source SHA256: `2e10452b539936ef339663d437bea2c30d0a4ee45c9ea2310c7eed107b017006`. No code from that repository is used. The full source CSV stays in data/source for offline reproducibility; only the 2007-2017 wide subset is served to browsers.

The [provider's original WIKI/MSFT metadata](https://www.quandl.com/api/v3/datasets/WIKI/MSFT) describes split- and dividend-adjusted data and states:

> This data is in the public domain. You may copy, distribute, disseminate or include the data in other products for commercial and/or noncommercial purposes.

This permission applies to the data independently of this project's code license. The third-party mirror does not guarantee accuracy or later correction of adjustment values. Adjustment vintage is fixed. Do not substitute current prices into this archive or call it a live feed.

`python3 tools/prepare-data.py` verifies the pinned hash, selects `adj_close`, keeps only common dates for both stocks in 2007-2017, and writes data/prices.csv. There is no forward filling. The build copies that exact CSV to docs/data. Runtime has no external price API.

## Selection limits

Two well-known surviving technology stocks are not a market-wide or unbiased sample. Archive/window selection can change conclusions. Corporate actions, vendor errors, outliers and regime changes can affect ACF; the dashboard does not adjudicate these effects or validate stationarity. Positive magnitude dependence is not a return-direction forecast or investment advice.

Synthetic GARCH data is separate from the archive and generated locally with explicit parameters in NUMERICS.md. It is not presented as observed market data. No visitor data is imported or stored.
