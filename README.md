# Verify Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
A robust token verification system for Discord, granting roles based on Solana token holdings. This project ensures secure and automated role management for token-gated communities.

## Overview

Verify Bot provides a seamless way for Discord server administrators to implement token-gated access control. Users verify ownership of their Solana wallet and associated token balances to gain specific roles within the server.

The system comprises two core components:

1.  **Web Application (`work-verify`)**: A Next.js application where users connect their Solana wallets, sign a message to prove ownership, and initiate the verification process.
2.  **Discord Bot (`work-discord-bot`)**: A Node.js application using Discord.js that handles user interactions within Discord (via slash commands), communicates with the web application's API, checks token balances against the Solana blockchain, updates user records in a Supabase database, and manages role assignments/removals based on token holdings.

### Key Features

* **Secure Wallet Verification**: Uses cryptographic signatures to confirm wallet ownership securely.
* **Token Gating**: Assigns Discord roles based on configurable Solana token holdings (specific token mint address and required balance).
* **Automated Role Management**: The bot can periodically check balances (implementation-dependent) to add/remove roles automatically.
* **Database Integration**: Leverages Supabase for persistent storage of verification status and user data.
* **Clear User Flow**: Simple `/verify` command in Discord directs users to the web app for a guided verification process.

## Live Demo

The web application component is deployed for demonstration purposes at:
**[https://verify-bot-zeta.vercel.app/](https://verify-bot-zeta.vercel.app/)**

*Note: To fully use the demo application, you typically need a unique verification code provided by interacting with the associated Discord bot instance in a configured server.*

## Prerequisites

Before starting, ensure you have the following installed and configured:

* **Node.js**: Version 18.0 or higher ([Download](https://nodejs.org/))
* **pnpm**: Version 8.0 or higher. Install via npm:
    ```bash
    npm install -g pnpm
    ```
* **Discord Application & Bot Token**: Create one via the [Discord Developer Portal](https://discord.com/developers/applications). You'll need:
    * Bot Token
    * Client ID
    * Ensure necessary Privileged Gateway Intents (like Server Members Intent) are enabled for your bot.
* **Supabase Project**: Set up a project at [Supabase.io](https://supabase.com/). You'll need:
    * Project URL
    * `anon` Public Key
* **Solana RPC URL**: An endpoint to communicate with the Solana network. Obtain one from providers such as:
    * [Helius](https://helius.xyz/)
    * [QuickNode](https://quicknode.com/)
    * [Alchemy](https://www.alchemy.com/)
    * Or others (consider rate limits and reliability).

## Installation

Follow these steps to set up both the web application and the Discord bot locally.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/gibwork/verify-bot.git](https://github.com/gibwork/verify-bot.git)
    cd verify-bot
    ```

2.  **Set Up the Web Application (`work-verify`):**
    ```bash
    cd work-verify

    # Install dependencies
    pnpm install

    # Create local environment file from example
    cp .env.example .env
    ```
    Edit the newly created `.env` file with your specific configuration:
    ```dotenv
    # URL where the Discord Bot's verification API endpoint is running
    NEXT_PUBLIC_VERIFY_API_ENDPOINT=http://localhost:3001/api/verify-wallet # Adjust port if needed

    # Solana RPC endpoint for client-side checks (if any)
    SOLANA_RPC_URL=YOUR_SOLANA_RPC_ENDPOINT_HERE

    # Configuration for the specific token and balance (exposed to client)
    NEXT_PUBLIC_SPECIFIC_TOKEN_MINT="F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump" # Replace with your token mint address
    NEXT_PUBLIC_REQUIRED_BALANCE=200000 # Replace with required balance (in smallest unit, e.g., lamports)
    ```

3.  **Set Up the Discord Bot (`work-discord-bot`):**
    ```bash
    cd ../work-discord-bot # Navigate back to root and into the bot directory

    # Install dependencies
    pnpm install

    # Create local environment file from example
    cp .env.example .env
    ```
    Edit the newly created `.env` file with your specific configuration:
    ```dotenv
    # Discord Bot Credentials
    DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
    CLIENT_ID=YOUR_DISCORD_APP_CLIENT_ID_HERE
    GUILD_ID=YOUR_TARGET_DISCORD_SERVER_ID_HERE # Server where roles are managed
    ROLE_ID=YOUR_TARGET_DISCORD_ROLE_ID_HERE   # Role to assign upon verification

    # Supabase Credentials
    SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL_HERE
    SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY_HERE # Use anon key unless service_role is strictly required

    # Solana RPC Endpoint (for server-side balance checks)
    SOLANA_RPC_URL=YOUR_SOLANA_RPC_ENDPOINT_HERE

    # URL of the deployed Web Application (for generating verification links)
    CLIENT_URL=http://localhost:3000 # Use deployed URL in production

    # Port for the bot's internal API/server (if applicable)
    PORT=3001

    # Configuration for the specific token and balance (used server-side)
    TOKEN_MINT_ADDRESS="F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump" # Replace with your token mint address
    REQUIRED_BALANCE=200000 # Replace with required balance (in smallest unit, e.g., lamports)
    ```
    **Note:** Ensure `CLIENT_URL` points to the correct address where the `work-verify` web application is accessible (localhost for dev, deployed URL for production). Ensure the token/balance values match between both `.env` files.

## Database Setup (Supabase)

This project uses Supabase for data persistence.

1.  Navigate to your Supabase project dashboard.
2.  Go to the `SQL Editor` section.
3.  Click `+ New query`.
4.  Paste and run the following SQL script to create the `holders` table:

    ```sql
    CREATE TABLE public.holders (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL, -- Discord username (consider storing discriminator or using just ID)
      discord_user_id TEXT UNIQUE NOT NULL, -- Discord User ID (primary link)
      address TEXT[] NOT NULL, -- Array to store verified Solana wallet addresses
      active BOOLEAN DEFAULT FALSE, -- Flag indicating if the user currently holds the required balance/role
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_verified_at TIMESTAMP WITH TIME ZONE -- Optional: Track last successful verification time
    );

    -- Optional: Add Row Level Security (RLS) policies for enhanced data security
    -- ALTER TABLE public.holders ENABLE ROW LEVEL SECURITY;
    -- CREATE POLICY "Allow individual read access" ON public.holders FOR SELECT USING (auth.uid()::text = discord_user_id); -- Example policy
    ```

5.  Retrieve your Supabase Project URL and `anon` key from `Settings` > `API` in your Supabase dashboard and add them to the respective `.env` files as shown in the Installation section.

## Running the Application

You need to run both the web application and the Discord bot simultaneously.

### Development Mode

Open two separate terminal windows/tabs:

1.  **Start the Web Application:**
    ```bash
    cd path/to/verify-bot/work-verify
    pnpm dev
    ```
    *(Typically runs on `http://localhost:3000`)*

2.  **Start the Discord Bot:**
    ```bash
    cd path/to/verify-bot/work-discord-bot
    pnpm dev
    ```
    *(The bot will connect to Discord and may run its API on `http://localhost:3001` as configured)*

### Production Mode

1.  **Build and Start the Web Application:**
    ```bash
    cd path/to/verify-bot/work-verify
    pnpm build
    pnpm start
    ```

2.  **Build and Start the Discord Bot:**
    ```bash
    cd path/to/verify-bot/work-discord-bot
    pnpm build
    node dist/index.js # Or use a process manager like pm2
    ```

## Usage Flow

1.  **Invite Bot:** Invite the configured Discord bot to your target server (`GUILD_ID`).
2.  **Initiate Verification:** In a channel where the bot has permissions, a user types the `/verify` slash command.
3.  **Receive Link:** The bot responds (often ephemerally) with a unique link to the web application (`CLIENT_URL`) possibly containing a one-time code.
4.  **Connect & Sign:** The user clicks the link, opens the web application, connects their Solana wallet, and signs a message presented by the application to prove ownership.
5.  **Verification Request:** The web application sends the signed message and user details to the Discord bot's verification API endpoint (`NEXT_PUBLIC_VERIFY_API_ENDPOINT`).
6.  **Backend Processing:** The Discord bot backend verifies the signature, checks the user's wallet balance for the required token (`TOKEN_MINT_ADDRESS`, `REQUIRED_BALANCE`) via the `SOLANA_RPC_URL`.
7.  **Database & Role Update:** If verification is successful, the bot updates the user's record in the Supabase `holders` table and assigns the designated `ROLE_ID` in the Discord server. The user receives confirmation.

## Configuration

Key configuration options are managed via environment variables (`.env` files) in their respective application directories (`work-verify` and `work-discord-bot`).

* **Token & Balance:**
    * `NEXT_PUBLIC_SPECIFIC_TOKEN_MINT` / `TOKEN_MINT_ADDRESS`: The mint address of the Solana token to verify.
    * `NEXT_PUBLIC_REQUIRED_BALANCE` / `REQUIRED_BALANCE`: The minimum quantity of the token required (in its smallest denomination).
    * **Important:** Ensure these values are identical in both `work-verify/.env` and `work-discord-bot/.env`.
* **Discord:**
    * `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `ROLE_ID`: Essential for bot operation and role assignment.
* **Supabase:**
    * `SUPABASE_URL`, `SUPABASE_KEY`: For database interaction.
* **URLs:**
    * `SOLANA_RPC_URL`: Crucial for blockchain communication.
    * `CLIENT_URL`: Points the bot to the web verification page.
    * `NEXT_PUBLIC_VERIFY_API_ENDPOINT`: Points the web app to the bot's verification API.

**It is strongly recommended to manage configuration via environment variables rather than hardcoding values directly in the source code.**

## Contributing

Contributions are highly welcome! Please follow standard GitHub flow:

1.  **Fork** the repository.
2.  Create a **new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/my-awesome-feature
    ```
3.  Make your changes, adhering to the existing code style.
4.  **Commit** your changes with descriptive messages:
    ```bash
    git commit -am 'feat: Implement feature X' -m 'Detailed description of changes...'
    ```
5.  **Push** your branch to your fork:
    ```bash
    git push origin feature/my-awesome-feature
    ```
6.  Open a **Pull Request** against the main repository's `main` (or relevant) branch.

Please ensure any relevant tests are updated or added.
## Project Structure

Here is an overview of the key directories and files within the project, based on the current layout:

```bash
verify-bot/
├── work-verify/            # Next.js Web Application
│   ├── app/                # Next.js app directory
│   │   ├── page.tsx        # Main page component
│   │   ├── layout.tsx      # Root layout component
│   │   └── api/            # API routes (handled within Next.js)
│   ├── components/         # React components
│   │   ├── VerifyContent.tsx # Main verification component
│   │   └── WalletProvider.tsx  # Solana wallet adapter provider
│   ├── .env.example        # Example environment variables for the web app
│   └── ...                 # Other configuration and source files for Next.js

├── work-discord-bot/       # Discord Bot Service (Node.js)
│   ├── src/                # Bot source code directory
│   │   └── index.ts        # Main bot application entry point
│   ├── .env.example        # Example environment variables for the bot
│   └── ...                 # Other configuration and source files for the bot

├── .gitignore
└── README.md               # This file

```

## Troubleshooting

* **Discord Bot Offline/Unresponsive:**
    * Verify `DISCORD_TOKEN` in `work-discord-bot/.env` is correct and the bot is running (`pnpm dev` or `node dist/index.js`).
    * Check Discord Developer Portal: Ensure necessary Gateway Intents are enabled. Check bot permissions in the server.
    * Inspect bot logs for startup errors.
* **Web App Wallet Connection Issues:**
    * Ensure browser wallet extension (Phantom, Solflare, etc.) is installed and enabled.
    * Verify `SOLANA_RPC_URL` in `work-verify/.env` is correct and accessible.
* **`/verify` Command Fails / Link Not Working:**
    * Ensure the bot has registered slash commands (may take time to propagate).
    * Check `CLIENT_URL` in `work-discord-bot/.env` points to the correct running web application address.
    * Verify the `NEXT_PUBLIC_VERIFY_API_ENDPOINT` in `work-verify/.env` points to the bot's running API. Check for CORS issues if domains differ.
* **Verification Succeeds but Role Not Assigned:**
    * Confirm `ROLE_ID` and `GUILD_ID` in `work-discord-bot/.env` are correct.
    * In Discord Server Settings > Roles: Ensure the bot's own role is positioned *higher* than the role it needs to assign.
    * Verify the bot has the `Manage Roles` permission.
    * Check Supabase `holders` table to see if the user record was updated correctly. Check bot logs for errors during role assignment.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details. (Note: Assumes a LICENSE file exists, create one if needed).

## Acknowledgements

This project utilizes several outstanding open-source libraries and services:

* [Next.js](https://nextjs.org/)
* [React](https://reactjs.org/)
* [Discord.js](https://discord.js.org/)
* [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/)
* [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
* [Supabase](https://supabase.com/)
* [pnpm](https://pnpm.io/)
* [TypeScript](https://www.typescriptlang.org/)
