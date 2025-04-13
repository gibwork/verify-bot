# 🔒 Verify Bot: Solana Wallet-Based Discord Authentication System

![License](https://img.shields.io/badge/License-MIT-blue)  
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6)  
![Next.js](https://img.shields.io/badge/Next.js-13.4.19-000000)

A secure and scalable Solana token-gated authentication system for Discord. This monorepo contains:

- **🌐 `work-verify`** – A Next.js frontend for wallet connection and verification  
- **🤖 `work-discord-bot`** – A Node.js Discord bot that assigns roles based on token ownership  


🔗 **Live Demo**: [https://verify-bot-zeta.vercel.app](https://verify-bot-zeta.vercel.app)

Use `/verify` in your Discord server to begin the process.

---

## 🚀 Features

- ✅ Cryptographic wallet signature verification  
- 🧠 Real-time Solana token balance checks  
- 🔁 Automatic Discord role assignment  
- 🔐 Supabase-based user tracking  
- ⚙️ TypeScript monorepo with modular structure  

---

## 🧠 System Architecture

![Architecture Diagram](./image2.png)

This diagram illustrates the flow between the user, Discord bot, web frontend, Solana blockchain, and Supabase. It highlights how wallet verification, token checking, and role assignment are handled securely and efficiently.

---

## ✅ Usage

1. Invite the bot to your Discord server  
2. In any server channel, run the `/verify` command  
3. The bot responds with a wallet verification link  
4. Click the link to open the web app  
5. Connect your Solana wallet and sign the message  
6. If your token balance meets the configured threshold, a role will be assigned in Discord

---

## 🗂️ Project Structure

```
verify-bot/
├── work-verify/            # 🌐 Next.js frontend
├── work-discord-bot/       # 🤖 Discord bot
└── README.md               # Documentation
```

---

## 🛠️ Tech Stack

- **Languages**: TypeScript (97.1%), CSS (1.5%), JavaScript (1.4%)  
- **Frontend**: Next.js (React)  
- **Bot Framework**: Discord.js  
- **Blockchain SDK**: Solana Web3.js  
- **Database**: Supabase  
- **Package Manager**: pnpm  
- **Backend Server**: Express.js

---

## ✅ Prerequisites

Before you begin, make sure you have the following set up:

- **Node.js**: Version 18.0 or newer ([Download](https://nodejs.org/))  
- **pnpm**: Version 8.0 or above. Install it using:
  ```bash
  npm install -g pnpm
  ```
- **Discord Application & Bot**: Create one via the [Discord Developer Portal](https://discord.com/developers/applications). You’ll need:
  - Bot Token  
  - Client ID  
  - Enable **Privileged Gateway Intents** like "Server Members Intent"
- **Supabase Project**: Create a project on [Supabase.io](https://supabase.com/) and obtain:
  - Project URL  
  - Public `anon` Key  
- **Solana RPC Endpoint**: Use a reliable provider:
  - [Helius](https://helius.xyz/)  
  - [QuickNode](https://quicknode.com/)  
  - [Alchemy](https://www.alchemy.com/)  
  - Others (ensure you account for rate limits and uptime)  

---

## ⚙️ Installation & Setup

### 1. Web App Setup (`work-verify`)

```bash
cd work-verify
pnpm install
cp .env.example .env
```

Update your `.env` with:

```dotenv
NEXT_PUBLIC_VERIFY_API_ENDPOINT=http://localhost:3001/api/verify-wallet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SPECIFIC_TOKEN_MINT=F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump
NEXT_PUBLIC_REQUIRED_BALANCE=200000
```

### 2. Discord Bot Setup (`work-discord-bot`)

```bash
cd ../work-discord-bot
pnpm install
cp .env.example .env
```

Then configure the environment:

```dotenv
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-discord-client-id
GUILD_ID=your-server-id
ROLE_ID=role-to-assign-after-verification

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
CLIENT_URL=http://localhost:3000
PORT=3001

TOKEN_MINT_ADDRESS=F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump
REQUIRED_BALANCE=200000
```

🎯 Ensure all token-related and balance-related variables match in both `.env` files.

---

## 🧠 Supabase Database Setup

1. Navigate to your Supabase dashboard  
2. Go to **SQL Editor** → **+ New Query**  
3. Run:

```sql
CREATE TABLE public.holders (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  discord_user_id TEXT UNIQUE NOT NULL,
  address TEXT[] NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified_at TIMESTAMP WITH TIME ZONE
);
```

4. Copy your Supabase `URL` and `anon` key from the **API settings** and plug them into your `.env` files.

---

## ⚙️ Configuration Summary

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SPECIFIC_TOKEN_MINT` / `TOKEN_MINT_ADDRESS` | Solana token mint used for verification |
| `NEXT_PUBLIC_REQUIRED_BALANCE` / `REQUIRED_BALANCE` | Required token balance in smallest units (lamports) |
| `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `ROLE_ID` | Discord bot credentials and role settings |
| `SUPABASE_URL`, `SUPABASE_KEY` | Supabase configuration |
| `SOLANA_RPC_URL` | Solana RPC node |
| `CLIENT_URL` | Web app deployment URL |
| `NEXT_PUBLIC_VERIFY_API_ENDPOINT` | Endpoint the frontend calls to verify wallets |

---

## 💬 Bot Commands

| Command    | Description                         |
|------------|-------------------------------------|
| `/verify`  | Start the wallet verification flow  |
| `/status`  | Check your current verification     |
| `/help`    | Get help and instructions           |

---

## 🔐 Security Considerations

- ✅ Wallet signatures are validated cryptographically  
- ✅ Environment secrets must be kept private (`.env`)  
- ✅ All API routes are rate-limited to prevent abuse  
- ✅ Token balances are periodically rechecked to maintain security  

---

## 🧪 Troubleshooting

**Bot is Offline or Doesn’t Respond:**

- Check if the `DISCORD_TOKEN` is valid  
- Ensure the bot is running (`pnpm dev` or `node dist/index.js`)  
- Verify gateway intents are enabled in the Discord Developer Portal  
- Confirm bot permissions in the server  
- Look at logs for any startup issues  

**Web App Can't Connect Wallet:**

- Make sure a browser wallet extension (Phantom, Solflare, etc.) is active  
- Check that `SOLANA_RPC_URL` is valid and accessible  

**`/verify` Command Fails or Link Doesn't Work:**

- It might take time for slash commands to sync on Discord  
- Confirm that `CLIENT_URL` points to the web app  
- Ensure `NEXT_PUBLIC_VERIFY_API_ENDPOINT` matches the API route  
- If deployed on different domains, watch for CORS issues  

**Verification Passes but Role Isn't Assigned:**

- Verify `ROLE_ID` and `GUILD_ID` in `.env`  
- In Discord, the bot’s role must be above the target role  
- The bot must have permission to manage roles  
- Check Supabase’s `holders` table for the user’s data  
- Review logs for any assignment errors  

---

## 🏃 Running the Application

### Development Mode

```bash
# Terminal 1: Web App
cd work-verify
pnpm dev

# Terminal 2: Discord Bot
cd work-discord-bot
pnpm dev
```

### Production

```bash
# Web App
cd work-verify
pnpm build
pnpm start

# Bot
cd ../work-discord-bot
node dist/index.js
```

---

## 📈 Monitoring

Check if the bot server is running:

```bash
curl http://localhost:3001/health
```

If using a process manager (e.g., systemd):

```bash
journalctl -u verify-bot -f
```

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch  
3. Commit your changes  
4. Open a pull request 🚀

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Acknowledgements

- [Solana](https://solana.com)  
- [Supabase](https://supabase.com)  
- [Discord.js](https://discord.js.org)  
- [Vercel](https://vercel.com)