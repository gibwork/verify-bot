"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import axios, { AxiosResponse } from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QuoteResponse, SwapResponse } from "@/utils/types";
import { SOL_MINT, JUPITER_QUOTE_API, JUPITER_SWAP_API } from "@/utils/config";

export default function SwapPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const searchParams = useSearchParams();

  const [tokenMint, setTokenMint] = useState<string | null>(null);
  const [requiredRawAmount, setRequiredRawAmount] = useState<number | null>(
    null
  );
  const [tokenSymbol, setTokenSymbol] = useState<string>("Token");
  const [tokenDecimals, setTokenDecimals] = useState<number>(0);
  const [guildName, setGuildName] = useState<string>("the server");
  const [paramsLoaded, setParamsLoaded] = useState<boolean>(false);
  const [paramsError, setParamsError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    const mint = searchParams.get("tokenMint");
    const rawAmountStr = searchParams.get("requiredRawAmount");
    const symbol = searchParams.get("tokenSymbol");
    const decimalsStr = searchParams.get("tokenDecimals");
    const gName = searchParams.get("guildName");

    let errorMsg = null;

    if (!mint) {
      errorMsg =
        "Required token information (tokenMint) is missing in the URL.";
    }
    if (!rawAmountStr) {
      errorMsg = errorMsg
        ? errorMsg + " Required amount (requiredRawAmount) is also missing."
        : "Required amount information (requiredRawAmount) is missing in the URL.";
    }

    if (errorMsg) {
      setParamsError(errorMsg);
      toast.error(errorMsg);
      setParamsLoaded(true);
      return;
    }

    setTokenMint(mint);
    if (gName) setGuildName(gName);
    if (symbol) setTokenSymbol(symbol);

    try {
      const rawAmountNum = parseInt(rawAmountStr!, 10);
      if (isNaN(rawAmountNum) || rawAmountNum <= 0) {
        throw new Error("Invalid required amount value.");
      }
      setRequiredRawAmount(rawAmountNum);
    } catch (e) {
      setParamsError("Invalid required amount format in URL.");
      toast.error("Invalid required amount format in URL.");
      setParamsLoaded(true);
      return;
    }

    try {
      const decimalsNum = parseInt(decimalsStr || "0", 10);
      if (isNaN(decimalsNum) || decimalsNum < 0) {
        console.warn("Invalid token decimals value in URL, defaulting to 0.");
        setTokenDecimals(0);
      } else {
        setTokenDecimals(decimalsNum);
      }
    } catch (e) {
      console.warn("Error parsing token decimals from URL, defaulting to 0.");
      setTokenDecimals(0);
    }

    setParamsError(null);
    setParamsLoaded(true);
  }, [searchParams]);

  const getQuote = async (): Promise<QuoteResponse | null> => {
    if (!paramsLoaded || paramsError || !tokenMint || !requiredRawAmount) {
      console.error("Cannot get quote: Parameters not loaded or invalid.");
      setQuoteError(
        "Cannot fetch quote due to missing or invalid configuration from the previous step."
      );
      return null;
    }
    try {
      setQuoteLoading(true);
      setQuoteError(null);
      const platformFee = process.env.NEXT_PUBLIC_PLATFORM_FEES || 0;

      const response: AxiosResponse<QuoteResponse> = await axios.get(
        JUPITER_QUOTE_API,
        {
          params: {
            inputMint: SOL_MINT,
            outputMint: tokenMint,
            amount: requiredRawAmount,
            swapMode: "ExactOut",
            platformFeeBps: platformFee,
          },
        }
      );
      setQuoteData(response.data);
      return response.data;
    } catch (err: unknown) {
      console.error("Error getting quote:", err);
      const errorText =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setQuoteError(`Failed to fetch quote: ${errorText}`);
      toast.error(`Failed to fetch quote: ${errorText}`);
      setQuoteData(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (paramsLoaded && !paramsError) {
      getQuote();
      const intervalId = setInterval(getQuote, 15000);
      return () => clearInterval(intervalId);
    }
  }, [paramsLoaded, paramsError, tokenMint, requiredRawAmount]);

  const getSwapTransaction = async (
    quoteResponse: QuoteResponse
  ): Promise<SwapResponse | null> => {
    if (!publicKey) {
      toast.error("Wallet not connected");
      return null;
    }
    try {
      const feeReciver = process.env.NEXT_PUBLIC_PLATFORM_FEE_RECIVER;
      const response: AxiosResponse<SwapResponse> = await axios.post(
        JUPITER_SWAP_API,
        {
          userPublicKey: publicKey.toString(),
          quoteResponse: quoteResponse,
          dynamicComputeUnitLimit: true,
          ...(feeReciver && { feeAccount: feeReciver }),
        }
      );
      return response.data;
    } catch (err: unknown) {
      console.error("Error getting swap transaction:", err);
      const errorText =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(
        `Failed to create swap transaction: ${errorText}. Please try again.`
      );
      throw err;
    }
  };

  const executeSwap = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!quoteData && !quoteLoading) {
      toast.info("Quote data missing, attempting to refresh...");
      const freshQuote = await getQuote();
      if (!freshQuote) {
        toast.error(
          "Could not retrieve a valid quote. Please try again later."
        );
        return;
      }
    } else if (!quoteData) {
      toast.error("Quote not available. Please wait or refresh the page.");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setTxId(null);
    try {
      let currentQuote = quoteData!;

      toast.info("Preparing transaction...");
      const swapData = await getSwapTransaction(currentQuote);

      if (!swapData) {
        setLoading(false);
        return;
      }

      if (swapData.simulationError) {
        console.error("Simulation error:", swapData.simulationError);
        let simErrorMsg = `Transaction simulation failed.`;
        if (swapData.simulationError) {
          simErrorMsg += ` Message: ${swapData.simulationError}`;
        }
        toast.error(simErrorMsg);
        setLoading(false);
        return;
      }

      const swapTransactionBuf = Buffer.from(
        swapData.swapTransaction,
        "base64"
      );

      let transaction: Transaction | VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        console.log("Transaction Deserialized:", transaction);
      } catch (deserializeError: unknown) {
        console.error("Failed to deserialize transaction:", deserializeError);
        const errorText =
          deserializeError instanceof Error
            ? deserializeError.message
            : "Unknown deserialization error.";
        toast.error(
          `Failed to process transaction data: ${errorText}. Please try again.`
        );
        setLoading(false);
        return;
      }

      toast.info("Please approve the transaction in your wallet...");
      const signature = await sendTransaction(transaction, connection);
      setTxId(signature);

      console.log("Transaction sent:", signature);
      toast.success("Transaction sent! Waiting for confirmation...");

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      let confirmationStatus;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
          });
          confirmationStatus = status.value?.confirmationStatus;

          if (
            confirmationStatus === "confirmed" ||
            confirmationStatus === "finalized"
          ) {
            console.log(
              `Transaction confirmed with status: ${confirmationStatus}`
            );
            setSuccess(true);
            toast.success(
              `Successfully swapped for ${displayAmount} ${tokenSymbol}!`
            );
            break;
          }

          const currentBlockHeight = await connection.getBlockHeight();
          if (currentBlockHeight > lastValidBlockHeight) {
            console.warn(
              `Transaction timed out (blockhash expired). Signature: ${signature}`
            );
            toast.warn(
              "Transaction confirmation timed out as the network moved past its validity window. Please check your wallet and Solscan for the final status."
            );

            break;
          }
        } catch (e) {
          console.error("Error checking signature status:", e);
          if (attempts > 5) {
            toast.error(
              "Error checking transaction status. Please check Solscan manually."
            );
            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      if (!success && attempts >= maxAttempts) {
        console.warn(
          `Transaction confirmation timed out after ${maxAttempts} attempts. Signature: ${signature}`
        );
        toast.warn(
          "Transaction submitted but confirmation timed out. Please check your wallet and Solscan for the final status."
        );
      }
    } catch (err: unknown) {
      console.error("Error executing swap:", err);

      if (
        err instanceof Error &&
        (err.name === "WalletSignTransactionError" ||
          err.message?.includes("User rejected"))
      ) {
        toast.error("Transaction cancelled: Wallet request rejected.");
      } else {
        const errorText =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        toast.error(`Failed to execute swap: ${errorText}`);
      }

      setLoading(false);
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  const formatSolAmount = (lamports: string | number | undefined): string => {
    if (lamports === undefined || lamports === null) return "...";
    const amount =
      typeof lamports === "string" ? parseFloat(lamports) : lamports;
    if (isNaN(amount)) return "Error";
    return (amount / 1_000_000_000).toFixed(5);
  };

  const displayAmount =
    requiredRawAmount !== null
      ? (requiredRawAmount / Math.pow(10, tokenDecimals)).toLocaleString(
          undefined,
          { maximumFractionDigits: tokenDecimals }
        )
      : "...";

  if (!paramsLoaded) {
    return (
      <div className="max-w-lg mt-48 mx-auto p-4 text-white text-center">
        Loading configuration...
      </div>
    );
  }

  if (paramsError) {
    return (
      <div className="max-w-lg mt-48 mx-auto p-4 text-red-500 bg-red-100 border border-red-400 rounded text-center">
        {paramsError} Please go back to Discord and try the link again.
      </div>
    );
  }

  return (
    <div className="max-w-lg mt-24 md:mt-48 mx-auto p-4 text-black">
      <ToastContainer position="top-left" autoClose={4000} />

      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-white text-center">
        Buy {tokenSymbol} for {guildName}
      </h1>

      <div className="bg-gray-100 p-4 md:p-6 rounded-lg shadow-lg mb-8">
        <div className="mt-4">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-center">
            Swap Details
          </h2>

          {quoteLoading && !quoteData && (
            <div className="bg-white p-4 rounded-lg mb-6 text-center">
              <p>Loading best price...</p>
            </div>
          )}

          {quoteError && !quoteLoading && (
            <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg mb-6 text-center">
              <p>{quoteError}</p>
              <button
                onClick={() => getQuote()}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Try Again
              </button>
            </div>
          )}

          {quoteData && (
            <div className="bg-white p-4 rounded-lg mb-6 text-sm md:text-base">
              <div className="flex justify-between mb-2">
                <span>You Pay (approx):</span>
                <span className="font-medium text-right">
                  ~{formatSolAmount(quoteData.inAmount)} SOL
                  {quoteLoading && (
                    <span className="ml-1 text-xs text-gray-500">
                      (refreshing...)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>You Receive:</span>
                <span className="font-medium">
                  {displayAmount} {tokenSymbol}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                Price based on current market conditions.
              </div>
            </div>
          )}

          <button
            onClick={executeSwap}
            disabled={
              loading ||
              success ||
              !publicKey ||
              !quoteData ||
              quoteLoading ||
              !!quoteError ||
              !!paramsError
            }
            className={`w-full py-3 rounded-lg font-medium text-base md:text-lg ${
              !publicKey
                ? "bg-gray-400 cursor-not-allowed"
                : !quoteData || quoteLoading || !!quoteError || !!paramsError
                ? "bg-gray-400 cursor-not-allowed"
                : loading
                ? "bg-yellow-500 cursor-wait"
                : success
                ? "bg-green-500 hover:bg-green-600 cursor-default"
                : "bg-[#8151fd] hover:bg-blue-600"
            } text-white font-bold transition duration-200 flex items-center justify-center space-x-2`}
          >
            {loading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            <span>
              {!publicKey
                ? "Connect Wallet First"
                : !quoteData && quoteLoading
                ? "Finding Best Price..."
                : !quoteData || !!quoteError
                ? "Quote Unavailable"
                : loading
                ? "Processing Swap..."
                : success
                ? "Purchase Successful!"
                : `Buy ${displayAmount} ${tokenSymbol}`}
            </span>
          </button>

          {success && (
            <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg text-sm md:text-base">
              <p className="font-medium mb-2 text-green-800">
                🎉 Congratulations! You've successfully purchased{" "}
                {displayAmount} {tokenSymbol}.
              </p>
              {txId && (
                <a
                  href={`https://solscan.io/tx/${txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  View transaction on Solscan
                </a>
              )}
            </div>
          )}
          {!success && txId && !loading && (
            <div className="mt-4 text-center text-xs md:text-sm">
              <p>Transaction sent. Waiting for confirmation...</p>
              <a
                href={`https://solscan.io/tx/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                View on Solscan: {txId.substring(0, 6)}...
                {txId.substring(txId.length - 6)}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
