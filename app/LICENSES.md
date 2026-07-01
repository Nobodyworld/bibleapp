# Retained Data Licenses

This package includes reader code, local user-data tools, retained Bible text editions, Strong's/lexicon study data, commentary, cross references, BSB footnotes and presentation metadata, interlinear data, outlines, language metadata, semantic seeds, generated search shards, word maps, and graph analysis.

The machine-readable retained-data matrix is `data/license-matrix.json`. Presence in the package does not establish public redistribution or commercial-sale clearance.

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

## Packaged Data Requiring Review

The following packaged categories require explicit source/provenance or legal review before public or commercial distribution:

- Strong's overlays and Hebrew/Greek lexicon aggregations.
- Commentary, cross-reference, outline, BSB footnote, and BSB presentation records.
- Hebrew/Greek interlinear data and generated search/analysis artifacts whose clearance depends on their inputs.
- Hebrew/Greek alphabet and mark metadata.

Performance reports, recovery reports, and provenance work products are not runtime feature packs. Licensing/provenance details for packaged data are tracked in `data/license-matrix.json` as written record metadata.

## Study Data With Recorded Provenance Notes

| ID | Dataset | Status | Public redistribution | Commercial sale | Source / note |
| --- | --- | --- | --- | --- | --- |
| `bsb-strongs-overlay` | Reader Strong's overlay mappings | Source rights unclear; private package only pending review | Unclear | Unclear | Generated from local extracted study data. Bible Hub terms reference: https://biblehub.com/terms.htm |
| `hebrew-lexicon` | Hebrew Strong's/BDB-style lexicon chunks | Mixed historical material; aggregation rights unclear | Unclear | Unclear | Explicit source-chain review required. |
| `greek-lexicon` | Greek Strong's/Thayer-style lexicon chunks | Mixed historical material; aggregation rights unclear | Unclear | Unclear | Explicit source-chain review required. |

## Record-Keeping Fields

Each packaged dataset should keep these metadata fields filled:

- `license_status`
- `source_url`
- `public_redistribution`
- `commercial_use`
- `sale_with_app`
- `required_attribution`
- `notes`

These fields are retained for documentation and provenance tracking.
