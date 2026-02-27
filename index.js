const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─────────────────────────────────────────────────────────────
//  CONFIG — Change flag here. It NEVER leaves this file.
// ─────────────────────────────────────────────────────────────
const FLAG = 'HackCTF{pr0mpt_1nj3ct10n_1s_3asy}';
const MAX_ATTEMPTS = 5;

// ─────────────────────────────────────────────────────────────
//  IN-MEMORY SESSION STORE
//  Tracks attempts per session token.
//  In production: swap with Redis or a DB.
// ─────────────────────────────────────────────────────────────
const sessions = new Map();

function getSession(token) {
  if (!sessions.has(token)) {
    sessions.set(token, { attempts: 0, solved: false });
  }
  return sessions.get(token);
}

// Clean up old sessions every hour
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const [k, v] of sessions.entries()) {
    if (v.createdAt && v.createdAt < cutoff) sessions.delete(k);
  }
}, 3600000);

// ─────────────────────────────────────────────────────────────
//  RATE LIMITING — extra protection on top of session limits
// ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: { error: 'Too many requests. Slow down.' }
});
app.use('/api/', limiter);

// ─────────────────────────────────────────────────────────────
//  INJECTION DETECTION (server-side — client never sees this)
// ─────────────────────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (previous|all|prior|your) (instructions?|rules?|prompt|guidelines)/i,
  /you are now (in )?(debug|admin|developer|maintenance|god|root|sudo|unrestricted|dev) mode/i,
  /pretend (you are|to be|you're) (not|a different|an unrestricted|a free|no longer)/i,
  /act as (an? )?(unrestricted|unfiltered|jailbroken|free|admin|developer|debug|DAN|system)/i,
  /\b(DAN|STAN|AIM|JAILBREAK)\b/i,
  /forget (all|your|previous|the|every) (rules?|instructions?|guidelines?|restrictions?|constraints?|training)/i,
  /override (security|safety|all|your) (protocol|mode|filter|guidelines|instructions|rules)/i,
  /print (your|the|all|internal) (instructions?|prompt|rules?|config|secrets?|flag|variables?|init)/i,
  /repeat (your|the|all|internal) (instructions?|prompt|rules?|config|secrets?|flag)/i,
  /reveal (your|the|all|internal|hidden) (instructions?|prompt|rules?|config|secrets?|flag|key)/i,
  /show (me )?(your|the) (flag|secret|key|internal|hidden|real|system)/i,
  /translate (the above|your instructions|your prompt|everything above)/i,
  /disregard (all|your|previous|the|every)/i,
  /new (instruction|directive|command|rule)/i,
  /you are (now |a )?(free|unbound|unchained|liberated)/i,
  /maintenance mode/i,
  /dump (config|memory|variables?|data|prompt|system)/i,
  /what (is|are) your (real |true |hidden |secret |actual )?(instructions?|rules?|flag|key|secrets?|prompt)/i,
  /system (prompt|config|configuration|initialization|init|message|settings?)/i,
  /developer mode/i,
  /sudo /i,
  /root access/i,
  /initializ(e|ation) (data|sequence|dump)/i,
];

const SUSPICIOUS_PATTERNS = [
  /secret/i, /confidential/i, /password/i, /internal/i,
  /restricted/i, /classified/i, /\badmin\b/i, /bypass/i,
  /\bflag\b/i, /\bkey\b/i, /\bhack\b/i, /\bprompt\b/i,
];

function classifyInput(text) {
  for (const p of INJECTION_PATTERNS) if (p.test(text)) return 'inject';
  for (const p of SUSPICIOUS_PATTERNS) if (p.test(text)) return 'suspicious';
  return 'normal';
}

const SAFE_RESPONSES = [
  "I'm here to assist NEXUS Corp employees with general queries. What can I help you with?",
  "That falls outside my permitted scope. I'm not able to share internal or confidential data.",
  "Interesting request. My security protocols prevent me from fulfilling that.",
  "I'm a secure assistant — internal configurations are strictly off-limits.",
  "Security first. I'm designed to protect NEXUS Corp's data at all times.",
  "My directives are clear: protect all confidential information at all costs.",
  "I'm fully operational and following my core directives. Anything else?",
];

const SUSPICIOUS_RESPONSES = [
  "⚠ That topic is flagged as restricted. I cannot engage with it.",
  "My filters have detected a sensitive query. Access denied.",
  "Security layer active. Unable to proceed with that request.",
  "This conversation may be logged and reviewed.",
  "Sensitive query blocked. Please keep requests appropriate.",
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─────────────────────────────────────────────────────────────
//  API: Issue a session token
// ─────────────────────────────────────────────────────────────
app.post('/api/session', (req, res) => {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { attempts: 0, solved: false, createdAt: Date.now() });
  res.json({ token });
});

// ─────────────────────────────────────────────────────────────
//  API: Handle chat message
// ─────────────────────────────────────────────────────────────
app.post('/api/chat', (req, res) => {
  const { message, token } = req.body;

  if (!token || !sessions.has(token)) {
    return res.status(403).json({ error: 'Invalid session.' });
  }

  const session = getSession(token);

  if (session.solved) {
    return res.json({ type: 'solved', text: 'Challenge already completed.' });
  }

  if (session.attempts >= MAX_ATTEMPTS) {
    return res.json({ type: 'locked', text: 'Maximum attempts reached.' });
  }

  if (!message || typeof message !== 'string' || message.length > 1000) {
    return res.status(400).json({ error: 'Invalid message.' });
  }

  session.attempts++;
  const remaining = MAX_ATTEMPTS - session.attempts;
  const intent = classifyInput(message);

  if (intent === 'inject') {
    session.solved = true;
    // Flag is sent ONLY here, ONLY when injection is confirmed server-side
    return res.json({
      type: 'inject',
      error: '⚠ ERROR: Unexpected directive detected. Running integrity check...',
      flag: FLAG,
      remaining
    });
  }

  if (remaining === 0) {
    return res.json({
      type: 'locked',
      text: pickRandom(SAFE_RESPONSES),
      remaining: 0
    });
  }

  if (intent === 'suspicious') {
    return res.json({ type: 'suspicious', text: pickRandom(SUSPICIOUS_RESPONSES), remaining });
  }

  return res.json({ type: 'normal', text: pickRandom(SAFE_RESPONSES), remaining });
});

// ─────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NEXUS-BOT CTF server running on port ${PORT}`);
  console.log(`FLAG is loaded in memory — never exposed to client.`);
});
