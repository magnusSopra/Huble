# Kundle

Daily client guessing game built with React, TypeScript and Vite.

## Customer data

`src/data/customer_vectors.json` is the original, unchanged input. The app uses
explicit typed records in `src/data/clients.ts`, produced by
`scripts/import-clients.mjs`. The source contains 599 clients; the playable dataset
contains 478 complete records. Entries containing case-insensitive `unknown` text
or null values in any field are excluded. Vectors are omitted from the browser bundle.

- Employees: the supplied total company headcount, including its accuracy label.
  The exact number is displayed; only exact counts score green. Unequal counts
  in the same or adjacent size bands score orange, and farther bands grey.
- Sopra staff: the supplied `ConsultantsCurrentlyHere` count. Exact counts score
  green, a difference of up to five orange, otherwise grey. Zero is valid.
- Since: earliest recorded project year, not necessarily contract commencement.
  Entries with missing dates are excluded; these internal dates cannot be reliably
  filled from public company information.
- Locations: all playable records have approximate WGS84 city-centre coordinates.
  Entries with unresolved locations are excluded. Distances use
  the Haversine formula; companies in the same mapped city have zero distance.

Coordinate data is from [GeoNames](https://www.geonames.org/), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Coordinates are matched
to the supplied headquarters city and country using the `cities500` and Norway
gazetteers. Ambiguous names are left unresolved. This is not office-address
geocoding or independent verification of every supplied headquarters. The importer
applies the same completeness filter on every run. Changing the client list also
changes the deterministic daily answer.

`scripts/location-overrides.json` records sourced location refinements. SalMar
uses its published HQ locality, Skygard its published office city, and Iteam,
Fjellsport and Pearl Group their registered business-address cities from
[Brønnøysundregistrene](https://data.brreg.no/enhetsregisteret/api/dokumentasjon/index.html)
([NLOD 2.0](https://data.norge.no/nlod/no/2.0)). The original HQ strings and both
headcounts are preserved. Each override retains its source URL and location basis;
registered offices are not claimed to be operational headquarters.

## Refresh and validate

Download and extract `cities500.zip` and `NO.zip` from the
[GeoNames daily dump](https://download.geonames.org/export/dump/). From this folder:

```sh
node scripts/import-clients.mjs /path/to/cities500.txt /path/to/NO.txt --write
npm run test:data
npm run build
npm run lint
npm run dev
```

Omit `--write` to preview coverage and unresolved candidates. The output depends
on the downloaded gazetteer snapshot. All lookups are performed at import time;
the game makes no external geocoding requests.

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
