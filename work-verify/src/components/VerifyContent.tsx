"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { VersionedTransaction, LAMPORTS_PER_SOL, Transaction, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { confirmTransaction } from "@/utils/action";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Buffer } from "buffer";
import {
  SOL_MINT,
  JUPITER_QUOTE_API,
  JUPITER_SWAP_API,
  DISCORD_API_URL,
} from "@/utils/config";
import {
  TokenBalance,
  SignatureData,
  QuoteResponse,
  SwapResponse,
  ServerVerificationConfig,
} from "@/utils/types";

if (!DISCORD_API_URL) {
  console.error(
    "FATAL ERROR: NEXT_PUBLIC_VERIFY_API_ENDPOINT environment variable is not set!"
  );
}

if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
  window.Buffer = Buffer;
}

export default function VerifyContent() {
  const { connection } = useConnection();
  const { publicKey, connected, signMessage, sendTransaction } = useWallet();
  const searchParams = useSearchParams();
  const verificationCode = searchParams.get("code");

  const [serverConfig, setServerConfig] =
    useState<ServerVerificationConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(
    null
  );
  const [signingMessage, setSigningMessage] = useState(false);

  const [isLedgerFlow, setIsLedgerFlow] = useState(false);
  const [signingTransaction, setSigningTransaction] = useState(false);
  const isFetchingBalanceRef = useRef(false);

  const [swapLoading, setSwapLoading] = useState<boolean>(false);
  const [swapSuccess, setSwapSuccess] = useState<boolean>(false);
  const [swapTxId, setSwapTxId] = useState<string | null>(null); // State to hold the latest tx ID
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Fetch verification configuration from backend
  useEffect(() => {
    const fetchConfig = async () => {
      if (!verificationCode) {
        console.error("useEffect Error: Missing verification code.");
        setConfigError("Missing verification code in URL.");
        setLoadingConfig(false);
        return;
      }
      if (!DISCORD_API_URL) {
        console.error("useEffect Error: API URL not configured.");
        setConfigError("API URL is not configured.");
        setLoadingConfig(false);
        return;
      }

      setLoadingConfig(true);
      setConfigError(null);
      setServerConfig(null);
      console.log(
        `[VerifyContent] Attempting to fetch context for code: ${verificationCode.substring(
          0,
          6
        )}...`
      );

      try {
        const fetchUrl = `${DISCORD_API_URL}/verification-context?code=${verificationCode}`;
        const response = await fetch(fetchUrl);
        console.log(
          `[VerifyContent] Fetch response status: ${response.status}`
        );

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error(
            "[VerifyContent] Failed to parse JSON response:",
            jsonError
          );
          if (!response.ok) {
            throw new Error(
              `HTTP Error: ${response.status} - ${response.statusText}. Response body not valid JSON.`
            );
          } else {
            throw new Error("Received non-JSON response from server.");
          }
        }

        if (!response.ok) {
          throw new Error(
            data.message ||
              `Error fetching config: ${response.status} - ${response.statusText}`
          );
        }

        if (!data.success || !data.context) {
          console.error(
            "[VerifyContent] Invalid data structure received:",
            data
          );
          throw new Error(
            data.message || "Invalid context data received from server."
          );
        }

        const context = data.context;

        if (
          !context.tokenAddress ||
          context.requiredBalance === undefined ||
          context.tokenDecimals === undefined
        ) {
          console.error(
            "[VerifyContent] Incomplete context received:",
            context
          );
          throw new Error("Incomplete configuration received from server.");
        }

        const fetchedConfig: ServerVerificationConfig = {
          tokenAddress: context.tokenAddress,
          requiredBalance: String(context.requiredBalance),
          tokenSymbol: context.tokenSymbol,
          tokenDecimals: Number(context.tokenDecimals ?? 0),
          serverName: context.serverName,
        };

        setServerConfig(fetchedConfig);
      } catch (err) {
        console.error(
          "[VerifyContent] Configuration fetch/process error:",
          err
        );
        const message =
          err instanceof Error ? err.message : "Failed to load configuration.";
        setConfigError(message);
        setServerConfig(null);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [verificationCode]);

  // Format wallet address (shortened)
  const formatWalletAddress = (address: string): string =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  // Format lamports to SOL string
  const formatSolAmount = (lamports: string | number | undefined): string => {
    if (lamports === undefined || lamports === null) return "...";
    try {
      const amountNum = Number(String(lamports));
      if (isNaN(amountNum)) return "NaN";
      return (amountNum / LAMPORTS_PER_SOL).toFixed(6);
    } catch (e) {
      console.error("Error formatting SOL amount:", lamports, e);
      return "Err";
    }
  };

  // Format required token balance based on decimals
  const formatRequiredBalance = (
    config: ServerVerificationConfig | null
  ): string => {
    if (!config) return "...";
    try {
      const requiredRawNum = Number(config.requiredBalance);
      if (isNaN(requiredRawNum)) return "NaN";
      const divisor = Math.pow(10, config.tokenDecimals);
      const uiAmount = requiredRawNum / divisor;
      return uiAmount.toLocaleString(undefined, {
        maximumFractionDigits: config.tokenDecimals,
      });
    } catch (e) {
      console.error(
        "Error formatting required balance:",
        config.requiredBalance,
        e
      );
      return "Error";
    }
  };

  // Fetch user's token balance for the required token
  const fetchTokenBalance = useCallback(async () => {
    if (
      isFetchingBalanceRef.current ||
      !publicKey ||
      !connected ||
      !connection ||
      !serverConfig
    )
      return;
    isFetchingBalanceRef.current = true;
    setLoadingBalance(true);
    setVerificationError(null);
    setTokenBalance(null);
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      const specificTokenAccount = accounts.value.find(
        (account) =>
          account.account.data.parsed.info.mint === serverConfig.tokenAddress
      );
      if (specificTokenAccount) {
        const parsedInfo = specificTokenAccount.account.data.parsed.info;
        const decimals = parsedInfo.tokenAmount.decimals;
        const fetchedBalance: TokenBalance = {
          mint: parsedInfo.mint,
          amount: parsedInfo.tokenAmount.uiAmount,
          decimals: decimals,
          lamports: parsedInfo.tokenAmount.amount,
        };
        setTokenBalance(fetchedBalance);
      } else {
        setTokenBalance(null);
        setVerificationError(
          `Required ${serverConfig.tokenSymbol || "token"} not found in wallet.`
        );
      }
    } catch (err) {
      console.error("Token balance fetch error:", err);
      setVerificationError("Error fetching token balance");
      setTokenBalance(null);
    } finally {
      isFetchingBalanceRef.current = false;
      setLoadingBalance(false);
    }
  }, [publicKey, connected, connection, serverConfig]);

  // Fetch balance when wallet connects or config loads
  useEffect(() => {
    if (connected && publicKey && serverConfig) {
      fetchTokenBalance();
    } else if (!connected || !publicKey) {
      // Reset state if wallet disconnects
      setTokenBalance(null);
      setVerificationError(null);
      setVerificationResult(null);
      setSignatureData(null);
      setQuoteData(null);
      setQuoteError(null);
    }
  }, [connected, publicKey, serverConfig, fetchTokenBalance]);

  // Sign verification message
  const handleSignMessage = async () => {
    if (
      !publicKey ||
      !verificationCode ||
      !signMessage ||
      !serverConfig ||
      !tokenBalance
    ) {
      toast.error("Cannot sign message: Missing required context.");
      return;
    }
    try {
      const requiredLamportsNum = Number(serverConfig.requiredBalance);
      const currentLamportsNum = Number(tokenBalance.lamports);
      if (isNaN(requiredLamportsNum) || isNaN(currentLamportsNum)) {
        toast.error("Cannot sign: Invalid balance values.");
        return;
      }
      if (currentLamportsNum < requiredLamportsNum) {
        setVerificationError("Cannot sign: Insufficient token balance.");
        toast.error("Cannot sign: Insufficient token balance.");
        return;
      }

      setSigningMessage(true);
      setVerificationError(null);
      const messageString = `Sign this message to verify wallet ownership for Discord role verification. Code: ${verificationCode.substring(
        0,
        8
      )}...`;
      const encodedMessage = new TextEncoder().encode(messageString);
      const signature = await signMessage(encodedMessage);
      setSignatureData({
        signature: Buffer.from(signature).toString("base64"),
        message: messageString,
      });
      toast.success("Message signed successfully!");
    } catch (err) {
      console.error("Message signing error:", err);
      setVerificationError("Message signing failed.");
      toast.error("Message signing failed. Please try again.");
      setSignatureData(null);
    } finally {
      setSigningMessage(false);
    }
  };

  const handleSignDummyTransaction = async () => {
    if (!publicKey || !verificationCode || !sendTransaction || !connection || !serverConfig || !tokenBalance) {
      setVerificationError("Cannot sign transaction: wallet not connected or missing verification code");
      toast.error("Cannot sign transaction: wallet not connected or missing verification code");
      return;
    }
    
    const requiredLamportsNum = Number(serverConfig.requiredBalance);
    const currentLamportsNum = Number(tokenBalance.lamports);
    if (isNaN(requiredLamportsNum) || isNaN(currentLamportsNum)) {
      toast.error("Cannot sign: Invalid balance values.");
      return;
    }
    if (currentLamportsNum < requiredLamportsNum) {
      setVerificationError("Cannot sign: Insufficient token balance.");
      toast.error("Cannot sign: Insufficient token balance.");
      return;
    }
  
    try {
      setSigningTransaction(true);
      setVerificationError(null);
      setIsLedgerFlow(true);
      
      // Define memo program ID
      const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
      
      // Create a transaction with a memo instruction containing our verification code
      const messageString = `Verify wallet ownership for Discord role: ${verificationCode}`;
      const transaction = new Transaction().add(
        new TransactionInstruction({
          programId: MEMO_PROGRAM_ID,
          keys: [],
          data: Buffer.from(messageString, "utf8"),
        })
      );
      const blockHash = await connection.getLatestBlockhash();
      // Set a recent blockhash
      transaction.recentBlockhash = blockHash.blockhash;
      transaction.feePayer = publicKey;
      
      // Sign the transaction but don't submit it
      const signedTransaction = await sendTransaction(transaction, connection);

      const confirmation =  await confirmTransaction(
        signedTransaction,
        blockHash.blockhash,
        blockHash.lastValidBlockHeight,
      );

      if(!confirmation){
        throw new Error("Transaction confirmation failed");
      }

      console.log("Transaction confirmed:", signedTransaction);
      
      // Get the serialized signed transaction
      // Need to use our own strategy since we don't have direct access to the signed tx
      setSignatureData({
        signature: signedTransaction, // We use the signature as a reference
        message: messageString
      });
      
      toast.success("Transaction signed successfully!");
    } catch (err) {
      console.error('Error signing transaction:', err);
      setVerificationError("Failed to sign transaction with wallet");
      toast.error("Failed to sign transaction with wallet. Please try again.");
      setSignatureData(null);
      setIsLedgerFlow(false);
    } finally {
      setSigningTransaction(false);
    }
  };

  // Send verification data to backend API
  const verifyWallet = useCallback(async () => {
    if (
      !verificationCode ||
      !publicKey ||
      !tokenBalance ||
      !signatureData ||
      !serverConfig
    ) {
      console.error("Verification prerequisites missing.");
      return;
    }
    if (!DISCORD_API_URL) {
      toast.error("Verification failed: API URL is not configured.");
      return;
    }
    try {
      const requiredLamportsNum = Number(serverConfig.requiredBalance);
      const currentLamportsNum = Number(tokenBalance.lamports);
      if (isNaN(requiredLamportsNum) || isNaN(currentLamportsNum)) {
        toast.error("Verification failed due to invalid balance values.");
        setSignatureData(null);
        return;
      }
      if (currentLamportsNum < requiredLamportsNum) {
        setVerificationError("Insufficient balance for verification.");
        toast.error("Insufficient balance for verification.");
        setSignatureData(null);
        return;
      }

      setVerifying(true);
      setVerificationError(null);
      setVerificationResult(null);
      toast.info("Verifying wallet with the server...");
      const fetchUrl = `${DISCORD_API_URL}/verify-wallet`;
      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationCode,
          walletAddress: publicKey.toString(),
          signature: signatureData.signature,
          message: signatureData.message,
          isLedgerFlow: isLedgerFlow
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Verification request failed");
      }
      setVerificationResult({
        success: true,
        message: result.message || "Verification successful!",
      });
      toast.success(result.message || "Verification successful! 🎉");
    } catch (err: unknown) {
      console.error("Wallet verification error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during verification.";
      setVerificationResult({ success: false, message });
      toast.error(`Verification Failed: ${message}`);
      setSignatureData(null); // Reset signature on failure to allow retry if needed
    } finally {
      setVerifying(false);
    }
  }, [verificationCode, publicKey, tokenBalance, signatureData, isLedgerFlow, serverConfig]);

  // Auto-trigger verification once message is signed and balance is sufficient
  useEffect(() => {
    if (signatureData && tokenBalance && serverConfig) {
      try {
        const requiredLamportsNum = Number(serverConfig.requiredBalance);
        const currentLamportsNum = Number(tokenBalance.lamports);
        if (isNaN(requiredLamportsNum) || isNaN(currentLamportsNum)) return;
        if (
          currentLamportsNum >= requiredLamportsNum &&
          !verifying &&
          !verificationResult
        ) {
          verifyWallet();
        }
      } catch (e) {
        console.error("Error during auto-verification trigger:", e);
      }
    }
  }, [
    signatureData,
    tokenBalance,
    serverConfig,
    verifying,
    verificationResult,
    verifyWallet,
  ]);

  // Fetch Jupiter quote if balance is insufficient
  const fetchQuote = useCallback(async (): Promise<QuoteResponse | null> => {
    if (!serverConfig || !publicKey) {
      setQuoteError(
        "Cannot fetch quote: Wallet not connected or configuration not loaded."
      );
      return null;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const platformFeeBps = process.env.NEXT_PUBLIC_PLATFORM_FEES
        ? parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEES, 10)
        : 0;
      const params = {
        inputMint: SOL_MINT,
        outputMint: serverConfig.tokenAddress,
        amount: serverConfig.requiredBalance, // Amount of output token needed
        slippageBps: 100, // 0.1% slippage
        swapMode: "ExactOut",
        onlyDirectRoutes: false,
        ...(platformFeeBps > 0 && { platformFeeBps: platformFeeBps }),
      };
      const response = await axios.get<QuoteResponse>(JUPITER_QUOTE_API, {
        params,
      });
      setQuoteData(response.data);
      return response.data;
    } catch (err: unknown) {
      console.error("Error fetching Jupiter quote:", err);
      const message =
        err instanceof Error ? err.message : "Failed to fetch swap quote.";
      setQuoteError(message);
      toast.error(`Quote Error: ${message}`);
      setQuoteData(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [publicKey, serverConfig]);

  // Get swap transaction details from Jupiter API
  const getSwapTransaction = async (
    quote: QuoteResponse
  ): Promise<SwapResponse | null> => {
    if (!publicKey) {
      toast.error("Cannot prepare swap: Wallet not connected.");
      return null;
    }
    try {
      const feeReceiver = process.env.NEXT_PUBLIC_PLATFORM_FEE_RECIVER;
      const payload = {
        quoteResponse: quote,
        userPublicKey: publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: "auto", // Let Jupiter decide priority fee
        ...(feeReceiver && { feeAccount: feeReceiver }),
      };
      const response = await axios.post<SwapResponse>(
        JUPITER_SWAP_API,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return response.data;
    } catch (err: unknown) {
      console.error("Error getting swap transaction from Jupiter:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to prepare swap transaction.";
      toast.error(`Swap Error: ${message}`);
      return null;
    }
  };

  // Execute the swap transaction
  const executeSwap = async () => {
    if (!publicKey || !sendTransaction || !connection || !serverConfig) {
      toast.error(
        "Cannot execute swap: Wallet not connected, config missing, or transaction function unavailable."
      );
      return;
    }
    let currentQuote = quoteData;
    if (!currentQuote || quoteError) {
      toast.info("Fetching latest price quote...");
      const freshQuote = await fetchQuote();
      if (!freshQuote) {
        toast.error(
          "Could not get a valid price quote to proceed with the swap."
        );
        return;
      }
      currentQuote = freshQuote;
    }

    setSwapLoading(true);
    setSwapSuccess(false);
    setSwapTxId(null); // Clear previous Tx ID
    let signature: string | null = null; // To store signature for potential error messages

    try {
      toast.info("Preparing swap transaction...");
      const swapData = await getSwapTransaction(currentQuote);
      if (!swapData || !swapData.swapTransaction) {
        toast.error("Failed to get swap transaction data.");
        setSwapLoading(false);
        return;
      }

      const swapTransactionBuf = Buffer.from(
        swapData.swapTransaction,
        "base64"
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      toast.info("Please approve the transaction in your wallet...");
      signature = await sendTransaction(transaction, connection);
      setSwapTxId(signature); // Store signature immediately

      // Show persistent toast while confirming
      const confirmToastId = `confirm-${signature}`;
      console.log(`Transaction Sent. Signature: ${signature}`);
      toast.info(
        () => (
          <div>
            Transaction Sent! Waiting for confirmation...
            <br />
            <a
              href={`https://solscan.io/tx/${signature}?cluster=mainnet-beta`} // Adjust cluster if needed
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700"
            >
              View on Solscan
            </a>
          </div>
        ),
        { autoClose: false, toastId: confirmToastId }
      );

      // Wait for confirmation with explicit timeout handling
      let confirmationStatus;
      try {
        confirmationStatus = await connection.confirmTransaction(
          {
            signature,
            blockhash: transaction.message.recentBlockhash,
            lastValidBlockHeight: swapData.lastValidBlockHeight,
          },
          "confirmed" // Commitment level
        );

        toast.dismiss(confirmToastId); // Close the persistent toast

        if (confirmationStatus.value.err) {
          throw new Error(
            `Transaction failed to confirm: ${JSON.stringify(
              confirmationStatus.value.err
            )}`
          );
        }
      } catch (confirmError: any) {
        toast.dismiss(confirmToastId); // Close the persistent toast on error too
        console.error("Confirmation Error:", confirmError);

        if (
          confirmError.message.includes("timed out") ||
          confirmError.message.includes("timeout")
        ) {
          toast.error(
            () => (
              <div>
                Confirmation timed out. It might still succeed.
                <br />
                <a
                  href={`https://solscan.io/tx/${signature}?cluster=mainnet-beta`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline hover:text-blue-700"
                >
                  Check status on Solscan
                </a>
              </div>
            ),
            { autoClose: 8000 }
          );
          setSwapSuccess(false); // Assume failure on timeout for UI
        } else {
          toast.error(
            `Transaction Confirmation Failed: ${confirmError.message}`
          );
          setSwapSuccess(false);
        }
        setSwapLoading(false);
        return; // Exit executeSwap
      }

      // If confirmation succeeded
      console.log("Swap transaction confirmed:", signature);
      setSwapSuccess(true);
      toast.success("Swap successful! Refreshing balance...");
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Short delay
      fetchTokenBalance(); // Refresh balance
    } catch (err: unknown) {
      // Catch errors from sendTransaction or earlier steps
      if (signature) {
        toast.dismiss(`confirm-${signature}`);
      } // Dismiss toast if signature was generated

      console.error("Swap execution error:", err);
      let errorMessage = "Swap failed.";
      if (typeof err === "object" && err !== null && "message" in err) {
        const msg = String(err.message).toLowerCase();
        if (msg.includes("user rejected")) {
          errorMessage = "Transaction rejected in wallet.";
        } else if (msg.includes("insufficient lamports")) {
          errorMessage = "Insufficient SOL balance for transaction.";
        } else {
          errorMessage = `Swap Error: ${err.message}`;
        } // Include specific error
      }
      toast.error(errorMessage);
      setSwapSuccess(false);
    } finally {
      setSwapLoading(false); // Ensure loading indicator always stops
    }
  };

  // Conditional Sign Message Button Component
  const SignMessageButton = () => {
    if (!serverConfig || !tokenBalance) return null;
    try {
      const requiredLamportsNum = Number(serverConfig.requiredBalance);
      const currentLamportsNum = Number(tokenBalance.lamports);
      if (isNaN(requiredLamportsNum) || isNaN(currentLamportsNum)) return null;

      const shouldShow =
        currentLamportsNum >= requiredLamportsNum &&
        !signatureData &&
        !signingMessage &&
        !verifying &&
        !verificationResult?.success;
      const recentlyCompletedSwap = swapSuccess && shouldShow; // Highlight if swap just finished

      if (!shouldShow) return null;
    
      return (
        <div className={`mt-6 ${recentlyCompletedSwap ? 'animate-pulse' : ''}`}>
          {recentlyCompletedSwap && (
            <p className="text-green-600 text-sm font-semibold mb-2 text-center">
              Your purchase was successful! Please sign the message now.
            </p>
          )}
          <button
            onClick={handleSignMessage}
            disabled={signingMessage || signingTransaction || verifying}
            className={`w-full px-4 py-3 rounded text-white font-semibold transition duration-200 cursor-pointer ${
              (signingMessage || signingTransaction || verifying)
                ? 'bg-gray-400 cursor-not-allowed'
                : recentlyCompletedSwap 
                  ? 'bg-green-600 hover:bg-green-700 shadow-md'
                  : 'bg-[#8151fd] hover:bg-[#8151fd]'
            }`}
          >
            {signingMessage ? 'Waiting for Signature...' : verifying ? 'Processing...' : 'Sign Message to Verify Ownership'}
          </button>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">Using Ledger hardware wallet?</p>
            <button
              onClick={handleSignDummyTransaction}
              disabled={signingMessage || signingTransaction || verifying}
              className={`w-full px-4 py-3 rounded text-white font-semibold transition duration-200 cursor-pointer ${
                (signingMessage || signingTransaction || verifying)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {signingTransaction ? 'Waiting for Signature...' : verifying ? 'Processing...' : 'Sign Transaction Instead (for Ledger)'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              This will sign a 0 SOL transaction as an alternative verification method
            </p>
          </div>
        </div>
      );
    } catch (e) {
      console.error("Error rendering SignMessageButton:", e);
      return null;
    }
  };

  // Balance Refresh Button Component
  const BalanceRefresher = () => {
    if (!connected || !publicKey || !serverConfig) return null;
    return (
      <button
        onClick={() => {
          toast.info("Refreshing balance...");
          fetchTokenBalance();
        }}
        disabled={loadingBalance || isFetchingBalanceRef.current}
        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {loadingBalance ? "Refreshing..." : "Refresh balance"}
      </button>
    );
  };

  // Fetch quote periodically if balance is insufficient
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    try {
      const requiredLamportsNum = serverConfig
        ? Number(serverConfig.requiredBalance)
        : NaN;
      const currentLamportsNum = tokenBalance
        ? Number(tokenBalance.lamports)
        : NaN;
      if (isNaN(requiredLamportsNum)) return;

      const shouldFetchQuote =
        connected &&
        publicKey &&
        serverConfig &&
        (isNaN(currentLamportsNum) || currentLamportsNum < requiredLamportsNum);

      if (shouldFetchQuote) {
        if (!quoteData && !quoteLoading && !quoteError) {
          fetchQuote(); // Initial fetch
        }
        intervalId = setInterval(fetchQuote, 30000); // Refresh quote every 30s
      } else {
        setQuoteData(null); // Clear quote data if balance is sufficient or disconnected
        setQuoteError(null);
      }
    } catch (e) {
      console.error("Error setting up quote refresh interval:", e);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    connected,
    publicKey,
    serverConfig,
    tokenBalance,
    fetchQuote,
    quoteData,
    quoteLoading,
    quoteError,
  ]);

  // --- Render Logic ---

  if (!verificationCode) {
    return (
      <div className="w-full max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Invalid Link</p>
        <p>Verification code missing.</p>
      </div>
    );
  }

  if (loadingConfig) {
    return (
      <div className="w-full max-w-md text-center py-10">
        <p className="text-gray-600 animate-pulse">Loading requirements...</p>
      </div>
    );
  }

  if (configError || !serverConfig) {
    return (
      <div className="w-full max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error Loading Config</p>
        <p>{configError || "Failed to fetch verification config."}</p>
        <p className="text-sm mt-2">
          Please try the link again or contact support.
        </p>
      </div>
    );
  }

  const tokenSymbol = serverConfig.tokenSymbol || "tokens";
  const requiredBalanceFormatted = formatRequiredBalance(serverConfig);
  const currentBalanceLamportsNum = tokenBalance
    ? Number(tokenBalance.lamports)
    : NaN;
  const requiredBalanceLamportsNum = Number(serverConfig.requiredBalance);
  const hasSufficientBalance =
    !isNaN(currentBalanceLamportsNum) &&
    !isNaN(requiredBalanceLamportsNum) &&
    currentBalanceLamportsNum >= requiredBalanceLamportsNum;

  const btnClass = (disabled: boolean) =>
    `w-full mt-4 px-4 py-2 rounded text-white font-semibold transition duration-200 ${
      disabled
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-blue-700"
    }`;

  return (
    <div className="w-full max-w-md text-black">
      <ToastContainer
        position="top-left"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">
          Discord Role Verification
        </h1>
        {serverConfig.serverName && (
          <p className="text-lg text-gray-700">
            For Server: {serverConfig.serverName}
          </p>
        )}
        <p className="mt-2 text-gray-600">
          Verify holding at least {requiredBalanceFormatted} ${tokenSymbol}.
        </p>
      </div>

      {!connected || !publicKey ? (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Connect Wallet
          </h2>
          <p className="mb-6 text-gray-500">
            Connect your Solana wallet (top right) to proceed.
          </p>
        </div>
      ) : (
        <>
          {verificationResult ? (
            <div
              className={`p-6 rounded-lg mb-6 ${
                verificationResult.success
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <h2 className="text-xl font-bold mb-2">
                {verificationResult.success
                  ? "Verification Successful! 🎉"
                  : "Verification Failed"}
              </h2>
              <p>{verificationResult.message}</p>
              {verificationResult.success && (
                <p className="mt-4 text-sm">You can close this window.</p>
              )}
              {!verificationResult.success &&
                tokenBalance &&
                !hasSufficientBalance && (
                  <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded text-orange-800">
                    <p className="font-semibold">Insufficient balance.</p>
                    <p className="text-sm">
                      Current:{" "}
                      {tokenBalance.amount.toLocaleString(undefined, {
                        maximumFractionDigits: serverConfig.tokenDecimals,
                      })}{" "}
                      / Required: {requiredBalanceFormatted} ${tokenSymbol}
                    </p>
                    <button
                      onClick={executeSwap}
                      disabled={swapLoading || quoteLoading || !quoteData}
                      className={btnClass(
                        swapLoading || quoteLoading || !quoteData
                      )}
                    >
                      {swapLoading
                        ? "Purchasing..."
                        : quoteLoading
                        ? "Getting Price..."
                        : !quoteData
                        ? "Loading Price..."
                        : `Buy ${requiredBalanceFormatted} ${tokenSymbol} (~${formatSolAmount(
                            quoteData?.inAmount
                          )} SOL)`}
                    </button>
                    {quoteError && (
                      <p className="text-xs text-red-600 mt-1">{quoteError}</p>
                    )}
                  </div>
                )}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg shadow mb-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Wallet Connected</h2>
                <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {formatWalletAddress(publicKey.toString())}
                </span>
              </div>
              <div className="text-sm mb-4">
                <p>Checking for token:</p>
                <p className="text-xs mt-1 font-mono bg-gray-100 px-2 py-1 rounded border break-all">
                  {serverConfig.tokenAddress} ({tokenSymbol})
                </p>
              </div>

              <div className="mt-4">
                {loadingBalance ? (
                  <div className="text-center py-4">
                    <p className="animate-pulse">Loading token balance...</p>
                  </div>
                ) : tokenBalance ? (
                  <div className="p-4 bg-white rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">
                        Current ${tokenSymbol} Balance:
                      </h3>
                      <span className="text-xl font-bold text-gray-900">
                        {tokenBalance.amount.toLocaleString(undefined, {
                          maximumFractionDigits:
                            tokenBalance.decimals ?? serverConfig.tokenDecimals,
                        })}
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Required Balance:</span>
                        <span className="font-medium">
                          {requiredBalanceFormatted}
                        </span>
                      </div>
                      <div className="text-center mt-1">
                        <BalanceRefresher />
                      </div>
                    </div>

                    <div className="mt-4">
                      {hasSufficientBalance ? (
                        <div
                          className={`p-3 rounded text-center text-sm ${
                            signatureData
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {verifying
                            ? "✅ Verifying..."
                            : signatureData
                            ? "✅ Signature captured, verifying..."
                            : signingMessage
                            ? "✅ Awaiting signature..."
                            : "✅ Balance sufficient! Ready to sign."}
                        </div>
                      ) : (
                        <div className="bg-orange-100 text-orange-700 p-3 rounded text-center text-sm border border-orange-200">
                          <p className="font-semibold">Insufficient balance.</p>
                          <div className="mt-4">
                            <button
                              onClick={executeSwap}
                              disabled={
                                swapLoading || quoteLoading || !quoteData
                              }
                              className={btnClass(
                                swapLoading || quoteLoading || !quoteData
                              )}
                            >
                              {swapLoading
                                ? "Purchasing..."
                                : quoteLoading
                                ? "Getting Price..."
                                : !quoteData
                                ? "Loading Price..."
                                : `Buy ${requiredBalanceFormatted} ${tokenSymbol} (~${formatSolAmount(
                                    quoteData?.inAmount
                                  )} SOL)`}
                            </button>
                            {quoteError && (
                              <p className="text-xs text-red-600 mt-1">
                                {quoteError}
                              </p>
                            )}
                            {quoteData && !quoteLoading && !quoteError && (
                              <p className="text-xs text-gray-600 mt-1">
                                Price includes ~
                                {(quoteData.slippageBps / 100).toFixed(2)}%
                                slippage.
                                {quoteData.platformFee &&
                                  ` (+ ${formatSolAmount(
                                    quoteData.platformFee.amount
                                  )} SOL platform fee)`}
                              </p>
                            )}
                            {/* Removed swapSuccess message here, handled by toast now */}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 p-4 bg-gray-100 rounded border border-gray-200">
                    {verificationError &&
                    verificationError.includes("not found") ? (
                      <div className="text-orange-700 text-sm">
                        <p className="font-semibold">
                          Required ${tokenSymbol} not found.
                        </p>
                        <p>
                          You need {requiredBalanceFormatted} ${tokenSymbol}.
                        </p>
                        <div className="mt-4">
                          <button
                            onClick={executeSwap}
                            disabled={swapLoading || quoteLoading || !quoteData}
                            className={btnClass(
                              swapLoading || quoteLoading || !quoteData
                            )}
                          >
                            {swapLoading
                              ? "Purchasing..."
                              : quoteLoading
                              ? "Getting Price..."
                              : !quoteData
                              ? "Loading Price..."
                              : `Buy ${requiredBalanceFormatted} ${tokenSymbol} (~${formatSolAmount(
                                  quoteData?.inAmount
                                )} SOL)`}
                          </button>
                          {quoteError && (
                            <p className="text-xs text-red-600 mt-1">
                              {quoteError}
                            </p>
                          )}
                          {quoteData && !quoteLoading && !quoteError && (
                            <p className="text-xs text-gray-600 mt-1">
                              Price includes ~
                              {(quoteData.slippageBps / 100).toFixed(2)}%
                              slippage.
                              {quoteData.platformFee &&
                                ` (+ ${formatSolAmount(
                                  quoteData.platformFee.amount
                                )} SOL platform fee)`}
                            </p>
                          )}
                          {/* Removed swapSuccess message here, handled by toast now */}
                        </div>
                        <div className="text-center mt-3">
                          <BalanceRefresher />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600">
                        {verificationError || "Could not retrieve balance."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <SignMessageButton />

              {(signingMessage || signingTransaction) && (
                <div className="text-center mt-4 text-gray-600">
                  <p>Please check your wallet to {signingTransaction ? 'sign the transaction' : 'sign the message'}...</p>
                </div>
              )}
              {verifying && (
                <div className="text-center mt-4 text-gray-600">
                  <p className="animate-pulse">Verifying...</p>
                </div>
              )}
            </div>
          )}

          {/* General guidance message */}
          {!verificationResult && !loadingConfig && (
            <div className="text-sm text-gray-600 text-center mt-6">
              {tokenBalance && hasSufficientBalance ? (
                !signatureData && (
                  <p>
                    Balance sufficient. Sign message to complete verification.
                  </p>
                )
              ) : tokenBalance ? (
                <p>
                  Balance insufficient. Purchase or add ${tokenSymbol} to
                  proceed.
                </p>
              ) : loadingBalance ? (
                <p>Checking ${tokenSymbol} balance...</p>
              ) : verificationError ? (
                <p>
                  Could not check balance. Refresh or ensure wallet is
                  connected.
                </p>
              ) : (
                <p>Checking wallet for ${tokenSymbol}...</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
