// backend/src/utils/eventBus.js
const redis = require('./redis');

/**
 * Publish a rich event to the dashboard_events channel.
 * All events get a consistent shape for the agent feed.
 */
function emit(type, { actor, description, metadata = {} }) {
  const event = {
    event_type: type,
    actor: actor || 'system',
    description,
    metadata,
    timestamp: new Date().toISOString()
  };

  redis.publish('dashboard_events', JSON.stringify(event));
  return event;
}

module.exports = { emit };
