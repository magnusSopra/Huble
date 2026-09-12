import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { hasUnknownData } from './client-completeness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { ALL_CLIENTS } = await server.ssrLoadModule('/src/data/clients.ts');
  const { compareCompanySize, compareSopraStaff, compareClientSince, compareOperatingFootprint, compareSimilarity, compareLocation, compareGuess } = await server.ssrLoadModule('/src/game/compare.ts');
  const { SIMILARITY_MAX_SCORE } = await server.ssrLoadModule('/src/game/config.ts');
  const source = JSON.parse(readFileSync(new URL('../src/data/customer_vectors.json', import.meta.url), 'utf8'));
  assert.ok(ALL_CLIENTS.length > 0);
  assert.ok(ALL_CLIENTS.length <= source.companies.length);
  assert.equal(hasUnknownData({ headquarters: 'Unknown, Norway' }), true);
  assert.equal(hasUnknownData({ tags: ['UNKNOWN'] }), true);
  assert.equal(hasUnknownData({ clientSince: null }), true);
  assert.equal(hasUnknownData({ consultantsCurrentlyHere: 0 }), false);
  assert.equal(new Set(ALL_CLIENTS.map(client => client.id)).size, ALL_CLIENTS.length);
  const originals = new Map(source.companies.map(company => [company.name, company]));
  for (const client of ALL_CLIENTS) {
    assert.equal(hasUnknownData(client), false, client.name);
    const original = originals.get(client.name);
    assert.ok(original, client.name);
    assert.equal(client.name, original.name);
    assert.equal(client.id, original.name);
    assert.equal(client.headcount, original.employees);
    assert.equal(client.headcountAccuracy, original.employees_accuracy);
    assert.equal(client.consultantsCurrentlyHere, original.ConsultantsCurrentlyHere);
    assert.equal(client.customerSince, original.customerSince);
    assert.equal(client.headquarters, original.headquarters);
    assert.ok(['Financial services', 'Energy & utilities', 'Technology', 'Telecommunications', 'Healthcare & life sciences', 'Retail & consumer', 'Manufacturing', 'Transport & logistics', 'Public sector', 'Professional services', 'Construction & real estate', 'Media & entertainment', 'Agriculture & food', 'Other'].includes(client.similarityIndustry), client.name);
    assert.ok(['Publicly listed', 'Privately held', 'State-owned enterprise', 'Government agency', 'Nonprofit / NGO'].includes(client.ownership), client.name);
    assert.ok(Array.isArray(client.customerOrientation) && client.customerOrientation.length > 0, client.name);
    assert.ok(client.customerOrientation.every(orientation => ['B2B', 'B2C / consumer-facing', 'Public / citizen-facing'].includes(orientation)), client.name);
    assert.ok(['Heavily regulated / critical infrastructure', 'Standard commercial / lightly regulated'].includes(client.regulatoryCharacter), client.name);
    assert.equal(client.latitude === null, client.longitude === null);
    if (client.latitude !== null) {
      assert.ok(Number.isFinite(client.latitude) && Math.abs(client.latitude) <= 90);
      assert.ok(Number.isFinite(client.longitude) && Math.abs(client.longitude) <= 180);
      assert.equal(client.coordinateAccuracy, 'city-centre');
      assert.ok(client.coordinateSource.startsWith('https://www.geonames.org/'));
      assert.equal(compareLocation(client, client).status, 'green');
    } else {
      assert.equal(compareLocation(client, client).status, 'grey');
    }
    const result = compareGuess(client, client);
    assert.equal(result.isWinner, true);
    assert.equal(result.sopraStaff.status, 'green');
    assert.equal(result.similarity.status, 'green');
    assert.equal(result.similarity.score, SIMILARITY_MAX_SCORE);
  }
  const base = ALL_CLIENTS[0];
  const since = year => ({ ...base, clientSince: year });
  assert.equal(compareClientSince(since(1990), since(2020)).status, 'grey');
  assert.equal(compareClientSince(since(1990), since(2020)).arrow, '\u2191');
  assert.equal(compareClientSince(since(2020), since(1990)).status, 'grey');
  assert.equal(compareClientSince(since(2020), since(1990)).arrow, '\u2193');
  assert.equal(compareClientSince(since(2020), since(2020)).arrow, undefined);
  assert.equal(compareClientSince(since(null), since(2020)).arrow, undefined);
  assert.equal(compareClientSince(since(2020), since(null)).arrow, undefined);
  const footprint = value => ({ ...base, operatingFootprint: value });
  assert.equal(compareOperatingFootprint(footprint('Local'), footprint('Global')).status, 'grey');
  assert.equal(compareOperatingFootprint(footprint('Local'), footprint('Global')).arrow, '\u2191');
  assert.equal(compareOperatingFootprint(footprint('Global'), footprint('Local')).status, 'grey');
  assert.equal(compareOperatingFootprint(footprint('Global'), footprint('Local')).arrow, '\u2193');
  assert.equal(compareOperatingFootprint(footprint('Local'), footprint('Local')).arrow, undefined);
  const employees = count => ({ ...base, headcount: count });
  assert.equal(compareCompanySize(employees(100), employees(100)).status, 'green');
  assert.equal(compareCompanySize(employees(100), employees(100)).arrow, undefined);
  assert.equal(compareCompanySize(employees(150), employees(100)).status, 'orange');
  assert.equal(compareCompanySize(employees(150), employees(100)).arrow, '\u2193');
  assert.equal(compareCompanySize(employees(100), employees(150)).arrow, '\u2191');
  assert.equal(compareCompanySize(employees(250), employees(100)).status, 'orange');
  assert.equal(compareCompanySize(employees(1000), employees(100)).status, 'grey');
  const staff = count => ({ ...base, consultantsCurrentlyHere: count });
  assert.equal(compareSopraStaff(staff(0), staff(0)).guessDisplay, '0');
  assert.equal(compareSopraStaff(staff(0), staff(0)).status, 'green');
  assert.equal(compareSopraStaff(staff(0), staff(5)).status, 'orange');
  assert.equal(compareSopraStaff(staff(5), staff(0)).arrow, '\u2193');
  assert.equal(compareSopraStaff(staff(0), staff(6)).status, 'grey');
  assert.equal(compareSopraStaff(staff(0), staff(6)).arrow, '\u2191');
  assert.equal(compareSopraStaff(staff(null), staff(0)).status, 'grey');
  assert.equal(compareSopraStaff(staff(0), staff(null)).arrow, undefined);
  assert.equal(SIMILARITY_MAX_SCORE, 5);
  const profile = (extra) => ({
    ...base, similarityIndustry: 'Technology', ownership: 'Privately held',
    customerOrientation: ['B2B'], regulatoryCharacter: 'Standard commercial / lightly regulated', ...extra,
  });
  assert.equal(compareSimilarity(profile(), profile()).score, 5);
  assert.equal(compareSimilarity(profile(), profile()).status, 'green');
  assert.equal(compareSimilarity(profile({ similarityIndustry: 'Manufacturing' }), profile()).score, 3);
  assert.equal(compareSimilarity(profile({ similarityIndustry: 'Manufacturing' }), profile()).status, 'orange');
  assert.equal(compareSimilarity(profile({ customerOrientation: ['B2B', 'B2C / consumer-facing'] }), profile()).score, 5);
  assert.equal(compareSimilarity(
    profile({ similarityIndustry: 'Manufacturing', ownership: 'Publicly listed', customerOrientation: ['Public / citizen-facing'] }),
    profile(),
  ).status, 'grey');
  assert.equal(compareCompanySize({ ...base, headcount: 110000 }, base).guessDisplay, '110,000');
  const origin = { ...base, latitude: 0, longitude: 0 };
  const nearby = { ...origin, latitude: 0.001 };
  assert.equal(compareLocation(origin, nearby).status, 'orange');
  assert.equal(compareLocation(origin, nearby).guessDisplay, '<1 km');
  assert.equal(compareLocation(origin, { ...origin, latitude: null }).guessDisplay, 'Unknown');
  const office = { ...origin, coordinateLocationBasis: 'registered-office' };
  assert.match(compareLocation(office, nearby).explanation, /registered-office/);
  const overrides = JSON.parse(readFileSync(new URL('./location-overrides.json', import.meta.url), 'utf8'));
  for (const [name, override] of Object.entries(overrides)) {
    const client = ALL_CLIENTS.find(candidate => candidate.name === name);
    if (!client) continue;
    assert.equal(client.coordinateLocationSource, override.source);
    assert.notEqual(client.latitude, null, name);
  }
  console.log(`Passed: ${ALL_CLIENTS.length} source records, ${ALL_CLIENTS.filter(client => client.latitude !== null).length} coordinate pairs, staffing boundaries and missing-data checks.`);
} finally {
  await server.close();
}