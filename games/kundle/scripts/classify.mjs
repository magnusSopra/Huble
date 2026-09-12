// Deterministic classification of raw source records into the closed similarity taxonomy.

const INDUSTRY_CATEGORY = {
  banking: 'Financial services', insurance: 'Financial services', asset_management: 'Financial services',
  payments_fintech: 'Financial services', pension: 'Financial services',
  oil_gas: 'Energy & utilities', energy_utility: 'Energy & utilities', renewables: 'Energy & utilities', water_waste: 'Energy & utilities',
  it_services: 'Technology', software: 'Technology',
  telecom: 'Telecommunications',
  health_provider: 'Healthcare & life sciences', health_it: 'Healthcare & life sciences', medtech: 'Healthcare & life sciences',
  retail_grocery: 'Retail & consumer', retail_specialty: 'Retail & consumer', consumer_goods: 'Retail & consumer', hospitality_travel: 'Retail & consumer',
  industrial_mfg: 'Manufacturing', aerospace_defense_industry: 'Manufacturing', automotive: 'Manufacturing', chemicals: 'Manufacturing', mining_metals: 'Manufacturing',
  maritime_shipping: 'Transport & logistics', transport_rail: 'Transport & logistics', transport_transit: 'Transport & logistics',
  transport_air: 'Transport & logistics', transport_road: 'Transport & logistics', logistics_postal: 'Transport & logistics',
  gov_agency: 'Public sector', municipality: 'Public sector', gov_ministry: 'Public sector', police_justice: 'Public sector',
  defense_gov: 'Public sector', county_region: 'Public sector', university: 'Public sector', education_other: 'Public sector', research_institute: 'Public sector',
  consulting_advisory: 'Professional services', legal_services: 'Professional services', facility_services: 'Professional services', security_services: 'Professional services',
  construction_engineering: 'Construction & real estate', real_estate: 'Construction & real estate',
  media_publishing: 'Media & entertainment', broadcasting: 'Media & entertainment', gaming_entertainment: 'Media & entertainment', sports_recreation: 'Media & entertainment',
  agriculture_food: 'Agriculture & food', aquaculture_seafood: 'Agriculture & food',
  other: 'Other', union_association: 'Other', ngo_nonprofit: 'Other', political_party: 'Other',
};

const CUSTOMER_ORIENTATION = {
  gov_agency: ['Public / citizen-facing'], municipality: ['Public / citizen-facing'], gov_ministry: ['Public / citizen-facing'],
  police_justice: ['Public / citizen-facing'], defense_gov: ['Public / citizen-facing'], county_region: ['Public / citizen-facing'],
  education_other: ['Public / citizen-facing'], university: ['Public / citizen-facing'], union_association: ['Public / citizen-facing'],
  ngo_nonprofit: ['Public / citizen-facing'], political_party: ['Public / citizen-facing'], water_waste: ['Public / citizen-facing'],
  research_institute: ['B2B', 'Public / citizen-facing'],
  health_provider: ['B2C / consumer-facing', 'Public / citizen-facing'], pension: ['B2C / consumer-facing', 'Public / citizen-facing'],
  energy_utility: ['B2C / consumer-facing', 'Public / citizen-facing'],
  transport_rail: ['B2C / consumer-facing', 'Public / citizen-facing'], transport_transit: ['B2C / consumer-facing', 'Public / citizen-facing'],
  transport_air: ['B2C / consumer-facing'], transport_road: ['B2B'], logistics_postal: ['B2B', 'B2C / consumer-facing'],
  maritime_shipping: ['B2B'], it_services: ['B2B'], software: ['B2B'], consulting_advisory: ['B2B'], legal_services: ['B2B'],
  facility_services: ['B2B'], security_services: ['B2B'], industrial_mfg: ['B2B'], aerospace_defense_industry: ['B2B'],
  chemicals: ['B2B'], mining_metals: ['B2B'], oil_gas: ['B2B'], renewables: ['B2B'], asset_management: ['B2B'],
  health_it: ['B2B'], medtech: ['B2B'], agriculture_food: ['B2B'], aquaculture_seafood: ['B2B'], real_estate: ['B2B'],
  construction_engineering: ['B2B'], automotive: ['B2C / consumer-facing'], banking: ['B2C / consumer-facing'], insurance: ['B2C / consumer-facing'],
  payments_fintech: ['B2C / consumer-facing', 'B2B'], telecom: ['B2C / consumer-facing', 'B2B'],
  retail_grocery: ['B2C / consumer-facing'], retail_specialty: ['B2C / consumer-facing'], consumer_goods: ['B2C / consumer-facing'],
  hospitality_travel: ['B2C / consumer-facing'], media_publishing: ['B2C / consumer-facing'], broadcasting: ['B2C / consumer-facing'],
  gaming_entertainment: ['B2C / consumer-facing'], sports_recreation: ['B2C / consumer-facing'], other: ['B2B'],
};

const HEAVILY_REGULATED = new Set([
  'banking', 'insurance', 'asset_management', 'payments_fintech', 'pension', 'oil_gas', 'energy_utility', 'renewables',
  'water_waste', 'telecom', 'health_provider', 'health_it', 'medtech', 'aerospace_defense_industry', 'defense_gov',
  'police_justice', 'gov_agency', 'gov_ministry', 'municipality', 'county_region', 'transport_rail', 'transport_air',
  'transport_transit', 'maritime_shipping', 'aquaculture_seafood', 'mining_metals', 'chemicals', 'broadcasting',
]);

const STATE_OWNED_ENTERPRISE = new Set([
  'energy_utility', 'renewables', 'water_waste', 'transport_rail', 'transport_transit', 'transport_air', 'transport_road',
  'logistics_postal', 'oil_gas', 'banking', 'insurance', 'pension', 'broadcasting', 'health_provider', 'health_it',
  'real_estate', 'maritime_shipping', 'media_publishing', 'hospitality_travel', 'telecom',
]);

function ownership(sector, industry, tags) {
  if (sector === 'ngo') return 'Nonprofit / NGO';
  if (sector === 'academic') return 'Government agency';
  if (sector === 'public') return STATE_OWNED_ENTERPRISE.has(industry) ? 'State-owned enterprise' : 'Government agency';
  return tags.includes('listed') ? 'Publicly listed' : 'Privately held';
}

export function classify({ industry, sector, tags = [] }) {
  const similarityIndustry = INDUSTRY_CATEGORY[industry] ?? 'Other';
  const customerOrientation = CUSTOMER_ORIENTATION[industry] ?? ['B2B'];
  return {
    similarityIndustry,
    ownership: ownership(sector, industry, tags),
    customerOrientation,
    regulatoryCharacter: HEAVILY_REGULATED.has(industry)
      ? 'Heavily regulated / critical infrastructure'
      : 'Standard commercial / lightly regulated',
  };
}
