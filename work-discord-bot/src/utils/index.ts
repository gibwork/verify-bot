import { Connection, PublicKey, TransactionMessage } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import { supabase } from '../config';
import { ServerConfig , Holder } from '../types';

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export async function validateAuthTx(serializedTx: string, nonce: string, walletAddress: string, rpcUrl: string): Promise<boolean> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const tx = await connection.getTransaction(serializedTx, {
      commitment: 'finalized'
    });

    if (!tx) {
      throw new Error("Transaction not found or not yet confirmed.");
    }
    if(!tx || !tx.transaction || !tx.transaction.message) {
      console.log('Transaction not found');
      return false;
    }
    const msg = TransactionMessage.decompile(tx.transaction.message);
    const inx = msg.instructions.filter(
      (inx) => inx.programId.equals(MEMO_PROGRAM_ID)
    )[0];
    if(inx === undefined) {
      console.log('No memo instruction found');
      return false;
    }
    if (!inx.programId.equals(MEMO_PROGRAM_ID)) {
      console.log('Transaction not using memo program');
      return false;
    }

    if (inx.data.toString() !== nonce) {
      console.log('Transaction memo data does not match expected nonce', inx.data.toString(), nonce);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating auth transaction:', error);
    return false;
  }
}

export function verifySignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  try {
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();
    const messageBytes = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error(
      `Error verifying signature for wallet ${walletAddress}:`,
      error
    );
    return false;
  }
}

export async function checkTokenBalanceRawNumber(
  walletAddress: string,
  tokenMintAddress: string,
  rpcUrl: string
): Promise<number> {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(tokenMintAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: tokenMintPublicKey }
    );
    if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
      return 0;
    }
    let totalRawBalance = 0;
    for (const accountInfo of tokenAccounts.value) {
      if (accountInfo?.account?.data?.parsed?.info?.tokenAmount?.amount) {
        totalRawBalance += Number(
          accountInfo.account.data.parsed.info.tokenAmount.amount
        );
      }
    }
    if (totalRawBalance > Number.MAX_SAFE_INTEGER) {
      console.warn(
        `[Precision Warning] Calculated raw balance ${totalRawBalance} for ${walletAddress} (Token: ${tokenMintAddress}) exceeds Number.MAX_SAFE_INTEGER.`
      );
    }
    return totalRawBalance;
  } catch (error) {
    console.error(
      `Error checking raw token balance (Number) for wallet ${walletAddress} (Token: ${tokenMintAddress}, RPC: ${rpcUrl}):`,
      error
    );
    return 0;
  }
}

export async function checkAnyWalletHasSufficientBalanceNumber(
  addresses: string[] | null | undefined,
  tokenMintAddress: string,
  requiredBalance: number,
  rpcUrl: string
): Promise<boolean> {
  if (!addresses || addresses.length === 0) return false;
  if (requiredBalance > Number.MAX_SAFE_INTEGER) {
    console.warn(
      `[Precision Warning] Required balance ${requiredBalance} exceeds Number.MAX_SAFE_INTEGER.`
    );
  }
  for (const address of addresses) {
    const balance = await checkTokenBalanceRawNumber(
      address,
      tokenMintAddress,
      rpcUrl
    );
    if (balance >= requiredBalance) {
      return true;
    }
  }
  return false;
}

export function formatBalanceNumber(
  rawBalance: number | string,
  decimals: number | null | undefined
): string {
  const balanceNum =
    typeof rawBalance === "string" ? parseFloat(rawBalance) : rawBalance;
  if (isNaN(balanceNum)) {
    return "NaN";
  }
  if (balanceNum > Number.MAX_SAFE_INTEGER) {
    console.warn(
      `[Precision Warning] Formatting balance ${balanceNum} which exceeds Number.MAX_SAFE_INTEGER.`
    );
  }
  const dec = decimals ?? 0;
  const divisor = Math.pow(10, dec);
  const uiAmount = balanceNum / divisor;
  return uiAmount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: dec,
  });
}

export async function getServerConfig(guildId: string): Promise<ServerConfig | null> {
  try {
    const { data, error } = await supabase
      .from("servers")
      .select("*")
      .eq("server_id", guildId)
      .maybeSingle();
    if (error) {
      console.error(`Error fetching server config for ${guildId}:`, error);
      return null;
    }
    if (!data || !data.setup_complete) {
      return null;
    }

    return {
      ...data,
      required_balance: String(data.required_balance), // Ensure it's string
      token_decimals:
        data.token_decimals !== null ? Number(data.token_decimals) : null,
    } as ServerConfig;
  } catch (e) {
    console.error(`Unexpected error in getServerConfig for ${guildId}:`, e);
    return null;
  }
}

export async function updateServerConfig(
  guildId: string, 
  updateData: Partial<ServerConfig>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("servers")
      .update({
        ...updateData,
        updated_at: new Date().toISOString() 
      })
      .eq("server_id", guildId);
    
    if (error) {
      console.error(`Error updating server config for ${guildId}:`, error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error(`Unexpected error updating server config for ${guildId}:`, e);
    return false;
  }
}

export async function createOrUpdateServerConfig(
  data: Omit<ServerConfig, 'created_at' | 'updated_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("servers")
      .upsert(
        {
          ...data,
          updated_at: new Date().toISOString()
        }, 
        { onConflict: "server_id" }
      );
    
    if (error) {
      console.error(`Error upserting server config for ${data.server_id}:`, error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error(`Unexpected error upserting server config for ${data.server_id}:`, e);
    return false;
  }
}

export async function getHolderData(userId: string, guildId: string): Promise<Holder | null> {
  try {
    const { data, error } = await supabase
      .from("holders")
      .select("*")
      .eq("discord_user_id", userId)
      .eq("server_id", guildId)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching holder data for ${userId} in ${guildId}:`, error);
      return null;
    }
    
    return data as Holder | null;
  } catch (e) {
    console.error(`Unexpected error in getHolderData for ${userId} in ${guildId}:`, e);
    return null;
  }
}

export async function updateHolderData(
  userId: string, 
  guildId: string, 
  updateData: Partial<Omit<Holder, 'id' | 'discord_user_id' | 'server_id' | 'created_at'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("holders")
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq("discord_user_id", userId)
      .eq("server_id", guildId);
    
    if (error) {
      console.error(`Error updating holder data for ${userId} in ${guildId}:`, error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error(`Unexpected error updating holder data for ${userId} in ${guildId}:`, e);
    return false;
  }
}

export async function createOrUpdateHolder(
  data: Omit<Holder, 'id' | 'created_at' | 'updated_at'>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("holders")
      .upsert(
        { 
          ...data,
          updated_at: new Date().toISOString()
        }, 
        { onConflict: "discord_user_id, server_id" }
      );
    
    if (error) {
      console.error(`Error upserting holder data for ${data.discord_user_id} in ${data.server_id}:`, error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error(`Unexpected error upserting holder data for ${data.discord_user_id} in ${data.server_id}:`, e);
    return false;
  }
}

export async function getAllServers(): Promise<ServerConfig[]> {
  try {
    const { data, error } = await supabase
      .from("servers")
      .select("*")
      .eq("setup_complete", true);
    
    if (error) {
      console.error("Error fetching all servers:", error);
      return [];
    }
    
    return data as ServerConfig[] || [];
  } catch (e) {
    console.error("Unexpected error fetching all servers:", e);
    return [];
  }
}

export async function getServerHolders(guildId: string): Promise<Holder[]> {
  try {
    const { data, error } = await supabase
      .from("holders")
      .select("*")
      .eq("server_id", guildId);
    
    if (error) {
      console.error(`Error fetching holders for server ${guildId}:`, error);
      return [];
    }
    
    return data as Holder[] || [];
  } catch (e) {
    console.error(`Unexpected error fetching holders for server ${guildId}:`, e);
    return [];
  }
}