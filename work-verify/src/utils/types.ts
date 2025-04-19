export interface PlatformFee {
    amount: string;
    mint: string;
}
  
export interface QuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee: PlatformFee | null;
    priceImpactPct: string;
    contextSlot: number;
    timeTaken: number;
}

export interface SwapResponse {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports?: number;
    simulationError?: string;
}

export interface TokenBalance  {
    mint: string;
    amount: number;
    decimals: number;
    lamports: string;
};
  
export interface SignatureData  {
    signature: string;
    message: string;
};
  
export interface PlatformFee {
    amount: string;
    feeBps: number;
}

export interface ServerVerificationConfig {
  tokenAddress: string;
  requiredBalance: string;
  tokenSymbol?: string;
  tokenDecimals: number;
  serverName?: string;
}