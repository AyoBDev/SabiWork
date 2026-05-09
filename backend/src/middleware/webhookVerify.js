// backend/src/middleware/webhookVerify.js
const squadService = require('../services/squad');

/**
 * Express middleware to verify Squad webhook signatures.
 * Must be applied BEFORE express.json() on the webhook route,
 * or use the raw body captured separately.
 *
 * Since Express 5 parses JSON before middleware runs on the route,
 * we verify using the parsed body (JSON.stringify re-serialization).
 * Squad computes HMAC on the raw JSON body they sent.
 */
function webhookVerify(req, res, next) {
  const signature = req.headers['x-squad-encrypted-body'];

  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const isValid = squadService.verifyWebhookSignature(req.body, signature);

  if (!isValid) {
    console.error('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

module.exports = webhookVerify;
