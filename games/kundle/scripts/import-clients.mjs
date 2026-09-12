import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasUnknownData } from './client-completeness.mjs';
import { classify } from './classify.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(readFileSync(resolve(root, 'src/data/customer_vectors.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(resolve(root, 'scripts/location-overrides.json'), 'utf8'));
const gazetteerPath = process.argv[2];
if (!gazetteerPath) throw new Error('Usage: node scripts/import-clients.mjs <cities500.txt> [--write]');

const countries = {
  Norway: 'NO', Sweden: 'SE', Denmark: 'DK', Finland: 'FI', Iceland: 'IS',
  Switzerland: 'CH', 'United Kingdom': 'GB', 'United States': 'US', Belgium: 'BE',
  Germany: 'DE', France: 'FR', Australia: 'AU', Estonia: 'EE', Spain: 'ES',
  Luxembourg: 'LU', Italy: 'IT', Romania: 'RO', Netherlands: 'NL', Russia: 'RU', Canada: 'CA',
};
const footprints = { local: 'Local', regional: 'Regional', national: 'National', international: 'International', global: 'Global' };
const normalize = text => text.normalize('NFKC').toLowerCase().trim();
const gazetteerFiles = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
const places = [...new Map(gazetteerFiles.flatMap(filename => readFileSync(filename, 'utf8').split('\n').filter(Boolean).map(line => {
  const fields = line.split('\t');
  return {
    id: fields[0], name: fields[1], ascii: fields[2], aliases: fields[3].split(','),
    latitude: Number(fields[4]), longitude: Number(fields[5]), country: fields[8],
    state: fields[10], population: Number(fields[14]), feature: fields[7], featureClass: fields[6],
  };
})).filter(place => place.featureClass === 'P').map(place => [place.id, place])).values()];

const unresolved = [];
const locationCache = new Map();
function locate(headquarters) {
  if (locationCache.has(headquarters)) return locationCache.get(headquarters);
  const parts = headquarters.split(',').map(part => part.trim());
  const city = normalize(parts[0]);
  const country = countries[parts.at(-1)];
  let candidates = city === 'unknown' ? [] : places.filter(place =>
    place.country === country &&
    (country !== 'US' || parts.length < 3 || place.state === parts[1]) &&
    [place.name, place.ascii, ...place.aliases].some(name => normalize(name) === city),
  );
  const primary = candidates.filter(place => normalize(place.name) === city || normalize(place.ascii) === city);
  if (primary.length) candidates = primary;
  const match = candidates.length === 1 ? candidates[0] : null;
  if (!match) unresolved.push({ headquarters, candidates: candidates.map(({ id, name, country, population, latitude, longitude }) => ({ id, name, country, population, latitude, longitude })) });
  locationCache.set(headquarters, match);
  return match;
}

const clients = source.companies.map(company => {
  const override = overrides[company.name];
  const place = locate(override?.location ?? company.headquarters);
  const footprint = footprints[company.footprint];
  if (!footprint) throw new Error(`Invalid footprint: ${company.name}`);
  if (!Number.isInteger(company.employees) || company.employees < 1) throw new Error(`Invalid headcount: ${company.name}`);
  if (company.ConsultantsCurrentlyHere !== null && (!Number.isInteger(company.ConsultantsCurrentlyHere) || company.ConsultantsCurrentlyHere < 0)) throw new Error(`Invalid staffing: ${company.name}`);
  const clientSince = company.customerSince ? Number(company.customerSince.slice(0, 4)) : null;
  if (clientSince !== null && !Number.isInteger(clientSince)) throw new Error(`Invalid year: ${company.name}`);
  const classification = classify(company);
  return {
    id: company.name,
    name: company.name,
    headcount: company.employees,
    headcountAccuracy: company.employees_accuracy,
    clientSince,
    customerSince: company.customerSince,
    headquarters: company.headquarters,
    ...(override ? {
      coordinateLocation: override.location,
      coordinateLocationBasis: override.basis,
      coordinateLocationSource: override.source,
    } : {}),
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    coordinateAccuracy: place ? 'city-centre' : 'unknown',
    coordinateSource: place ? `https://www.geonames.org/${place.id}/` : null,
    industry: company.industry,
    sector: company.sector,
    country: company.country,
    tags: company.tags,
    operatingFootprint: footprint,
    consultantsCurrentlyHere: company.ConsultantsCurrentlyHere,
    similarityIndustry: classification.similarityIndustry,
    ownership: classification.ownership,
    customerOrientation: classification.customerOrientation,
    regulatoryCharacter: classification.regulatoryCharacter,
  };
}).filter(client => !hasUnknownData(client));

if (new Set(clients.map(client => client.id)).size !== clients.length) throw new Error('Duplicate client IDs');
console.log(JSON.stringify({ records: clients.length, located: clients.filter(client => client.latitude !== null).length, unresolved }, null, 2));
if (process.argv.includes('--write')) {
  const output = `import type { Client } from '../types';\n\nexport const COORDINATE_ATTRIBUTION = {\n  name: 'GeoNames',\n  url: 'https://www.geonames.org/',\n  license: 'https://creativecommons.org/licenses/by/4.0/',\n};\n\nexport const ALL_CLIENTS: Client[] = ${JSON.stringify(clients, null, 2)};\n\nexport const ELIGIBLE_TARGET_CLIENTS: Client[] = ALL_CLIENTS;\n`;
  writeFileSync(resolve(root, 'src/data/clients.ts'), output, 'utf8');
}