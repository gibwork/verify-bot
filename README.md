<h1 align="center">Solana Token Verification Bot for Discord</h1>

<div align="center">

[![Status](https://img.shields.io/badge/status-active-success.svg)](https://github.com/gibwork/verify-bot)
[![GitHub Issues](https://img.shields.io/github/issues/gibwork/verify-bot.svg)](https://github.com/gibwork/verify-bot/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/gibwork/verify-bot.svg)](https://github.com/gibwork/verify-bot/pulls)

</div>

---

<p align="center">
  A system for verifying Solana token holdings to grant specific roles in a Discord server.
  <br>
  It consists of a Discord bot for user interaction and a Next.js web application for wallet connection and verification.
</p>

## 📝 Table of Contents

- [🧐 About](#about)
- [🏗️ Project Structure](#project_structure)
- [🏁 Getting Started](#getting_started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment_variables)
  - [Database Setup](#database_setup)
  - [Running the Project](#running_the_project)
- [⛏️ Built Using](#built_using)
- [🤝 Contributing](#contributing)
- [✍️ Authors](#authors)
- [🎉 Acknowledgements](#acknowledgement)

## 🧐 About <a name="about"></a>

This project provides a robust way for Discord communities to gate access or grant special roles based on whether users hold a specific amount of a particular Solana SPL token.

The workflow is as follows:

1.  A user runs the `/verify` command in the Discord server.
2.  The Discord bot (`work-discord-bot`) presents the user with options to connect a new wallet or add more wallets.
3.  The bot generates a unique verification link pointing to the Next.js web application (`work-verify`).
4.  The user visits the link, connects their Solana wallet (using Solana Wallet Adapter).
5.  The web app prompts the user to sign a message containing a unique code to prove wallet ownership.
6.  Upon successful signing, the web app sends the wallet address, signature, message, and verification code to the bot's backend API.
7.  The bot's backend verifies the signature, checks the token balance for the specified SPL token using a Solana RPC endpoint, and determines if the user meets the requirement (potentially across multiple linked wallets).
8.  User data (Discord ID, username, wallet addresses, active status) is stored and updated in a Supabase database.
9.  If the balance requirement is met, the bot assigns the configured "Premium Role" to the user in Discord.
10. The bot periodically re-checks balances for all registered users and updates roles/database status accordingly.

## 🏗️ Project Structure <a name="project_structure"></a>

The repository contains two main applications:

```
.
├── work-discord-bot/  # The Discord bot and its backend API
│   ├── src/index.ts
│   ├── .env.example
│   └── package.json
│
├── work-verify/       # The Next.js frontend for wallet verification
│   ├── app/
│   │   ├── page.tsx
│   │   └── api/rpc/
│   ├── components/
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## 🏁 Getting Started <a name="getting_started"></a>

Follow these instructions to set up the project locally for development and testing.

### Prerequisites <a name="prerequisites"></a>

- **Node.js:** Version 18 or higher (check Discord.js and Next.js requirements).
- **pnpm:** The project uses pnpm for package management.
  ```sh
  npm install -g pnpm
  ```
- **Discord Bot Application:** You need to create a Discord Application and Bot in the [Discord Developer Portal](https://discord.com/developers/applications).
  - Requires a Bot Token (`DISCORD_TOKEN`).
  - Requires the Application's Client ID (`CLIENT_ID`).
  - Requires the Guild (Server) ID where the bot will operate (`GUILD_ID`).
  - Requires the ID of the role to assign upon verification (`ROLE_ID`).
- **Supabase Account:** For storing user and wallet information.
  - Requires Supabase Project URL (`SUPABASE_URL`).
  - Requires Supabase Anon Key (`SUPABASE_KEY`).
- **Solana RPC Endpoint:** A reliable Solana RPC endpoint URL (`SOLANA_RPC_URL`). You can get one from providers like Helius, Triton, QuickNode, or use a public one.

### Installation <a name="installation"></a>

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/gibwork/verify-bot.git
    cd verify-bot
    ```

2.  **Install Backend Dependencies:**
    Navigate to the bot directory and install its dependencies.
    ```bash
    cd work-discord-bot
    pnpm install
    ```
3.  **Install Frontend Dependencies:**
    Navigate to the frontend directory and install its dependencies.
    ```bash
    cd work-verify
    pnpm install
    ```

### Environment Variables <a name="environment_variables"></a>

You need to create `.env` files in both the `work-discord-bot` and `work-verify` directories based on their respective `.env.example` files.

1.  **Bot Environment (`work-discord-bot/.env`):**

    ```dotenv
    # From Discord Developer Portal
    DISCORD_TOKEN=your_discord_bot_token
    CLIENT_ID=your_discord_application_id
    GUILD_ID=your_discord_server_id
    ROLE_ID=your_premium_role_id # Role to grant upon verification

    # From your Supabase project settings
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_KEY=your_supabase_anon_key

    # Your chosen Solana RPC endpoint
    SOLANA_RPC_URL=your_solana_rpc_url

    # URL where the work-verify app is running (for verification links)
    # Default development URL: http://localhost:3000
    CLIENT_URL=http://localhost:3000
    ```

2.  **Web App Environment (`work-verify/.env`):**

    ```dotenv
    # URL of the bot's verification API endpoint
    # Default development URL: http://localhost:3001/api/verify-wallet
    NEXT_PUBLIC_VERIFY_API_ENDPOINT=http://localhost:3001/api/verify-wallet

    # Your chosen Solana RPC endpoint (used by the RPC proxy)
    SOLANA_RPC_URL=your_solana_rpc_url
    ```

> [!NOTE]  
> Ensure `SOLANA_RPC_URL` is the same in both `.env` files.

### Database Setup <a name="database_setup"></a>

You need to set up a table in your Supabase project to store holder information.

1.  Go to your Supabase project dashboard.
2.  Navigate to the `Table Editor`.
3.  Create a new table named `holders`.
4.  Define the following columns:

### Database Setup <a name="database_setup"></a>

You need to set up a table in your Supabase project to store holder information.

1.  Go to your Supabase project dashboard.
2.  Navigate to the `Table Editor`.
3.  Create a new table named `holders`.
4.  Define the following columns:

| Name              | Type                                   | Description                                            |
| :---------------- | :------------------------------------- | :----------------------------------------------------- |
| `id`              | `int8, primary key, auto-incrementing` |                                                        |
| `created_at`      | `timestamptz default now()`            |                                                        |
| `username`        | `text`                                 | Discord username                                       |
| `discord_user_id` | `text`                                 | Discord user ID (should be unique)                     |
| `address`         | `jsonb` or `text[]`                    | Array of verified Solana wallet addresses              |
| `active`          | `boolean`                              | Whether the user currently meets the token requirement |

> [!Tip]
> Enable Row Level Security (RLS) on the table and define appropriate policies if needed for production, but it can be disabled for local development.

### Running the Project <a name="running_the_project"></a>

1.  **Start the Discord Bot:**

    ```bash
    cd work-discord-bot
    pnpm dev
    ```

    This will start the bot server (typically on port 3001).

2.  **Start the Web App:**
    Open _another_ terminal tab and run:
    ```bash
    cd work-verify
    pnpm dev
    ```
    This will start the Next.js development server (typically on port 3000).

Now, you should be able to:

- Invite your Discord bot to your test server (`GUILD_ID`).
- Run the `/verify` command in Discord.
- Click the button in the bot's response to open the web app (`http://localhost:3000`).
- Connect your wallet, sign the message, and complete the verification process.
- Check if the role (`ROLE_ID`) is assigned/removed correctly in Discord and if the `holders` table in Supabase is updated.

## ⛏️ Built Using <a name="built_using"></a>

**Backend (Discord Bot):**

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Discord.js](https://discord.js.org/)
- [Express](https://expressjs.com/)
- [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/)
- [@solana/spl-token](https://spl.solana.com/token)
- [@supabase/supabase-js](https://supabase.com/docs/library/getting-started)
- [dotenv](https://github.com/motdotla/dotenv)
- [tweetnacl](https://github.com/dchest/tweetnacl-js)

**Frontend:**

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter)
- [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🤝 Contributing <a name="contributing"></a>

Contributions are welcome! Please follow these steps:

1.  **Fork the Repository:** Create your own fork of the project.
2.  **Create a Branch:** Make a new branch for your feature or bug fix.
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/issue-description
    ```
3.  **Make Changes:** Implement your changes or fixes in your branch.
4.  **Commit:** Write clear and concise commit messages.
    ```bash
    git commit -m "feat: Add feature X" -m "Detailed description of the changes."
    # or
    git commit -m "fix: Resolve issue Y" -m "Explanation of the fix."
    ```
5.  **Push:** Push your changes to your forked repository.
    ```bash
    git push origin feature/your-feature-name
    ```
6.  **Open a Pull Request (PR):** Submit a PR from your branch to the `main` branch of the original `gibwork/verify-bot` repository.
    - Provide a clear title and description for your PR.
    - Link any relevant issues (e.g., `Closes #123`).

Please ensure your code is well-commented, especially in complex areas. If you're adding new features, consider adding basic tests if possible.

## ✍️ Authors <a name="authors"></a>

- **[Shivaji Raut](https://github.com/shivaji43)**
- **[anthonyliriano Anthony](https://github.com/anthonyliriano)**
- **[NIKHIL KUMAR](https://github.com/NiKHiLkr23)**

See also the list of [contributors](https://github.com/gibwork/verify-bot/contributors) who participated in this project.

## 🎉 Acknowledgements <a name="acknowledgement"></a>

- Thanks to the creators of the libraries and frameworks used.
- Inspiration from various token-gating projects in the Solana ecosystem.
