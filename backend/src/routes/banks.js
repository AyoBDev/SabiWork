// backend/src/routes/banks.js
const { Router } = require('express');
const { SUPPORTED_BANKS } = require('../../shared/constants');
const squad = require('../services/squad');

const router = Router();

// Full Nigerian bank list with NIP codes for account lookup
const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044', nip: '000014' },
  { name: 'Citibank', code: '023', nip: '000009' },
  { name: 'Ecobank', code: '050', nip: '000010' },
  { name: 'Fidelity Bank', code: '070', nip: '000007' },
  { name: 'First Bank', code: '011', nip: '000016' },
  { name: 'First City Monument Bank', code: '214', nip: '000003' },
  { name: 'GTBank', code: '058', nip: '000013' },
  { name: 'Heritage Bank', code: '030', nip: '000020' },
  { name: 'Keystone Bank', code: '082', nip: '000002' },
  { name: 'Polaris Bank', code: '076', nip: '000008' },
  { name: 'Stanbic IBTC', code: '221', nip: '000012' },
  { name: 'Standard Chartered', code: '068', nip: '000021' },
  { name: 'Sterling Bank', code: '232', nip: '000001' },
  { name: 'UBA', code: '033', nip: '000004' },
  { name: 'Union Bank', code: '032', nip: '000018' },
  { name: 'Unity Bank', code: '215', nip: '000011' },
  { name: 'Wema Bank', code: '035', nip: '000017' },
  { name: 'Zenith Bank', code: '057', nip: '000015' },
  { name: 'Kuda', code: '090267', nip: '090267' },
  { name: 'OPay', code: '100004', nip: '100004' },
  { name: 'PalmPay', code: '100033', nip: '100033' },
  { name: 'Moniepoint', code: '100022', nip: '100022' },
  { name: 'FairMoney', code: '090551', nip: '090551' },
  { name: 'Carbon', code: '100026', nip: '100026' },
  { name: 'ALAT by Wema', code: '035', nip: '000017' },
  { name: 'VFD Microfinance Bank', code: '090110', nip: '090110' }
];

/**
 * GET /api/banks — List all supported banks
 */
router.get('/', (req, res) => {
  const { search } = req.query;
  let banks = NIGERIAN_BANKS;

  if (search) {
    const q = search.toLowerCase();
    banks = banks.filter(b => b.name.toLowerCase().includes(q));
  }

  res.json({ banks: banks.map(b => ({ name: b.name, code: b.code })) });
});

/**
 * POST /api/banks/resolve — Resolve account number to bank name
 * Uses NUBAN check digit algorithm to find candidate banks, then verifies via Squad API
 */
router.post('/resolve', async (req, res) => {
  const { account_number } = req.body;

  if (!account_number || account_number.length !== 10) {
    return res.status(400).json({ error: 'Valid 10-digit account number required' });
  }

  // Step 1: Find candidate banks using NUBAN algorithm
  const candidates = findCandidateBanks(account_number);

  if (candidates.length === 0) {
    return res.json({ candidates: [], resolved: null });
  }

  // Step 2: Try to verify with Squad account lookup (first match wins)
  for (const bank of candidates) {
    try {
      const result = await squad.lookupAccount(bank.code, account_number);
      if (result.accountName) {
        return res.json({
          resolved: {
            bank_name: bank.name,
            bank_code: bank.code,
            account_name: result.accountName,
            account_number
          },
          candidates: candidates.map(c => ({ name: c.name, code: c.code }))
        });
      }
    } catch (_) {
      // This bank didn't match, try next
    }
  }

  // No definitive match via API, return candidates for user to pick
  res.json({
    resolved: null,
    candidates: candidates.map(c => ({ name: c.name, code: c.code }))
  });
});

/**
 * POST /api/banks/lookup — Look up account name given bank code + account number
 */
router.post('/lookup', async (req, res) => {
  const { bank_code, account_number, bank_name } = req.body;

  let code = bank_code;

  // If bank_name provided instead of code, resolve it
  if (!code && bank_name) {
    const match = NIGERIAN_BANKS.find(b =>
      b.name.toLowerCase().includes(bank_name.toLowerCase())
    );
    if (!match) {
      return res.status(400).json({ error: `Bank "${bank_name}" not found` });
    }
    code = match.code;
  }

  if (!code || !account_number) {
    return res.status(400).json({ error: 'bank_code (or bank_name) and account_number required' });
  }

  try {
    const result = await squad.lookupAccount(code, account_number);
    res.json({
      account_name: result.accountName,
      account_number: result.accountNumber,
      bank_code: code,
      bank_name: NIGERIAN_BANKS.find(b => b.code === code)?.name || code
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Account lookup failed' });
  }
});

/**
 * NUBAN Check Digit Algorithm
 * Finds all banks whose code produces the correct check digit for a given account number
 */
function findCandidateBanks(accountNumber) {
  const serialNumber = accountNumber.slice(0, 9);
  const checkDigit = parseInt(accountNumber[9], 10);
  const candidates = [];

  for (const bank of NIGERIAN_BANKS) {
    const code = bank.code;
    let computed;

    if (code.length <= 3) {
      // DMB (Deposit Money Bank) — 3-digit code
      const paddedCode = code.padStart(3, '0');
      computed = computeCheckDigit(paddedCode + serialNumber);
    } else {
      // OFI (Other Financial Institution) — 5-6 digit code
      const paddedCode = code.slice(-5).padStart(5, '0');
      computed = computeCheckDigitOFI(paddedCode + serialNumber);
    }

    if (computed === checkDigit) {
      candidates.push(bank);
    }
  }

  return candidates;
}

function computeCheckDigit(cipher) {
  // cipher = 3-digit bank code + 9-digit serial = 12 digits
  const weights = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cipher[i], 10) * weights[i];
  }
  const result = 10 - (sum % 10);
  return result === 10 ? 0 : result;
}

function computeCheckDigitOFI(cipher) {
  // cipher = "9" + 5-digit bank code + 9-digit serial = 15 digits
  const fullCipher = '9' + cipher;
  const weights = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += parseInt(fullCipher[i], 10) * weights[i];
  }
  const result = 10 - (sum % 10);
  return result === 10 ? 0 : result;
}

module.exports = router;
