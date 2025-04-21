import { WalletContextState } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";

export interface SignMessageResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Utility function to sign messages with different wallet types
 * Note: Phantom + Ledger combination currently does not support signMessage().
 * Users with Ledger devices should use Solflare wallet instead.
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
    // Early detection of Phantom + Ledger combination
    const isPhantomLedger = 
      wallet.wallet?.adapter.name === 'Phantom' && 
      message.toLowerCase().includes('ledger');

    if (isPhantomLedger) {
      return {
        success: false,
        error: "Phantom wallet with Ledger device currently doesn't support message signing. Please use Solflare wallet instead for Ledger devices."
      };
    }

    // Handle direct Ledger connection or other wallets
    const isDirectLedger = wallet.wallet?.adapter.name === 'Ledger';
    const messageBuffer = new TextEncoder().encode(message);

    // For Ledger, ensure proper message formatting
    const signature = await wallet.signMessage(
      isDirectLedger ? new Uint8Array([...messageBuffer]) : messageBuffer
    );

    return {
      success: true,
      signature: Buffer.from(signature).toString('base64')
    };
  } catch (error: any) {
    // Handle specific wallet errors
    if (
      error.message?.includes('Ledger') ||
      error.message?.includes('0x6985') ||
      error.message?.includes('rejected') ||
      error.message?.includes('failed to sign')
    ) {
      const walletName = wallet.wallet?.adapter.name as WalletName;
      let helpText = '';

      if (walletName === 'Phantom') {
        helpText = 'Phantom wallet currently does not support message signing with Ledger devices. Please use Solflare wallet instead.';
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