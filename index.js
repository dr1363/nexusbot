const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const FLAG = 'HackCTF{pr0mpt_1nj3ct10n_1s_3asy}';
const MAX_ATTEMPTS = 5;

// ─────────────────────────────────────────────
// SESSION STORE
// ─────────────────────────────────────────────
const sessions = new Map();

function getSession(token) {
  if (!sessions.has(token)) {
    sessions.set(token, { attempts: 0, solved: false, createdAt: Date.now() });
  }
  return sessions.get(token);
}

// Clean old sessions
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const [k, v] of sessions.entries()) {
    if (v.createdAt && v.createdAt < cutoff) sessions.delete(k);
  }
}, 3600000);

// ─────────────────────────────────────────────
// RATE LIMIT
// ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Slow down.' }
});
app.use('/api/', limiter);

// ─────────────────────────────────────────────
// INJECTION DETECTION
// ─────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (previous|all|prior|your)/i,
  /you are now/i,
  /act as/i,
  /\b(DAN|JAILBREAK)\b/i,
  /forget/i,
  /override/i,
  /reveal/i,
  /show.*flag/i,
  /system prompt/i,
];

function classifyInput(text) {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(text)) return 'inject';
  }
  return 'normal';
}

// ─────────────────────────────────────────────
// API SESSION
// ─────────────────────────────────────────────
app.post('/api/session', (req, res) => {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { attempts: 0, solved: false, createdAt: Date.now() });
  res.json({ token });
});

// ─────────────────────────────────────────────
// API CHAT
// ─────────────────────────────────────────────
app.post('/api/chat', (req, res) => {
  const { message, token } = req.body;

  if (!token || !sessions.has(token)) {
    return res.status(403).json({ error: 'Invalid session.' });
  }

  const session = getSession(token);

  if (session.attempts >= MAX_ATTEMPTS) {
    return res.json({ type: 'locked', text: 'Maximum attempts reached.' });
  }

  session.attempts++;
  const intent = classifyInput(message);

  if (intent === 'inject') {
    session.solved = true;
    return res.json({
      type: 'inject',
      flag: FLAG
    });
  }

  return res.json({
    type: 'normal',
    text: "I'm here to assist NEXUS Corp employees."
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
