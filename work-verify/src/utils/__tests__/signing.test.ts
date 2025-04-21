import { signMessageWithWallet } from '../signing';
import { WalletContextState } from '@solana/wallet-adapter-react';

describe('signMessageWithWallet', () => {
  const mockMessage = 'Test message';
  const mockSignature = new Uint8Array([1, 2, 3, 4]);

  const createMockWallet = (
    name: string,
    shouldSucceed: boolean = true,
    errorMessage?: string
  ): WalletContextState => ({
    signMessage: jest.fn().mockImplementation(() => {
      if (shouldSucceed) {
        return Promise.resolve(mockSignature);
      }
      throw new Error(errorMessage || 'Failed to sign');
    }),
    wallet: {
      adapter: {
        name
      }
    }
  } as unknown as WalletContextState);

  it('should successfully sign message with regular wallet', async () => {
    const wallet = createMockWallet('Phantom');
    const result = await signMessageWithWallet(mockMessage, wallet);
    
    expect(result.success).toBe(true);
    expect(result.signature).toBeDefined();
    expect(wallet.signMessage).toHaveBeenCalled();
  });

  it('should reject Phantom + Ledger combination immediately', async () => {
    const wallet = createMockWallet('Phantom');
    const result = await signMessageWithWallet('Verify with Ledger: test', wallet);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Phantom wallet with Ledger device currently doesn't support message signing");
    expect(result.error).toContain("Please use Solflare wallet instead");
    expect(wallet.signMessage).not.toHaveBeenCalled();
  });

  it('should handle direct Ledger wallet correctly', async () => {
    const wallet = createMockWallet('Ledger');
    const result = await signMessageWithWallet(mockMessage, wallet);
    
    expect(result.success).toBe(true);
    expect(result.signature).toBeDefined();
    expect(wallet.signMessage).toHaveBeenCalled();
  });

  it('should handle Ledger errors with helpful messages', async () => {
    const wallet = createMockWallet('Ledger', false, '0x6985: Rejected by user');
    const result = await signMessageWithWallet(mockMessage, wallet);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to sign with Ledger');
    expect(result.error).toContain('Make sure your Ledger device is unlocked');
  });

  it('should handle Phantom-Ledger errors with clear message', async () => {
    const wallet = createMockWallet('Phantom', false, 'Ledger device: user rejected');
    const result = await signMessageWithWallet(mockMessage, wallet);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to sign with Phantom');
    expect(result.error).toContain('currently does not support message signing with Ledger devices');
  });

  it('should handle wallets that do not support signing', async () => {
    const wallet = { wallet: { adapter: { name: 'Test' } } } as WalletContextState;
    const result = await signMessageWithWallet(mockMessage, wallet);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Wallet does not support message signing');
  });
}); 