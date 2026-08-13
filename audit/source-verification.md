# Initial Source Verification Notes

## Official documentation reviewed

| Source | Official reference | Verified finding |
|---|---|---|
| OpenAlex | https://developers.openalex.org/api-reference/introduction | The REST API is available at `https://api.openalex.org`; the documentation states it can be used without a key, while a free key raises the daily budget. Works are returned through `/works`, and OpenAlex data is CC0. |
| arXiv | https://info.arxiv.org/help/api/index.html | arXiv provides public API access for interoperability. Independent noncommercial/open-access educational projects may use it subject to API terms and should acknowledge arXiv data usage. |
| Europe PMC | https://europepmc.org/RestfulWebService | The REST service supports JSON/XML search at `https://www.ebi.ac.uk/europepmc/webservices/rest/search`; the documentation identifies an open-access subset and full-text XML for the OA subset. |
| Zenodo | https://developers.zenodo.org/ | Zenodo documents a REST API for searching published records and downloading files. Deposit-management endpoints require authentication; this project uses only public record search and published-file links. |

## Implementation implications

The source registry records provider category, API endpoint, rights status, license, adapter, enablement, and direct-download capability. Metadata-only providers remain searchable but do not receive a direct download URL. Direct files are only emitted when the source record provides an open-access/public-domain file link; the existing Zamifu proxy continues to stream approved files in-site.

## Planned initial batch

The registry now contains the existing book sources plus arXiv, Europe PMC, PubMed Central, Crossref, OpenAlex, DOAJ, Zenodo, CORE, OAPEN, and additional Kenyan/African/institutional entries. Active research adapters currently cover arXiv, Europe PMC, Crossref, OpenAlex, DOAJ, Zenodo, and optional CORE when `CORE_API_KEY` is configured. Existing adapters cover Internet Archive, Open Library, Project Gutenberg, OpenStax, DOAB, AJOL, KICD, and KNEC. Restricted or unverified sources are retained only as policy/registry records and are not expanded into unauthorized download paths.
