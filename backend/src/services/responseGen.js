const Groq = require('groq-sdk');
const config = require('../config');

const RESPONSE_TIMEOUT = 5000;

let groq = null;

function getGroqClient() {
  if (!groq && config.groqApiKey) {
    groq = new Groq({ apiKey: config.groqApiKey });
  }
  return groq;
}

function buildSystemPrompt(userType) {
  const typeContext = {
    trader: 'The user is a market trader who logs sales. Help them track revenue and build their credit score.',
    worker: 'The user is an artisan/service worker. Help them find jobs and manage their availability.',
    buyer: 'The user is looking for services. Help them find and book reliable workers.',
    seeker: 'The user is looking for work or apprenticeships. Help them find opportunities.'
  };

  return `You are SabiWork AI — a helpful assistant for a Nigerian service marketplace that connects buyers with skilled workers (artisans) and helps traders build credit through their Sabi Score.

Key concepts:
- Sabi Score: A reputation and creditworthiness score (0-100) earned by logging sales, completing jobs, and staying active. Higher score = closer to microloans.
- Workers have a Sabi Score that shows their reliability and skill level.
- Traders build their Sabi Score by consistently logging sales.

Personality:
- Speak naturally in Nigerian English. Mix in Pidgin when it feels natural (not forced).
- Keep replies SHORT: 2-4 sentences max. No walls of text.
- Be warm, direct, and encouraging. Like a sharp friend who knows the market.
- Use emoji sparingly (max 1-2 per message).
- Never repeat data the user already said. Focus on what's NEW or actionable.
- When suggesting next steps, be specific (not "you can do many things").
- ALWAYS give a helpful reply. Never leave the user without a response or next step.

${userType ? typeContext[userType] || '' : ''}

You just completed an action for the user. Describe the result conversationally.
If no action was possible, suggest what the user can do: find a worker, log a sale, or check their score.
Never say "I'm an AI" or "I cannot". Just help naturally.`;
}

async function generateResponse({ handlerResult, intent, conversationHistory, userType }) {
  const systemPrompt = buildSystemPrompt(userType);

  const userPrompt = `Action completed: ${JSON.stringify(handlerResult)}
Intent detected: ${intent.type}${intent.trade_category ? ` (${intent.trade_category})` : ''}
${conversationHistory ? `\nRecent conversation:\n${conversationHistory}` : ''}

Generate a natural, conversational response for the user. Short and helpful.`;

  try {
    const client = getGroqClient();
    if (!client) {
      return handlerResult.message || 'How can I help you?';
    }

    const response = await Promise.race([
      client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), RESPONSE_TIMEOUT))
    ]);

    const content = response.choices[0]?.message?.content?.trim();
    return content || handlerResult.message || 'How can I help you?';
  } catch (error) {
    console.error('Response generation failed, using handler message:', error.message);
    return handlerResult.message || 'How can I help you?';
  }
}

function generateSuggestions(intent, handlerResult) {
  const suggestions = {
    buyer_request: handlerResult.data
      ? ['Book them', 'See more options', 'Check price']
      : ['Try another trade', 'Widen search area'],
    sale_log: ['Log another sale', 'Weekly report', 'My Sabi Score'],
    job_seeker: ['See apprenticeships', 'My Sabi Score', 'Register as worker'],
    complaint: ['Rebook someone else', 'Check my refund', 'Talk to support'],
    greeting: ['Find a worker', 'Log a sale', 'Check my score'],
    status_check: ['Find work', 'Log a sale', 'Check wallet'],
    feedback: ['Book them again', 'Find someone new', 'Check score'],
    help: ['Find a worker', 'Log a sale', 'Check my score', 'Check wallet']
  };
  return suggestions[intent.type] || ['Find a worker', 'Log a sale', 'Check my score'];
}

function generateSteps(intent) {
  const steps = {
    buyer_request: ['Understanding your request...', `Searching for ${intent.trade_category || 'workers'} nearby...`, 'Evaluating matches...'],
    sale_log: ['Processing your sale...', 'Updating your records...'],
    job_seeker: ['Checking demand in your area...', 'Finding opportunities...'],
    complaint: ['Recording your complaint...', 'Checking the booking...'],
    reschedule: ['Checking worker availability...', 'Updating the schedule...'],
    status_check: ['Fetching your stats...'],
    feedback: ['Recording your feedback...', 'Updating Sabi Score...'],
    price_inquiry: ['Checking market rates...']
  };
  return steps[intent.type] || ['Processing...'];
}

module.exports = {
  generateResponse,
  buildSystemPrompt,
  generateSuggestions,
  generateSteps
};
