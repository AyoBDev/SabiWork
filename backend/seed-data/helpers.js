// backend/seed-data/helpers.js

/**
 * Lagos area center coordinates for realistic GPS spread
 */
const AREA_CENTERS = {
  surulere: { lat: 6.5010, lng: 3.3569 },
  yaba: { lat: 6.5095, lng: 3.3711 },
  ikeja: { lat: 6.6018, lng: 3.3515 },
  lekki: { lat: 6.4478, lng: 3.4723 },
  victoria_island: { lat: 6.4281, lng: 3.4219 },
  mushin: { lat: 6.5355, lng: 3.3554 },
  maryland: { lat: 6.5667, lng: 3.3636 },
  ojota: { lat: 6.5833, lng: 3.3833 },
  ikorodu: { lat: 6.6194, lng: 3.5105 },
  ajah: { lat: 6.4698, lng: 3.5852 }
};

/**
 * Jitter a coordinate by up to ~200m for realistic clustering
 */
function jitterCoord(lat, lng, maxMeters = 200) {
  const latJitter = (Math.random() - 0.5) * (maxMeters / 111000) * 2;
  const lngJitter = (Math.random() - 0.5) * (maxMeters / 111000) * 2;
  return {
    lat: parseFloat((lat + latJitter).toFixed(6)),
    lng: parseFloat((lng + lngJitter).toFixed(6))
  };
}

/**
 * Generate a random date within the last N days
 */
function randomDateWithinDays(days) {
  const now = Date.now();
  const offset = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
}

/**
 * Generate a date within a specific range (days ago)
 */
function dateBetweenDaysAgo(startDaysAgo, endDaysAgo) {
  const now = Date.now();
  const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
  const end = now - endDaysAgo * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (end - start));
}

/**
 * Pick random items from array
 */
function pickRandom(arr, count = 1) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return count === 1 ? shuffled[0] : shuffled.slice(0, count);
}

/**
 * Generate a Nigerian phone number
 */
function generatePhone(index) {
  const prefixes = ['0803', '0805', '0807', '0810', '0813', '0816', '0903', '0906'];
  const prefix = prefixes[index % prefixes.length];
  const suffix = String(1000000 + index * 7919).slice(-7); // deterministic but varied
  return `${prefix}${suffix}`;
}

/**
 * Generate a Squad-style transaction reference
 */
function generateTransRef(jobId, timestamp) {
  return `SABI_${jobId}_${timestamp.getTime()}`;
}

module.exports = {
  AREA_CENTERS,
  jitterCoord,
  randomDateWithinDays,
  dateBetweenDaysAgo,
  pickRandom,
  generatePhone,
  generateTransRef
};
