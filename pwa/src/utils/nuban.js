// pwa/src/utils/nuban.js
// NUBAN Check Digit Algorithm — identifies candidate banks from a 10-digit account number

import { BANKS } from '../components/wallet/BankSelector';

const DMB_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];
const OFI_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

function computeCheckDigitDMB(bankCode, serialNumber) {
  const cipher = bankCode.padStart(3, '0') + serialNumber;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cipher[i], 10) * DMB_WEIGHTS[i];
  }
  const result = 10 - (sum % 10);
  return result === 10 ? 0 : result;
}

function computeCheckDigitOFI(bankCode, serialNumber) {
  const paddedCode = bankCode.slice(-5).padStart(5, '0');
  const cipher = '9' + paddedCode + serialNumber;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += parseInt(cipher[i], 10) * OFI_WEIGHTS[i];
  }
  const result = 10 - (sum % 10);
  return result === 10 ? 0 : result;
}

/**
 * Given a 10-digit Nigerian account number, returns candidate banks
 * whose code produces the correct check digit
 */
export function detectBanksFromAccount(accountNumber) {
  if (!accountNumber || accountNumber.length !== 10 || !/^\d{10}$/.test(accountNumber)) {
    return [];
  }

  const serialNumber = accountNumber.slice(0, 9);
  const checkDigit = parseInt(accountNumber[9], 10);
  const candidates = [];

  for (const bank of BANKS) {
    const code = bank.code;
    let computed;

    if (code.length <= 3) {
      computed = computeCheckDigitDMB(code, serialNumber);
    } else {
      computed = computeCheckDigitOFI(code, serialNumber);
    }

    if (computed === checkDigit) {
      candidates.push(bank);
    }
  }

  return candidates;
}
