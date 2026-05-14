// backend/src/services/squad.js
const crypto = require('crypto');
const config = require('../config');

class SquadService {
  constructor() {
    this.baseUrl = config.squadBaseUrl;
    this.secretKey = config.squadSecretKey;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `Squad API error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Initiate a payment transaction
   * @param {Object} params
   * @param {number} params.amount - Amount in Naira (converted to kobo internally)
   * @param {string} params.email - Buyer email
   * @param {string} params.transactionRef - Unique reference (format: SABI_{job_id}_{timestamp})
   * @param {string} params.callbackUrl - Webhook URL
   * @param {Object} params.metadata - { job_id, worker_id, service_category, area }
   * @param {string[]} params.paymentChannels - ['card', 'bank', 'ussd', 'transfer']
   * @returns {Object} { checkout_url, transaction_ref }
   */
  async initiatePayment({ amount, email, transactionRef, callbackUrl, metadata, paymentChannels }) {
    const body = {
      amount: amount * 100, // Naira to kobo
      email,
      currency: 'NGN',
      initiate_type: 'inline',
      transaction_ref: transactionRef,
      callback_url: callbackUrl || `${config.webhookBaseUrl}/api/webhooks/squad`,
      pass_charge: false,
      payment_channels: paymentChannels || ['card', 'bank', 'ussd', 'transfer'],
      metadata: metadata || {}
    };

    const result = await this._request('POST', '/transaction/initiate', body);
    return {
      checkout_url: result.data.checkout_url,
      transaction_ref: transactionRef
    };
  }

  /**
   * Verify a transaction by reference
   * @param {string} transactionRef - The transaction reference to verify
   * @returns {Object} Transaction details including status, amount, payment channel
   */
  async verifyTransaction(transactionRef) {
    const result = await this._request('GET', `/transaction/verify/${transactionRef}`);
    return {
      status: result.data.transaction_status,
      amount: result.data.transaction_amount / 100, // kobo to Naira
      amountKobo: result.data.transaction_amount,
      currency: result.data.transaction_currency_id,
      paymentChannel: result.data.payment_channel || result.data.channel,
      merchantRef: result.data.merchant_ref,
      meta: result.data.meta || {}
    };
  }

  /**
   * Transfer funds to a worker's bank account (payout)
   * @param {Object} params
   * @param {number} params.amount - Amount in Naira (converted to kobo internally)
   * @param {string} params.bankCode - Bank code (e.g., '090267' for Kuda)
   * @param {string} params.accountNumber - 10-digit NUBAN account number
   * @param {string} params.accountName - Verified account name
   * @param {string} params.transactionRef - Unique payout reference
   * @param {string} params.remark - Transfer narration
   * @returns {Object} { success, nip_ref } or throws on failure
   */
  async transferToBank({ amount, bankCode, accountNumber, accountName, transactionRef, remark }) {
    // Squad requires merchant ID prefix on transaction references
    const ref = transactionRef.startsWith(config.squadMerchantId)
      ? transactionRef
      : `${config.squadMerchantId}_${transactionRef}`;

    const body = {
      transaction_reference: ref,
      amount: (amount * 100).toString(), // Naira to kobo, string
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      currency_id: 'NGN',
      remark: remark || 'SabiWork payout'
    };

    const result = await this._request('POST', '/payout/transfer', body);
    return {
      success: true,
      nipRef: result.data?.nip_transaction_reference || null,
      transactionRef
    };
  }

  /**
   * Requery a payout that timed out (424 response)
   * IMPORTANT: Only call this after a 424 timeout. Never re-initiate the transfer.
   * @param {string} transactionRef - The payout reference to requery
   * @returns {Object} { status, nipRef }
   */
  async requeryPayout(transactionRef) {
    const body = {
      transaction_ref: transactionRef
    };

    const result = await this._request('POST', '/payout/requery', body);
    return {
      status: result.data?.transaction_status || 'pending',
      nipRef: result.data?.nip_transaction_reference || null
    };
  }

  /**
   * Create a dedicated virtual account for a worker or trader
   * Returns a GTBank account number that auto-logs income on credit
   * @param {Object} params
   * @param {string} params.customerId - Unique identifier (user UUID)
   * @param {string} params.firstName - User's first name
   * @param {string} params.lastName - User's last name
   * @param {string} params.phone - User's mobile number
   * @param {string} params.email - User's email (generated if not available)
   * @returns {Object} { accountNumber, bankName, accountName }
   */
  async createVirtualAccount({ customerId, firstName, lastName, phone, email, dob, gender, bvn, address }) {
    const body = {
      customer_identifier: customerId,
      first_name: firstName,
      last_name: lastName,
      mobile_num: phone,
      email: email || `${customerId}@sabiwork.ng`,
      dob: dob || '01/01/1990',
      gender: gender || '1', // 1 = Male, 2 = Female
      address: address || 'Lagos, Nigeria',
      beneficiary_account: config.squadMerchantId
    };

    // BVN required for virtual account creation
    if (bvn) {
      body.bvn = bvn;
    }

    const result = await this._request('POST', '/virtual-account', body);
    return {
      accountNumber: result.data.virtual_account_number,
      bankName: result.data.bank_name || 'GTBank',
      accountName: `${firstName} ${lastName}`
    };
  }

  /**
   * Verify a bank account number and get the account name
   * Used during worker onboarding to validate bank details before payouts
   * @param {string} bankCode - CBN bank code (e.g., '058' for GTBank) or NIP code
   * @param {string} accountNumber - 10-digit account number
   * @returns {Object} { accountName, accountNumber, bankCode }
   */
  async lookupAccount(bankCode, accountNumber) {
    // Squad requires the NIP code, not the CBN code
    // Map CBN codes to NIP codes for DMBs (3-digit codes)
    const nipCode = this._resolveNIPCode(bankCode);
    const body = {
      bank_code: nipCode,
      account_number: accountNumber
    };

    console.log(`[Squad] Account lookup: bank_code=${bankCode} → nip=${nipCode}, account=${accountNumber}`);
    const result = await this._request('POST', '/payout/account/lookup', body);
    return {
      accountName: result.data.account_name,
      accountNumber: result.data.account_number,
      bankCode
    };
  }

  /**
   * Resolve a CBN bank code to the correct NIP code for Squad API
   * DMBs use different NIP codes than their CBN codes
   */
  _resolveNIPCode(bankCode) {
    // NIP code mapping for Deposit Money Banks (DMBs)
    const CBN_TO_NIP = {
      '044': '000014', // Access Bank
      '023': '000009', // Citibank
      '050': '000010', // Ecobank
      '070': '000007', // Fidelity Bank
      '011': '000016', // First Bank
      '214': '000003', // FCMB
      '058': '000013', // GTBank
      '030': '000020', // Heritage Bank
      '082': '000002', // Keystone Bank
      '076': '000008', // Polaris Bank
      '221': '000012', // Stanbic IBTC
      '068': '000021', // Standard Chartered
      '232': '000001', // Sterling Bank
      '033': '000004', // UBA
      '032': '000018', // Union Bank
      '215': '000011', // Unity Bank
      '035': '000017', // Wema Bank
      '057': '000015', // Zenith Bank
    };

    // If it's already a 6-digit code (OFI/fintech), use as-is
    if (bankCode.length >= 6) {
      return bankCode;
    }

    // If we have a mapping, use the NIP code
    if (CBN_TO_NIP[bankCode]) {
      return CBN_TO_NIP[bankCode];
    }

    // Fallback: pad with zeros (may not work for all banks)
    return bankCode.padStart(6, '0');
  }

  /**
   * Verify Squad webhook signature (HMAC-SHA512)
   * @param {Object|string} body - Raw request body (parsed JSON object)
   * @param {string} signature - Value from x-squad-encrypted-body header
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(body, signature) {
    if (!signature || !config.squadWebhookSecret) {
      return false;
    }

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const hash = crypto
      .createHmac('sha512', config.squadWebhookSecret)
      .update(bodyString)
      .digest('hex')
      .toUpperCase();

    return hash === signature.toUpperCase();
  }
}

module.exports = new SquadService();
