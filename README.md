# Work Verify Project

A comprehensive verification system consisting of a Discord bot and a web application for managing user verification and premium access.

## Project Overview

This project consists of two main components:

1. **Discord Bot** (`work-discord-bot/`): A bot that handles user verification and premium role management in Discord servers.
2. **Web Application** (`work-verify/`): A Next.js web application that provides a user interface for wallet verification and premium access management.

## Prerequisites

### Required Software
- Node.js (v18 or higher)
- pnpm (v10.7.0 or higher)
- Git

### Required Accounts
1. **Discord Developer Account**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Enable the "Bot" feature
   - Generate a bot token
   - Note down the Client ID

2. **Solana Wallet**
   - Install a Solana wallet (e.g., Phantom)
   - Create a new wallet or use an existing one
   - Ensure you have some SOL for testing

3. **Supabase Account**
   - Sign up at [Supabase](https://supabase.com)
   - Create a new project
   - Note down the project URL and anon key

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd verify-bot-main
```

### 2. Discord Bot Setup

1. Navigate to the Discord bot directory:
```bash
cd work-discord-bot
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure the `.env` file with the following values:
   - `DISCORD_TOKEN`: Your bot token from Discord Developer Portal
   - `CLIENT_ID`: Your application's Client ID from Discord Developer Portal
   - `GUILD_ID`: Your Discord server ID (enable Developer Mode in Discord settings to get this)
   - `PREMIUM_ROLE_ID`: Create a role in your Discord server and copy its ID
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon/public key
   - `SOLANA_RPC_URL`: Use a public RPC URL or your own node (e.g., `https://api.mainnet-beta.solana.com`)

5. Invite the bot to your server:
   - Go to Discord Developer Portal
   - Select your application
   - Go to OAuth2 > URL Generator
   - Select scopes: `bot` and `applications.commands`
   - Select bot permissions: `Administrator` (or specific permissions you need)
   - Copy the generated URL and open it in your browser
   - Select your server and authorize the bot

### 3. Web Application Setup

1. Navigate to the web application directory:
```bash
cd work-verify
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure the `.env` file:
   - `NEXT_PUBLIC_VERIFY_API_ENDPOINT`: Set to `http://localhost:3001/api/verify-wallet` for local development
   - `SOLANA_RPC_URL`: Same as in the Discord bot configuration

## Running the Project

### Discord Bot

1. Start the development server:
```bash
cd work-discord-bot
pnpm run dev
```

The bot will:
- Connect to Discord
- Register slash commands
- Start listening for interactions
- Log connection status to console

### Web Application

1. Start the development server:
```bash
cd work-verify
pnpm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

The application will:
- Connect to the Solana network
- Initialize the wallet adapter
- Start the verification process

## Testing the Integration

1. **Discord Bot Testing**
   - Use `/verify` command in your Discord server
   - The bot should respond with a verification link
   - Check if the bot assigns the premium role correctly

2. **Web Application Testing**
   - Connect your wallet
   - Complete the verification process
   - Verify that the premium role is assigned in Discord

## Contributing

### Development Workflow

1. **Setting Up Development Environment**
   ```bash
   # Fork the repository
   git clone <your-fork-url>
   cd verify-bot-main
   
   # Set up both applications
   cd work-discord-bot && pnpm install
   cd ../work-verify && pnpm install
   ```

2. **Creating a New Feature**
   ```bash
   # Create a new branch
   git checkout -b feature/your-feature-name
   
   # Make your changes
   # Test both applications
   # Commit your changes
   git commit -m "feat: description of your changes"
   
   # Push to your fork
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add comments for complex logic
- Write tests for new features
- Update documentation as needed

### Pull Request Process

1. Ensure your code builds successfully
2. Run all tests
3. Update the documentation if necessary
4. Submit your pull request with:
   - Clear description of changes
   - Screenshots if UI changes
   - Test results
   - Any relevant issue numbers

## Troubleshooting

### Common Issues

1. **Bot Not Responding**
   - Check if the bot is online
   - Verify environment variables
   - Check Discord server permissions

2. **Verification Not Working**
   - Ensure wallet is connected
   - Check RPC endpoint
   - Verify Supabase connection

3. **Web Application Issues**
   - Clear browser cache
   - Check console for errors
   - Verify environment variables

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Discord.js Documentation](https://discord.js.org/#/docs)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Supabase Documentation](https://supabase.com/docs)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Solana Developer Resources](https://solana.com/developers)

## Support

If you encounter any issues:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with:
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## Component Details

### Discord Bot (`work-discord-bot/`)

#### Core Features
1. **Slash Commands**
   - `/verify`: Initiates the wallet verification process
   - Automatically registers commands on bot startup

2. **Verification Flow**
   - Generates unique verification codes for each user
   - Creates verification links with embedded codes
   - Handles both new wallet connections and additional wallet additions
   - Verifies Solana wallet signatures
   - Checks token balances against required threshold

3. **Role Management**
   - Assigns premium roles based on token holdings
   - Periodically checks wallet balances (every 15 seconds)
   - Removes roles if balance falls below threshold

4. **Database Integration**
   - Uses Supabase for storing wallet addresses
   - Maintains user-wallet relationships
   - Tracks verification status

#### Implementation Details

1. **Environment Setup**
   ```typescript
   // Required environment variables
   DISCORD_TOKEN=your_bot_token
   GUILD_ID=your_server_id
   ROLE_ID=your_premium_role_id
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   SOLANA_RPC_URL=your_rpc_url
   ```

2. **Token Verification**
   ```typescript
   // Token configuration
   const TOKEN_MINT_ADDRESS = 'F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump';
   const REQUIRED_BALANCE = 200000; // Minimum token balance required
   ```

3. **API Endpoints**
   - `/api/verify-wallet`: Handles wallet verification requests
   - `/api/check-balance`: Checks token balances
   - `/api/verify-signature`: Verifies wallet signatures

### Web Application (`work-verify/`)

#### Core Features
1. **Wallet Connection**
   - Supports multiple Solana wallets (Phantom, Solflare, etc.)
   - Handles wallet connection/disconnection
   - Manages wallet state

2. **Verification Process**
   - Displays verification status
   - Shows token balance information
   - Handles verification code validation
   - Provides feedback on verification status

3. **User Interface**
   - Clean, modern design
   - Responsive layout
   - Clear status indicators
   - Error handling and user feedback

#### Implementation Details

1. **Environment Setup**
   ```typescript
   // Required environment variables
   NEXT_PUBLIC_VERIFY_API_ENDPOINT=http://localhost:3001/api/verify-wallet
   SOLANA_RPC_URL=your_rpc_url
   ```

2. **Key Components**
   - `WalletProvider.tsx`: Manages wallet connection state
   - `VerifyContent.tsx`: Handles verification process
   - API routes in `app/api/`: Handle backend communication

3. **API Integration**
   ```typescript
   // Example API call
   const verifyWallet = async (walletAddress: string, signature: string) => {
     const response = await fetch('/api/verify-wallet', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ walletAddress, signature })
     });
     return response.json();
   };
   ```

## Development Guide

### Discord Bot Development

1. **Adding New Commands**
   ```typescript
   // Example command registration
   const commands = [
     new SlashCommandBuilder()
       .setName('your-command')
       .setDescription('Command description')
       .toJSON()
   ];
   ```

2. **Handling Interactions**
   ```typescript
   client.on(Events.InteractionCreate, async (interaction) => {
     if (interaction.isCommand()) {
       // Handle slash commands
     } else if (interaction.isButton()) {
       // Handle button clicks
     }
   });
   ```

3. **Testing Commands**
   - Use Discord's test mode
   - Monitor console logs
   - Check database entries
   - Verify role assignments

### Web Application Development

1. **Adding New Components**
   ```typescript
   // Example component structure
   export default function YourComponent() {
     const { wallet } = useWallet();
     // Component logic
     return (
       <div>
         {/* JSX */}
       </div>
     );
   }
   ```

2. **Styling Guidelines**
   - Use Tailwind CSS classes
   - Follow responsive design principles
   - Maintain consistent spacing
   - Use semantic HTML

3. **Testing Components**
   - Test wallet connection
   - Verify API integration
   - Check responsive behavior
   - Validate error handling

## Deployment Guide

### Discord Bot Deployment

1. **Environment Setup**
   - Set up production environment variables
   - Configure production RPC endpoint
   - Update Supabase credentials

2. **Deployment Steps**
   ```bash
   # Build the bot
   cd work-discord-bot
   pnpm run build

   # Start the bot
   node dist/index.js
   ```

3. **Monitoring**
   - Set up logging
   - Monitor error rates
   - Track command usage
   - Watch for failed verifications

### Web Application Deployment

1. **Build Process**
   ```bash
   cd work-verify
   pnpm run build
   ```

2. **Environment Configuration**
   - Update API endpoints
   - Configure production RPC
   - Set up environment variables

3. **Deployment Options**
   - Vercel (recommended)
   - Netlify
   - Self-hosted

4. **Post-Deployment**
   - Verify wallet connections
   - Test verification flow
   - Check API integration
   - Monitor error rates


