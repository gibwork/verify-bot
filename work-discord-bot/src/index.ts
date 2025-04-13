import { 
  Client, 
  Events, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  CommandInteraction, 
  Interaction, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  ButtonInteraction
} from 'discord.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as nacl from 'tweetnacl'; // Import nacl for signature verification

dotenv.config();

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required');
if (!process.env.GUILD_ID) throw new Error('GUILD_ID is required');
if (!process.env.ROLE_ID) throw new Error('ROLE_ID is required');
if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is required');
if (!process.env.SUPABASE_KEY) throw new Error('SUPABASE_KEY is required');
if (!process.env.SOLANA_RPC_URL) throw new Error('SOLANA_RPC_URL is required');

const REQUIRED_BALANCE=200000;


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const solanaConnection = new Connection(process.env.SOLANA_RPC_URL);

const TOKEN_MINT_ADDRESS = 'F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump';

interface VerificationData {
  userId: string;
  action: 'new' | 'add';
}

const pendingVerifications = new Map<string, VerificationData>();

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your Solana wallet token holdings to get special roles')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL!;

// Function to check token balance for a wallet
async function checkTokenBalance(walletAddress: string): Promise<number> {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS);
    
    // Get all token accounts owned by the wallet
    const tokenAccounts = await solanaConnection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    // Find the specific token account for our token
    const tokenAccount = tokenAccounts.value.find(
      account => account.account.data.parsed.info.mint === tokenMintPublicKey.toString()
    );
    
    if (!tokenAccount) {
      return 0; // No token account found
    }
    
    // Get the token balance
    const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
    return balance;
  } catch (error) {
    console.error(`Error checking token balance for wallet ${walletAddress}:`, error);
    return 0;
  }
}

// Register commands when bot is ready
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');

    // Start the periodic balance check
    setInterval(checkAllBalances, 15 * 1000); // Run every 15 seconds (for testing, adjust as needed)
  } catch (error) {
    console.error(error);
  }
});

// Handle commands and interactions
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    if (interaction.isCommand()) {
      await handleCommandInteraction(interaction as CommandInteraction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction as ButtonInteraction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    // Reply with error if possible
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({ 
        content: 'An error occurred while processing your command.', 
        ephemeral: true 
      });
    }
  }
});

// Function to handle button interactions
async function handleButtonInteraction(interaction: ButtonInteraction) {
  const [action] = interaction.customId.split(':');
  
  if (action === 'new_wallet' || action === 'add_wallet') {
    // Generate a unique verification code
    const verificationCode = crypto.randomBytes(20).toString('hex');
    
    // Store the verification code with the user ID and action
    const actionMapping = {
      'new_wallet': 'new',
      'add_wallet': 'add'
    } as const;
    
    pendingVerifications.set(verificationCode, {
      userId: interaction.user.id,
      action: actionMapping[action as keyof typeof actionMapping]
    });
    
    // Create verification link
    const verificationLink = `${CLIENT_URL}/?code=${verificationCode}`;
    
    // Create button for verification
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Connect Solana Wallet')
          .setStyle(ButtonStyle.Link)
          .setURL(verificationLink)
      );
    
    const actionText = {
      'new_wallet': 'connect a new wallet',
      'add_wallet': 'add an additional wallet'
    };
    
    await interaction.reply({ 
      content: `**Wallet Verification - ${actionText[action as keyof typeof actionText]}**\nClick the button below to connect your Solana wallet and verify your token holdings.`,
      components: [row],
      ephemeral: true 
    });
    
    // Set timeout to remove verification code after 30 minutes
    setTimeout(() => {
      if (pendingVerifications.has(verificationCode)) {
        pendingVerifications.delete(verificationCode);
        console.log(`Verification code ${verificationCode.substring(0, 6)}... expired`);
      }
    }, 5 * 60 * 1000);
  }
}

// Function to handle command interactions
async function handleCommandInteraction(interaction: CommandInteraction) {
  if (interaction.commandName === 'verify') {
    // Check if user already has wallets
    const { data: existingUser } = await supabase
      .from('holders')
      .select('address')
      .eq('discord_user_id', interaction.user.id)
      .single();

    // Create buttons based on user status
    const row = new ActionRowBuilder<ButtonBuilder>();
    
    if (!existingUser) {
      // New user - only show connect wallet button
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Connect Wallet')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`new_wallet:${interaction.user.id}`)
      );
    } else {
      // Existing user - show add option
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Add More Wallets')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`add_wallet:${interaction.user.id}`)
      );
    }
    
    await interaction.reply({ 
      content: '**Wallet Verification**\nSelect an option below to manage your wallet verification:',
      components: [row],
      ephemeral: true 
    });
  }
}

// Helper function to verify a wallet signature
function verifySignature(message: string, signature: string, walletAddress: string): boolean {
  try {
    // Convert signature from base64 string to Uint8Array
    const signatureBytes = Buffer.from(signature, 'base64');
    
    // Convert wallet address string to PublicKey
    const publicKey = new PublicKey(walletAddress);
    
    // Convert message to Uint8Array
    const messageBytes = new TextEncoder().encode(message);
    
    // Verify signature
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}
//@ts-ignore
app.post('/api/verify-wallet', async (req: Request, res: Response) => {
  try {
    const { verificationCode, walletAddress, tokenBalance, signature, message } = req.body;
    
    // Validate request
    if (!verificationCode || !walletAddress || tokenBalance === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Signature verification - added for security
    if (!signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Signature verification required'
      });
    }
    
    // Verify the signature
    const isSignatureValid = verifySignature(message, signature, walletAddress);
    if (!isSignatureValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid signature. Failed to verify wallet ownership.'
      });
    }
    
    // Check if verification code exists
    if (!pendingVerifications.has(verificationCode)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired verification code' 
      });
    }
    
    const verificationData = pendingVerifications.get(verificationCode)!;
    const userId = verificationData.userId;
    const action = verificationData.action;
    
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    if (!guild) {
      return res.status(500).json({ 
        success: false, 
        message: 'Discord server not found' 
      });
    }
    
    try {
      const member = await guild.members.fetch(userId);

      const { data: existingUser, error: fetchError } = await supabase
        .from('holders')
        .select('*')
        .eq('discord_user_id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching user from database:', fetchError);
        return res.status(500).json({
          success: false,
          message: 'Database error while fetching user information'
        });
      }
      
      let addresses: string[] = [];
      let active = false;

      if (!existingUser) {
        addresses = [walletAddress];
      } else if (action === 'add') {
        addresses = [...(existingUser.address || []), walletAddress];
        addresses = [...new Set(addresses)];
      }
      
      // Check if any wallet has sufficient balance
      const currentBalance = await checkTokenBalance(walletAddress);
      const hasSufficientBalance = currentBalance >= REQUIRED_BALANCE;
      
      if (hasSufficientBalance) {
        active = true;
      } else if (existingUser && action === 'add') {
        active = await checkAnyWalletHasSufficientBalance(addresses);
      }
      
      if (existingUser) {
        const { error: updateError } = await supabase
          .from('holders')
          .update({
            username: member.user.username,
            address: addresses,
            active: active
          })
          .eq('discord_user_id', userId);
          
        if (updateError) {
          console.error('Error updating user data in Supabase:', updateError);
          return res.status(500).json({
            success: false,
            message: 'Database error while updating user information'
          });
        }
      } else {
        const { error: insertError } = await supabase
          .from('holders')
          .insert({
            username: member.user.username,
            discord_user_id: userId,
            address: addresses,
            active: active
          });
          
        if (insertError) {
          console.error('Error inserting user data in Supabase:', insertError);
          return res.status(500).json({
            success: false,
            message: 'Database error while inserting user information'
          });
        }
      }
      
      // Grant or remove role based on active status
      if (active) {
        // Grant the role if they don't already have it
        if (!member.roles.cache.has(process.env.ROLE_ID!)) {
          await member.roles.add(process.env.ROLE_ID!);
          try {
            await member.send('Verification successful! You have been granted the WORK HOLDER role.');
          } catch (dmError) {
            console.error('Could not send DM to user:', dmError);
          }
        }
      } else {
        // Remove the role if they have it
        if (member.roles.cache.has(process.env.ROLE_ID!)) {
          await member.roles.remove(process.env.ROLE_ID!);
        }
      }

      pendingVerifications.delete(verificationCode);
      
      if (active) {
        return res.json({ 
          success: true, 
          message: 'Verification successful! Role has been granted in Discord.' 
        });
      } else {
        return res.json({ 
          success: false, 
          message: `Insufficient token balance. You need at least ${REQUIRED_BALANCE} tokens across at least one wallet. This wallet's balance: ${currentBalance}` 
        });
      }
    } catch (error) {
      console.error('Error fetching member or processing verification:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process verification. Please contact an administrator.' 
      });
    }
  } catch (error) {
    console.error('Error processing verification:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

async function checkAnyWalletHasSufficientBalance(addresses: string[]): Promise<boolean> {
  for (const address of addresses) {
    const balance = await checkTokenBalance(address);
    if (balance >= REQUIRED_BALANCE) {
      return true;
    }
  }
  return false;
}

async function checkAllBalances() {
  try {
    const { data: holders, error } = await supabase
      .from('holders')
      .select('username, discord_user_id, address, active');
      
    if (error) {
      console.error('Error fetching holders from Supabase:', error);
      return;
    }
    
    if (!holders || holders.length === 0) {
      return;
    }
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    if (!guild) {
      console.error('Discord server not found');
      return;
    }
    for (const holder of holders) {
      try {
        const member = await guild.members.fetch(holder.discord_user_id).catch(() => null);
        
        if (!member) {
          console.log(`Could not find Discord member with ID ${holder.discord_user_id}`);
          continue;
        }
        const hasSufficientBalance = await checkAnyWalletHasSufficientBalance(holder.address || []);
        
        if (!hasSufficientBalance) {
          if (member.roles.cache.has(process.env.ROLE_ID!)) {
            await member.roles.remove(process.env.ROLE_ID!);
          }
          if (holder.active !== false) {
            const { error: updateError } = await supabase
              .from('holders')
              .update({ active: false })
              .eq('discord_user_id', holder.discord_user_id);
              
            if (updateError) {
              console.error(`Error updating active status for ${holder.username}:`, updateError);
            }
          }
        } else {
          if (!member.roles.cache.has(process.env.ROLE_ID!) || holder.active === false) {
            await member.roles.add(process.env.ROLE_ID!);
            
            const { error: updateError } = await supabase
              .from('holders')
              .update({ active: true })
              .eq('discord_user_id', holder.discord_user_id);
              
            if (updateError) {
              console.error(`Error updating active status for ${holder.username}:`, updateError);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${holder.username}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error checking balances:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Verification server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);