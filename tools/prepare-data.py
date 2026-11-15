"""Regenerate the demo subset from the pinned public-domain WIKI archive.
No network request is made. The source CSV is versioned for reproducibility.
"""
import csv, hashlib, json
from pathlib import Path
source = Path('data/source/quandl-WIKI-AAPL-MSFT.csv')
meta = json.loads(Path('data/provenance.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest() == meta['sourceSha256'], 'source hash mismatch'
by_date = {}
for row in csv.DictReader(source.open()):
    if '2007-01-01' <= row['date'] <= '2017-12-31':
        target = by_date.setdefault(row['date'], {})
        assert row['ticker'] not in target, 'duplicate source row'
        target[row['ticker']] = float(row['adj_close'])
common = sorted(d for d, v in by_date.items() if all(t in v for t in meta['tickers']))
assert len(common) == meta['observations']
assert (common[0], common[-1]) == (meta['start'], meta['end'])
with Path('data/prices.csv').open('w', newline='') as file:
    writer = csv.writer(file, lineterminator='\n')
    writer.writerow(['date', *meta['tickers']])
    for date in common:
        writer.writerow([date, *(by_date[date][t] for t in meta['tickers'])])
print(f'{len(common)} aligned prices per asset regenerated from pinned source')
