import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (in order of foreign keys)
  await prisma.watchlist.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.mergeReview.deleteMany();
  await prisma.listingEvent.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.propertyPOI.deleteMany();
  await prisma.property.deleteMany();
  await prisma.poi.deleteMany();
  await prisma.source.deleteMany();
  await prisma.session.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  console.log('📝 Creating sources...');

  const realestate = await prisma.source.create({
    data: {
      name: 'realestate.com.au',
      domain: 'realestate.com.au',
      method: 'api',
      is_active: true,
      rate_limit_requests_per_hour: 1000,
      tos_notes: 'Official API partner',
    },
  });

  const domain = await prisma.source.create({
    data: {
      name: 'domain.com.au',
      domain: 'domain.com.au',
      method: 'api',
      is_active: true,
      rate_limit_requests_per_hour: 1000,
    },
  });

  console.log('👤 Creating users...');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@auspropdb.com',
      name: 'Admin User',
      role: 'admin',
      plan: 'enterprise',
      email_verified: true,
      is_active: true,
    },
  });

  const proUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Test User',
      role: 'user',
      plan: 'pro',
      email_verified: true,
      is_active: true,
    },
  });

  console.log('🏠 Creating properties (Sydney examples)...');

  const prop1 = await prisma.property.create({
    data: {
      canonical_address: '123 Pitt Street, Sydney NSW 2000',
      address_fingerprint: 'pitt_123_sydney_2000',
      lat: -33.8688,
      lng: 151.2093,
      suburb: 'Sydney',
      postcode: '2000',
      state: 'NSW',
      lga: 'City of Sydney',
      sa2: 'Sydney - Inner West',
      property_type: 'apartment',
      bedrooms: 2,
      bathrooms: 2,
      parking_spaces: 1,
      land_size_m2: null,
      building_size_m2: 85,
      year_built: 2015,
      convenience_score: 95,
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      canonical_address: '456 Oxford Street, Paddington NSW 2021',
      address_fingerprint: 'oxford_456_paddington_2021',
      lat: -33.8874,
      lng: 151.2251,
      suburb: 'Paddington',
      postcode: '2021',
      state: 'NSW',
      lga: 'City of Sydney',
      sa2: 'Sydney - Inner South',
      property_type: 'house',
      bedrooms: 3,
      bathrooms: 2,
      parking_spaces: 2,
      land_size_m2: 450,
      building_size_m2: 180,
      year_built: 1920,
      convenience_score: 88,
    },
  });

  const prop3 = await prisma.property.create({
    data: {
      canonical_address: '789 Bondi Road, Bondi NSW 2026',
      address_fingerprint: 'bondi_789_bondi_2026',
      lat: -33.8905,
      lng: 151.2752,
      suburb: 'Bondi',
      postcode: '2026',
      state: 'NSW',
      lga: 'Waverley Council',
      sa2: 'Sydney - Eastern Suburbs',
      property_type: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      parking_spaces: 0,
      land_size_m2: null,
      building_size_m2: 50,
      year_built: 2010,
      convenience_score: 92,
    },
  });

  console.log('📍 Creating listings...');

  const listing1 = await prisma.listing.create({
    data: {
      property_id: prop1.id,
      source_id: realestate.id,
      source_listing_id: 'rea_123456',
      url: 'https://realestate.com.au/property-apartment-nsw-sydney-123456',
      title: 'Modern 2BR Apartment in CBD',
      description: 'Beautiful apartment with harbour views in the heart of Sydney CBD',
      status: 'active',
      agent_name: 'John Smith',
      agency_name: 'Sydney Real Estate',
      price_numeric_min: 750000,
      price_numeric_max: 800000,
      price_display: '$750,000 - $800,000',
      currency: 'AUD',
      listed_at: new Date('2024-01-15'),
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      property_id: prop2.id,
      source_id: domain.id,
      source_listing_id: 'dom_789012',
      url: 'https://www.domain.com.au/property-house-nsw-paddington-789012',
      title: 'Charming Victorian in Paddington',
      description: 'Renovated 3 bedroom Victorian terrace',
      status: 'active',
      agent_name: 'Sarah Johnson',
      agency_name: 'Domain Estate Agents',
      price_numeric_min: 2100000,
      price_numeric_max: 2200000,
      price_display: '$2,100,000 - $2,200,000',
      currency: 'AUD',
      listed_at: new Date('2024-01-10'),
    },
  });

  const listing3 = await prisma.listing.create({
    data: {
      property_id: prop3.id,
      source_id: realestate.id,
      source_listing_id: 'rea_345678',
      url: 'https://realestate.com.au/property-apartment-nsw-bondi-345678',
      title: 'Beachside Studio in Bondi',
      description: 'Studio apartment walking distance to Bondi Beach',
      status: 'under_offer',
      agent_name: 'Michael Lee',
      agency_name: 'Bondi Beach Properties',
      price_numeric_min: 650000,
      price_numeric_max: 700000,
      price_display: '$650,000 - $700,000',
      currency: 'AUD',
      listed_at: new Date('2024-01-20'),
    },
  });

  console.log('💰 Creating price history...');

  await prisma.priceHistory.createMany({
    data: [
      {
        listing_id: listing1.id,
        property_id: prop1.id,
        price: 800000,
        captured_at: new Date('2024-01-15'),
      },
      {
        listing_id: listing1.id,
        property_id: prop1.id,
        price: 795000,
        captured_at: new Date('2024-01-20'),
      },
      {
        listing_id: listing1.id,
        property_id: prop1.id,
        price: 775000,
        captured_at: new Date('2024-01-25'),
      },
      {
        listing_id: listing2.id,
        property_id: prop2.id,
        price: 2200000,
        captured_at: new Date('2024-01-10'),
      },
      {
        listing_id: listing2.id,
        property_id: prop2.id,
        price: 2150000,
        captured_at: new Date('2024-01-18'),
      },
    ],
  });

  console.log('🗺️ Creating POIs (Points of Interest)...');

  const schoolPOI = await prisma.pOI.create({
    data: {
      name: 'Sydney Grammar School',
      category: 'school',
      lat: -33.8873,
      lng: 151.2127,
      address: 'College Street, Sydney NSW 2000',
    },
  });

  const stationPOI = await prisma.pOI.create({
    data: {
      name: 'Central Station',
      category: 'transport',
      lat: -33.8795,
      lng: 151.2053,
      address: 'Eddy Avenue, Sydney NSW 2000',
    },
  });

  const beachPOI = await prisma.pOI.create({
    data: {
      name: 'Bondi Beach',
      category: 'beach',
      lat: -33.8906,
      lng: 151.2753,
      address: 'Bondi Beach, Sydney NSW 2026',
    },
  });

  const supermarketPOI = await prisma.pOI.create({
    data: {
      name: 'Woolworths Paddington',
      category: 'grocery',
      lat: -33.8898,
      lng: 151.2247,
      address: 'Oxford Street, Paddington NSW 2021',
    },
  });

  console.log('📏 Creating property-POI relationships...');

  await prisma.propertyPOI.createMany({
    data: [
      {
        property_id: prop1.id,
        poi_id: stationPOI.id,
        distance_meters: 450,
        duration_drive_seconds: 120,
        duration_walk_seconds: 600,
        duration_transit_seconds: 300,
      },
      {
        property_id: prop1.id,
        poi_id: schoolPOI.id,
        distance_meters: 1200,
        duration_drive_seconds: 300,
        duration_walk_seconds: 1440,
      },
      {
        property_id: prop2.id,
        poi_id: supermarketPOI.id,
        distance_meters: 380,
        duration_walk_seconds: 450,
      },
      {
        property_id: prop3.id,
        poi_id: beachPOI.id,
        distance_meters: 200,
        duration_walk_seconds: 240,
      },
    ],
  });

  console.log('🔖 Creating saved search and watchlist...');

  const savedSearch = await prisma.savedSearch.create({
    data: {
      user_id: proUser.id,
      name: 'Inner West Sydney',
      filters: {
        suburb: ['Paddington', 'Surry Hills'],
        min_price: 1500000,
        max_price: 2500000,
        property_types: ['house', 'townhouse'],
      },
      notify_on_changes: true,
    },
  });

  await prisma.watchlist.createMany({
    data: [
      { user_id: proUser.id, property_id: prop1.id, notes: 'Great location' },
      { user_id: proUser.id, property_id: prop2.id },
    ],
  });

  console.log('🚨 Creating alerts...');

  await prisma.alert.create({
    data: {
      user_id: proUser.id,
      saved_search_id: savedSearch.id,
      type: 'new_listing',
      channel: 'email',
      is_active: true,
    },
  });

  await prisma.alert.create({
    data: {
      user_id: proUser.id,
      property_id: prop1.id,
      type: 'price_drop',
      channel: 'email',
      threshold_value: 20000,
      is_active: true,
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
