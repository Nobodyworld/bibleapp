# Retained Data Licenses

This private publish package currently includes reader code, local user-data tools, and retained Bible text editions only. Commentary, cross-references, footnotes, Strong's overlays, interlinear data, lexicon chunks, outlines, generated search shards, and generated analysis/provenance dumps are not packaged in `app/data`.

The machine-readable retained-data matrix is `data/license-matrix.json`.

## Retained Text Editions

| ID | Edition | Status | Public redistribution | Commercial sale | Source / note |
| --- | --- | --- | --- | --- | --- |
| `bsb` | Berean Study Bible | Public domain text per Berean Bible notice | Allowed | Allowed | Berean Bible states the Berean Bible and Majority Bible texts were placed into the public domain as of April 30, 2023: https://berean.bible/licensing.htm |
| `web` | World English Bible | Public domain text; `World English Bible` is a trademark | Allowed | Allowed | eBible states the WEB text is public domain and may be copied, distributed, and sold, but changed text should not be called World English Bible: https://ebible.org/eng-web/copyright.htm |
| `kjv` | King James Version | Public domain in the United States; UK Crown/prerogative restrictions may apply | Allowed in the United States | Allowed in the United States | Treat UK publication/distribution separately before public or commercial UK release. |
| `asv` | American Standard Version | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical 1901 translation. |
| `erv` | English Revised Version | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical 1881-1885 translation. |
| `wbt` | Webster Bible Translation | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical 1833 translation. |
| `dbt` | Darby Bible Translation | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical 1890 translation. |
| `drb` | Douay-Rheims Bible | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical English Catholic translation. |
| `slt` | Smith's Literal Translation | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical 19th-century translation. |
| `ylt` | Young's Literal Translation | Public domain in the United States | Allowed in the United States | Allowed in the United States | Historical 1862/1898 translation. |

## Not Currently Packaged

The following data categories were intentionally removed from this publish package and should not be restored until a source-specific row is added to `data/license-matrix.json` and this file:

- Commentaries.
- Cross-references and Treasury-style reference data.
- Footnotes from non-retained sources.
- Strong's overlays, lexicon data, morphology, and interlinear datasets.
- Outlines.
- Generated search, graph, word-map, performance, recovery, and provenance artifacts derived from removed datasets.

Licensed material may be restored for private use if its terms are recorded. If a source forbids public redistribution, commercial use, or sale as part of the app, mark that directly in the matrix before packaging it.

## Publishing Rule

Before making a repository public or selling/distributing the app, verify every packaged dataset has:

- `license_status`
- `source_url`
- `public_redistribution`
- `commercial_use`
- `sale_with_app`
- `required_attribution`
- `notes`

If any packaged dataset is `private_only`, `noncommercial_only`, `unclear`, or `restricted`, do not publish or sell that package until the restriction is resolved or the dataset is removed.
