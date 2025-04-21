import { WalletContextState } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";

export interface SignMessageResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Utility function to sign messages with different wallet types
 * Includes special handling for Ledger wallets
 */
export async function signMessageWithWallet(
  message: string,
  wallet: WalletContextState
): Promise<SignMessageResult> {
  if (!wallet.signMessage) {
    return {
      success: false,
      error: "Wallet does not support message signing"
    };
  }

  try {
    // Detect if using Ledger (either directly or through Phantom)
    const isLedger = (
      wallet.wallet?.adapter.name === 'Ledger' ||
      (wallet.wallet?.adapter.name === 'Phantom' && message.toLowerCase().includes('ledger'))
    );

    // Create a message that's compatible with all wallets including Ledger
    const messageBuffer = new TextEncoder().encode(message);

    // For Ledger, we need to ensure the message is properly formatted
    const signature = await wallet.signMessage(
      isLedger ? new Uint8Array([...messageBuffer]) : messageBuffer
    );

    return {
      success: true,
      signature: Buffer.from(signature).toString('base64')
    };
  } catch (error: any) {
    // Handle specific Ledger errors
    if (
      error.message?.includes('Ledger') ||
      error.message?.includes('0x6985') ||
      error.message?.includes('rejected') ||
      error.message?.includes('failed to sign')
    ) {
      const walletName = wallet.wallet?.adapter.name as WalletName;
      let helpText = '';

      if (walletName === 'Phantom') {
        helpText = 'Try using Solflare wallet for Ledger devices, as it has better Ledger support.';
      } else if (walletName === 'Ledger') {
        helpText = 'Make sure your Ledger device is unlocked, has the Solana app open, and blind signing is enabled.';
      }

      return {
        success: false,
        error: `Failed to sign with ${walletName}: ${error.message}. ${helpText}`
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error while signing message'
    };
  }
} 