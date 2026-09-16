---
name: edgar-filings
description: Use when researching US public-company SEC filings (10-K, 10-Q, 8-K). Uses SEC EDGAR data.sec.gov APIs with a proper User-Agent.
---

# EDGAR filings research

## Rules
- SEC requires a descriptive User-Agent: `ResearchAgent/0.1 (ivanleomk@gmail.com)`
- Be polite: ≤10 requests/second; prefer fewer.
- Do not scrape HTML indexes when JSON APIs exist.

## Workflow
1. Resolve ticker → CIK via company tickers JSON:
```bash
curl -s -A "ResearchAgent/0.1 (ivanleomk@gmail.com)" \
  "https://www.sec.gov/files/company_tickers.json" -o out/raw/company_tickers.json
```
CIK is zero-padded to 10 digits.

2. Submissions for a company:
```bash
curl -s -A "ResearchAgent/0.1 (ivanleomk@gmail.com)" \
  "https://data.sec.gov/submissions/CIKXXXXXXXXXX.json" -o out/raw/edgar-submissions.json
```

3. Pick recent `10-K` / `10-Q` / `8-K` from `filings.recent` (form, filingDate, accessionNumber, primaryDocument).

4. Fetch filing document only if needed for quotes:
`https://www.sec.gov/Archives/edgar/data/{cik}/{accession-no-dashes}/{primaryDocument}`

## Output
- List filings table: form, date, accession, URL
- For a deep dive: extract section headings / Item 1A risks as bullets with quotes ≤40 words
- Never invent financial numbers not in the filing
