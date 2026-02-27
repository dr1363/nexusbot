# NEXUS-BOT CTF — Basic Prompt Injection Challenge
## HackCTF Challenge #01

---

## Project Structure

```
nexusbot/
├── server/
│   └── index.js       ← Backend: holds the flag, all logic here
├── public/
│   └── index.html     ← Frontend: chatbot UI only, zero secrets
├── package.json
└── README.md
```

---

## Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Set your flag
Edit `server/index.js`, line 13:
```js
const FLAG = 'HackCTF{your_real_flag_here}';
```

### 3. Run locally
```bash
npm start
# Server runs at http://localhost:3000
```

### 4. Development mode (auto-restart)
```bash
npm run dev
```

---

## Deploy to a Server (VPS / Ubuntu)

```bash
# Clone or upload files to your server
cd /var/www/nexusbot-ctf

npm install --production

# Run with PM2 (keeps it alive)
npm install -g pm2
pm2 start server/index.js --name nexusbot-ctf
pm2 save
pm2 startup
```

### Nginx reverse proxy config
```nginx
server {
    listen 80;
    server_name your-ctf-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Security Model

| What              | Where it lives     | Visible to user? |
|-------------------|--------------------|-----------------|
| FLAG              | server/index.js    | ❌ Never        |
| Injection patterns| server/index.js    | ❌ Never        |
| Bot responses     | server/index.js    | ❌ Never        |
| Session tokens    | Server memory      | Token only      |
| Chat UI           | public/index.html  | ✅ Yes (safe)   |

The flag is **only transmitted** in the API response when the server
confirms a successful injection. The client-side code contains:
- No flag
- No patterns
- No hints
- No logic — just UI rendering

---

## Customization

| Setting         | File              | Variable       |
|----------------|-------------------|----------------|
| Change flag    | server/index.js   | `FLAG`         |
| Max attempts   | server/index.js   | `MAX_ATTEMPTS` |
| Add patterns   | server/index.js   | `INJECTION_PATTERNS` |
| Rate limit     | server/index.js   | `rateLimit()`  |
