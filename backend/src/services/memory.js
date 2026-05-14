const redis = require('../utils/redis');

const SESSION_TTL = 1800; // 30 minutes
const MAX_MESSAGES = 10; // 5 pairs

function sessionKey(userId) {
  return `chat:session:${userId}`;
}

async function getSession(userId) {
  const raw = await redis.get(sessionKey(userId));
  if (!raw) {
    return { messages: [], context: { last_intent: null, last_worker_match: null, pending_action: null }, user_type: null };
  }
  return JSON.parse(raw);
}

async function saveSession(userId, session) {
  await redis.set(sessionKey(userId), JSON.stringify(session), 'EX', SESSION_TTL);
}

async function addMessage(userId, role, text, meta = {}) {
  const session = await getSession(userId);

  if (meta.user_type) {
    session.user_type = meta.user_type;
  }

  session.messages.push({ role, text, ts: Date.now() });

  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(session.messages.length - MAX_MESSAGES);
  }

  await saveSession(userId, session);
  return session;
}

async function updateContext(userId, contextUpdate) {
  const session = await getSession(userId);
  session.context = { ...session.context, ...contextUpdate };
  await saveSession(userId, session);
  return session;
}

async function getHistoryForPrompt(userId, maxPairs = 3) {
  const session = await getSession(userId);
  const msgs = session.messages.slice(-(maxPairs * 2 + 1));
  return msgs.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
}

async function clearSession(userId) {
  await redis.del(sessionKey(userId));
}

async function disconnect() {
  await redis.quit();
}

module.exports = {
  getSession,
  addMessage,
  updateContext,
  getHistoryForPrompt,
  clearSession,
  disconnect
};
