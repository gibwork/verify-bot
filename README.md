# Discord Verification Bot

A Discord bot that verifies users based on their Solana wallet token holdings. The bot integrates with Supabase for data storage and provides a seamless verification process for Discord server members.

## Features

- Discord slash command for wallet verification
- Solana token balance checking
- Supabase integration for data persistence
- Express server for handling verification requests
- Secure signature verification
- Role management based on token holdings

## Prerequisites

- Node.js (v16 or higher)
- PNPM package manager (v10.7.0 or higher)
- A Discord bot token
- A Supabase account and project
- A Solana RPC endpoint

## Environment Variables

Create a `.env` file in the `work-discord-bot` directory with the following variables:

```env
DISCORD_TOKEN=your_discord_bot_token
GUILD_ID=your_discord_guild_id
ROLE_ID=your_discord_role_id
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SOLANA_RPC_URL=your_solana_rpc_endpoint
PORT=3001
CLIENT_URL=your_client_url
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd verify-bot
```

2. Install dependencies:
```bash
cd work-discord-bot
pnpm install
```

3. Build the project:
```bash
pnpm build
```

4. Start the development server:
```bash
pnpm dev
```

## Project Structure

```
work-discord-bot/
├── src/
│   └── index.ts      # Main bot logic and server setup
├── package.json      # Project dependencies and scripts
└── .env             # Environment variables (create this)
```

## Contributing

1. Fork the repository
2. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```
3. Make your changes
4. Commit your changes:
```bash
git commit -m "Description of your changes"
```
5. Push to your fork:
```bash
git push origin feature/your-feature-name
```
6. Create a Pull Request

## Development Guidelines

- Follow TypeScript best practices
- Add appropriate error handling
- Include comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

## Available Scripts

- `pnpm dev`: Builds and runs the bot in development mode
- `pnpm build`: Compiles TypeScript to JavaScript

## Dependencies

- discord.js: Discord bot framework
- @solana/web3.js: Solana blockchain interaction
- @supabase/supabase-js: Supabase database client
- express: Web server framework
- typescript: TypeScript compiler

## License

ISC

## Support

For support, please open an issue in the repository or contact the maintainers.
