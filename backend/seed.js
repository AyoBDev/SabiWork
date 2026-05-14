// backend/seed.js
const knex = require('./src/database/knex');
const { AREA_CENTERS, jitterCoord, randomDateWithinDays, dateBetweenDaysAgo, pickRandom, generateTransRef } = require('./seed-data/helpers');

const workers = require('./seed-data/workers.json');
const buyers = require('./seed-data/buyers.json');
const traders = require('./seed-data/traders.json');
const seekers = require('./seed-data/seekers.json');
const agents = require('./seed-data/agents.json');
const apprenticeships = require('./seed-data/apprenticeships.json');

async function seed() {
  console.log('🌱 Seeding SabiWork database...');

  // Clear existing data (order matters for foreign keys)
  await knex('apprenticeships').del();
  await knex('trust_events').del();
  await knex('webhook_events').del();
  await knex('demand_signals').del();
  await knex('sales_logs').del();
  await knex('jobs').del();
  await knex('seekers').del();
  await knex('traders').del();
  await knex('buyers').del();
  await knex('agents').del();
  await knex('workers').del();

  console.log('  Cleared existing data');

  // === 1. Insert Workers ===
  const workerIds = [];
  for (const w of workers) {
    const coords = jitterCoord(AREA_CENTERS[w.area_key].lat, AREA_CENTERS[w.area_key].lng);
    const [inserted] = await knex('workers').insert({
      name: w.name,
      phone: w.phone,
      primary_trade: w.primary_trade,
      secondary_trades: `{${w.secondary_trades.join(',')}}`,
      service_areas: `{${w.service_areas.join(',')}}`,
      location_lat: coords.lat,
      location_lng: coords.lng,
      bank_code: w.bank_code,
      account_number: w.account_number,
      account_name: w.account_name,
      virtual_account_number: w.virtual_account_number,
      trust_score: w.trust_score,
      sabi_score: w.sabi_score,
      total_jobs: w.total_jobs,
      total_income: w.total_income,
      accepts_apprentices: w.accepts_apprentices,
      apprentice_slots: w.apprentice_slots,
      is_available: w.is_available,
      onboarding_channel: w.onboarding_channel,
      gps_verified: w.gps_verified,
      last_active_at: new Date(), // Always "just now" so workers appear in queries
      created_at: dateBetweenDaysAgo(90, 60)
    }).returning('id');
    workerIds.push(inserted.id || inserted);
  }
  console.log(`  ✓ ${workerIds.length} workers inserted`);

  // === 2. Insert Buyers ===
  const buyerIds = [];
  for (const b of buyers) {
    const coords = jitterCoord(AREA_CENTERS[b.area_key].lat, AREA_CENTERS[b.area_key].lng);
    const [inserted] = await knex('buyers').insert({
      name: b.name,
      phone: b.phone,
      email: b.email,
      area: b.area,
      location_lat: coords.lat,
      location_lng: coords.lng,
      created_at: dateBetweenDaysAgo(85, 30)
    }).returning('id');
    buyerIds.push(inserted.id || inserted);
  }
  console.log(`  ✓ ${buyerIds.length} buyers inserted`);

  // === 3. Insert Traders ===
  const traderIds = [];
  for (const t of traders) {
    const coords = jitterCoord(AREA_CENTERS[t.area_key].lat, AREA_CENTERS[t.area_key].lng);
    const [inserted] = await knex('traders').insert({
      name: t.name,
      phone: t.phone,
      business_type: t.business_type,
      area: t.area,
      location_lat: coords.lat,
      location_lng: coords.lng,
      virtual_account_number: t.virtual_account_number,
      sabi_score: t.sabi_score,
      total_logged_sales: t.total_logged_sales,
      total_logged_revenue: t.total_logged_revenue,
      created_at: dateBetweenDaysAgo(90, 60)
    }).returning('id');
    traderIds.push(inserted.id || inserted);
  }
  console.log(`  ✓ ${traderIds.length} traders inserted`);

  // === 4. Insert Seekers ===
  const seekerIds = [];
  for (const s of seekers) {
    const coords = jitterCoord(AREA_CENTERS[s.area_key].lat, AREA_CENTERS[s.area_key].lng);
    const [inserted] = await knex('seekers').insert({
      name: s.name,
      phone: s.phone,
      area: s.area,
      location_lat: coords.lat,
      location_lng: coords.lng,
      interests: `{${(s.interests || []).join(',')}}`,
      created_at: dateBetweenDaysAgo(60, 14)
    }).returning('id');
    seekerIds.push(inserted.id || inserted);
  }
  console.log(`  ✓ ${seekerIds.length} seekers inserted`);

  // === 5. Insert Agents ===
  for (const a of agents) {
    await knex('agents').insert({
      name: a.name,
      phone: a.phone,
      area_assigned: a.area_assigned,
      workers_onboarded: a.workers_onboarded,
      is_active: a.is_active,
      created_at: dateBetweenDaysAgo(90, 80)
    });
  }
  console.log('  ✓ 2 agents inserted');

  // === 6. Generate Jobs (50 completed) ===
  const trades = ['plumbing', 'electrical', 'carpentry', 'cleaning', 'tailoring', 'hairdressing', 'painting', 'catering', 'welding', 'tiling'];
  const jobIds = [];
  const amounts = [5000, 7500, 10000, 12000, 15000, 20000, 25000, 30000, 35000, 50000];
  const channels = ['card', 'transfer', 'ussd', 'bank'];

  for (let i = 0; i < 50; i++) {
    const buyerIdx = i % buyerIds.length;
    const workerIdx = i % workerIds.length;
    const trade = workers[workerIdx].primary_trade;
    const amount = pickRandom(amounts);
    const payout = Math.round(amount * 0.95);
    const createdAt = dateBetweenDaysAgo(85, 2);
    const paidAt = new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 min after creation
    const completedAt = new Date(paidAt.getTime() + (2 + Math.random() * 48) * 60 * 60 * 1000);
    const transRef = generateTransRef(i + 1, paidAt);
    const buyerCoords = jitterCoord(AREA_CENTERS[buyers[buyerIdx].area_key].lat, AREA_CENTERS[buyers[buyerIdx].area_key].lng);

    const [inserted] = await knex('jobs').insert({
      buyer_id: buyerIds[buyerIdx],
      worker_id: workerIds[workerIdx],
      service_category: trade,
      description: `${trade} job #${i + 1}`,
      area: buyers[buyerIdx].area,
      location_lat: buyerCoords.lat,
      location_lng: buyerCoords.lng,
      agreed_amount: amount,
      status: 'completed',
      transaction_ref: transRef,
      payment_channel: pickRandom(channels),
      paid_at: paidAt,
      payout_ref: `PAYOUT_${transRef}`,
      payout_amount: payout,
      payout_status: 'success',
      payout_nip_ref: `NIP${String(100000 + i).slice(-6)}`,
      buyer_rating: Math.min(5, Math.max(3, Math.round(3.5 + Math.random() * 2))),
      created_at: createdAt,
      completed_at: completedAt
    }).returning('id');
    jobIds.push(inserted.id || inserted);
  }
  console.log(`  ✓ ${jobIds.length} completed jobs inserted`);

  // === 7. Generate Trust Events (from jobs) ===
  let trustEventCount = 0;
  for (let i = 0; i < jobIds.length; i++) {
    const workerIdx = i % workerIds.length;
    const workerId = workerIds[workerIdx];
    const jobCreatedAt = dateBetweenDaysAgo(85, 2);

    // Payment received event
    await knex('trust_events').insert({
      worker_id: workerId,
      event_type: 'payment_received',
      score_delta: 0.005,
      score_after: Math.min(1, workers[workerIdx].trust_score),
      job_id: jobIds[i],
      created_at: new Date(jobCreatedAt.getTime() + 35 * 60 * 1000)
    });
    trustEventCount++;

    // Fast payment bonus (50% of jobs)
    if (i % 2 === 0) {
      await knex('trust_events').insert({
        worker_id: workerId,
        event_type: 'fast_payment',
        score_delta: 0.02,
        score_after: Math.min(1, workers[workerIdx].trust_score),
        job_id: jobIds[i],
        created_at: new Date(jobCreatedAt.getTime() + 36 * 60 * 1000)
      });
      trustEventCount++;
    }

    // Rating event (all jobs have ratings)
    const rating = Math.min(5, Math.max(3, Math.round(3.5 + Math.random() * 2)));
    const ratingDelta = rating > 3 ? (rating - 3) * 0.01 : (rating - 3) * 0.02;
    await knex('trust_events').insert({
      worker_id: workerId,
      event_type: 'rating_received',
      score_delta: ratingDelta,
      score_after: Math.min(1, workers[workerIdx].trust_score),
      job_id: jobIds[i],
      created_at: new Date(jobCreatedAt.getTime() + 72 * 60 * 60 * 1000)
    });
    trustEventCount++;
  }
  console.log(`  ✓ ${trustEventCount} trust events inserted`);

  // === 8. Generate Sales Logs (200 for traders) ===
  const foodItems = ['rice', 'beans', 'garri', 'palm oil', 'semovita', 'flour', 'sugar', 'salt', 'maggi', 'tomato paste'];
  const buildingItems = ['cement', 'rod', 'sand', 'gravel', 'blocks', 'nails', 'roofing sheets', 'tiles', 'paint', 'POP'];
  const textileItems = ['ankara', 'lace', 'guinea brocade', 'adire', 'aso-oke', 'plain white', 'chiffon', 'silk', 'cotton', 'velvet'];
  const electronicsItems = ['phone', 'charger', 'earpiece', 'power bank', 'laptop', 'router', 'TV', 'speaker', 'cable', 'adapter'];
  const itemsByType = {
    food_provisions: foodItems,
    building_materials: buildingItems,
    textiles: textileItems,
    electronics: electronicsItems
  };
  const paymentMethods = ['cash', 'transfer', 'squad', 'pos'];

  let salesCount = 0;
  for (let i = 0; i < 200; i++) {
    const traderIdx = i % traderIds.length;
    const trader = traders[traderIdx];
    const items = itemsByType[trader.business_type] || foodItems;
    const item = pickRandom(items);
    const quantity = Math.ceil(Math.random() * 10);
    const basePrice = trader.business_type === 'electronics' ? 15000 + Math.random() * 85000
      : trader.business_type === 'building_materials' ? 5000 + Math.random() * 45000
      : 500 + Math.random() * 15000;
    const amount = Math.round(basePrice * quantity);

    await knex('sales_logs').insert({
      trader_id: traderIds[traderIdx],
      amount: amount,
      item_name: item,
      quantity: quantity,
      category: trader.business_type,
      payment_method: pickRandom(paymentMethods),
      squad_ref: i % 4 === 0 ? `SQUAD_SALE_${i}` : null,
      logged_at: dateBetweenDaysAgo(90, 0)
    });
    salesCount++;
  }
  console.log(`  ✓ ${salesCount} sales logs inserted`);

  // === 9. Generate Demand Signals (500) ===
  // Intentional pattern: heavy tiling demand in Surulere (no tilers there!)
  const demandTrades = ['plumbing', 'electrical', 'carpentry', 'cleaning', 'tailoring', 'hairdressing', 'painting', 'catering', 'welding', 'tiling'];
  const areas = Object.keys(AREA_CENTERS);
  let demandCount = 0;

  for (let i = 0; i < 500; i++) {
    let trade, area;

    // 15% of demand is tiling in Surulere (creates visible gap)
    if (i < 75) {
      trade = 'tiling';
      area = 'surulere';
    }
    // 10% clustered around 3rd Mainland Bridge axis (yaba/surulere/mushin)
    else if (i < 125) {
      trade = pickRandom(demandTrades);
      area = pickRandom(['yaba', 'surulere', 'mushin']);
    }
    // Rest spread across areas and trades
    else {
      trade = pickRandom(demandTrades);
      area = pickRandom(areas);
    }

    const coords = jitterCoord(AREA_CENTERS[area].lat, AREA_CENTERS[area].lng, 500);
    const matched = i >= 75 ? Math.random() > 0.3 : false; // Surulere tiling never matched

    await knex('demand_signals').insert({
      trade_category: trade,
      area: area,
      location_lat: coords.lat,
      location_lng: coords.lng,
      request_type: pickRandom(['job_request', 'whatsapp_inquiry', 'ussd_inquiry']),
      amount: Math.round(5000 + Math.random() * 45000),
      matched: matched,
      payment_channel: matched ? pickRandom(channels) : null,
      recorded_at: dateBetweenDaysAgo(90, 0)
    });
    demandCount++;
  }
  console.log(`  ✓ ${demandCount} demand signals inserted`);

  // === 10. Insert Apprenticeships ===
  for (const a of apprenticeships) {
    const startedAt = new Date(Date.now() - a.started_days_ago * 24 * 60 * 60 * 1000);
    await knex('apprenticeships').insert({
      master_worker_id: workerIds[a.master_worker_index],
      apprentice_id: seekerIds[a.seeker_index],
      trade: a.trade,
      duration_weeks: a.duration_weeks,
      weekly_stipend: a.weekly_stipend,
      status: a.status,
      milestones_completed: a.milestones_completed,
      total_milestones: a.total_milestones,
      started_at: startedAt
    });
  }
  console.log('  ✓ 3 apprenticeships inserted');

  console.log('\n🎉 Seed complete!');
  console.log('   Demo highlights:');
  console.log('   • Surulere has 75 tiling requests with NO tilers — visible gap');
  console.log('   • Emeka (plumber, trust 0.76) — ideal for buyer matching demo');
  console.log('   • Mama Ngozi (SabiScore 43) — "7 weeks to loan" story');
  console.log('   • Heat map clusters around 3rd Mainland Bridge axis');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
