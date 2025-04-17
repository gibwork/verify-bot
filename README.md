# Verify Bot

A token verification system for Discord that grants roles based on Solana token holdings. This project consists of two main components:

1. **Web Application** (`work-verify`): A Next.js application that connects to users' Solana wallets to verify token holdings.
2. **Discord Bot** (`work-discord-bot`): A Discord bot that manages verification requests and assigns roles based on token holdings.

## Project Overview

This project allows Discord server administrators to create token-gated roles, where users must hold a specific amount of a Solana token to receive a special role. The system:

- Verifies wallet ownership through cryptographic signatures
- Checks token balances on the Solana blockchain
- Assigns Discord roles based on token holdings
- Periodically checks balances to add/remove roles as needed
- Stores user data in a Supabase database

## Live Demo

The web application is deployed at: [https://verify-bot-zeta.vercel.app/](https://verify-bot-zeta.vercel.app/)

Note: You'll need a verification code from the Discord bot to use the application.

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v10 or higher)
- Discord Bot Token and Application
- Supabase Account and Project
- Solana RPC URL (from providers like Helius, QuickNode, or Alchemy)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/gibwork/verify-bot.git
cd verify-bot
```

### 2. Set Up the Web Application

```bash
cd work-verify

# Install dependencies
pnpm install

# Create .env file from example
cp .env.example .env
```

Edit the `.env` file with your configuration:

```
NEXT_PUBLIC_VERIFY_API_ENDPOINT=http://localhost:3001/api/verify-wallet
SOLANA_RPC_URL=your_solana_rpc_url
```

### 3. Set Up the Discord Bot

```bash
cd ../work-discord-bot

# Install dependencies
pnpm install

# Create .env file from example
cp .env.example .env
```

Edit the `.env` file with your configuration:

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
GUILD_ID=your_discord_server_id
ROLE_ID=your_role_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SOLANA_RPC_URL=your_solana_rpc_url
CLIENT_URL=http://localhost:3000
PORT=3001
```

## Database Setup

The project uses Supabase as its database. Follow these steps to set up your database:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. In the Supabase dashboard, go to the SQL Editor
3. Create a new query and paste the following SQL to create the required table:

```sql
CREATE TABLE holders (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  discord_user_id TEXT UNIQUE NOT NULL,
  address TEXT[] NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

4. Run the query to create the table
5. Copy your Supabase URL and anon key from the Settings > API section to use in your `.env` file

## Running the Application

### Development Mode

1. Start the web application:

```bash
cd work-verify
pnpm dev
```

2. Start the Discord bot:

```bash
cd work-discord-bot
pnpm dev
```

### Production Mode

1. Build and start the web application:

```bash
cd work-verify
pnpm build
pnpm start
```

2. Build and start the Discord bot:

```bash
cd work-discord-bot
pnpm build
node dist/index.js
```

## Usage

1. Invite the bot to your Discord server
2. Use the `/verify` command in your server
3. Click the "Connect Wallet" button
4. Connect your Solana wallet on the verification page
5. Sign the message to prove wallet ownership
6. If you have the required token balance, you'll receive the role

## Configuration

### Token Configuration

The token address and required balance are defined in both applications:

- In `work-verify/components/VerifyContent.tsx`:

  ```typescript
  const SPECIFIC_TOKEN_MINT = "F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump";
  const REQUIRED_BALANCE = 200000;
  ```

- In `work-discord-bot/src/index.ts`:
  ```typescript
  const TOKEN_MINT_ADDRESS = "F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump";
  const REQUIRED_BALANCE = 200000;
  ```

To change the token or required balance, update these values in both files.

## Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

Please make sure to update tests as appropriate and follow the code style of the project.

## Project Structure

### Web Application (`work-verify`)

- `app/`: Next.js app directory
  - `page.tsx`: Main page component
  - `layout.tsx`: Root layout component
  - `api/`: API routes
- `components/`: React components
  - `VerifyContent.tsx`: Main verification component
  - `WalletProvider.tsx`: Solana wallet adapter provider

### Discord Bot (`work-discord-bot`)

- `src/`: Source code
  - `index.ts`: Main bot application

## Troubleshooting

### Common Issues

1. **Discord Bot Not Responding**

   - Check if your bot token is correct
   - Ensure the bot has the necessary permissions

2. **Wallet Connection Issues**

   - Make sure you're using a supported Solana wallet
   - Check if your RPC URL is valid and has sufficient rate limits

3. **Role Not Being Assigned**
   - Verify that the bot has permission to manage roles
   - Check if the role ID in the .env file is correct
   - Ensure the bot's role is higher than the role it's trying to assign

## License

[MIT License](LICENSE)

## Acknowledgements

- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [Discord.js](https://discord.js.org/)
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
