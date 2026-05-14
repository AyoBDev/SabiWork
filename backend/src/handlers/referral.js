const { v4: uuidv4 } = require('uuid');

async function handleReferral(intent, { user_id }) {
  const referralCode = uuidv4().slice(0, 8).toUpperCase();
  const referralLink = `https://sabiwork.ng/r/${referralCode}`;

  return {
    type: 'referral_generated',
    message: `Share this link with your friend: ${referralLink}`,
    data: { referral_code: referralCode, referral_link: referralLink, referrer_id: user_id }
  };
}

module.exports = { handleReferral };
