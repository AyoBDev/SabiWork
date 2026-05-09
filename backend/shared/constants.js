// shared/constants.js
// Trade categories, Lagos areas with coordinates, trust tiers, SabiScore thresholds

const TRADES = [
  'plumbing',
  'electrical',
  'tailoring',
  'tiling',
  'carpentry',
  'painting',
  'welding',
  'cleaning',
  'hairdressing',
  'catering'
];

const LAGOS_AREAS = [
  { name: 'Surulere', key: 'surulere', lat: 6.5010, lng: 3.3569 },
  { name: 'Yaba', key: 'yaba', lat: 6.5095, lng: 3.3711 },
  { name: 'Ikeja', key: 'ikeja', lat: 6.6018, lng: 3.3515 },
  { name: 'Lekki', key: 'lekki', lat: 6.4478, lng: 3.4723 },
  { name: 'Victoria Island', key: 'victoria_island', lat: 6.4281, lng: 3.4219 },
  { name: 'Mushin', key: 'mushin', lat: 6.5355, lng: 3.3554 },
  { name: 'Maryland', key: 'maryland', lat: 6.5667, lng: 3.3636 },
  { name: 'Ojota', key: 'ojota', lat: 6.5833, lng: 3.3833 },
  { name: 'Ikorodu', key: 'ikorodu', lat: 6.6194, lng: 3.5105 },
  { name: 'Ajah', key: 'ajah', lat: 6.4698, lng: 3.5852 }
];

const TRUST_TIERS = {
  EMERGING: { min: 0.0, max: 0.29, label: 'Emerging', emoji: '🌱' },
  TRUSTED: { min: 0.30, max: 0.59, label: 'Trusted', emoji: '✅' },
  VERIFIED: { min: 0.60, max: 0.79, label: 'Verified', emoji: '🔵' },
  ELITE: { min: 0.80, max: 1.0, label: 'Elite', emoji: '⭐' }
};

const SABI_SCORE_TIERS = {
  NONE: { min: 0, max: 29, unlocks: 'none', label: 'Keep logging' },
  SAVINGS: { min: 30, max: 49, unlocks: 'savings', label: 'Savings unlocked' },
  MICROLOAN: { min: 50, max: 69, unlocks: 'microloan', label: 'Microloan eligible' },
  FULL: { min: 70, max: 100, unlocks: 'full', label: 'Full financial suite' }
};

const JOB_STATUSES = [
  'created',
  'payment_pending',
  'paid',
  'in_progress',
  'completed',
  'payout_sent'
];

const PAYOUT_STATUSES = ['pending', 'success', 'failed', 'requeried'];

const ONBOARDING_CHANNELS = ['whatsapp', 'ussd', 'field_agent'];

const PLATFORM_FEE_PERCENT = 5;

const SUPPORTED_BANKS = [
  { name: 'Kuda', code: '090267' },
  { name: 'OPay', code: '100004' },
  { name: 'PalmPay', code: '100033' },
  { name: 'GTBank', code: '058' },
  { name: 'Access', code: '044' },
  { name: 'First Bank', code: '011' },
  { name: 'UBA', code: '033' },
  { name: 'Zenith', code: '057' },
  { name: 'Wema', code: '035' },
  { name: 'FairMoney', code: '090551' }
];

module.exports = {
  TRADES,
  LAGOS_AREAS,
  TRUST_TIERS,
  SABI_SCORE_TIERS,
  JOB_STATUSES,
  PAYOUT_STATUSES,
  ONBOARDING_CHANNELS,
  PLATFORM_FEE_PERCENT,
  SUPPORTED_BANKS
};
