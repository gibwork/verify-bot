'use client';

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useSearchParams } from 'next/navigation';
import { VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Buffer } from 'buffer';
import { SPECIFIC_TOKEN_MINT , REQUIRED_BALANCE , SOL_MINT , VERIFY_API_ENDPOINT , JUPITER_QUOTE_API , JUPITER_SWAP_API } from "@/utils/config";
import { TokenBalance , SignatureData , QuoteResponse , SwapResponse} from "@/utils/types";

if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  window.Buffer = Buffer;
}


export default function VerifyContent() {
  const { connection } = useConnection();
  const { publicKey, connected, signMessage, sendTransaction } = useWallet();
  const searchParams = useSearchParams();

  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [signingMessage, setSigningMessage] = useState(false);
  const isFetchingRef = useRef(false);
  const verificationCode = searchParams.get('code');

  const [swapLoading, setSwapLoading] = useState<boolean>(false);
  const [swapSuccess, setSwapSuccess] = useState<boolean>(false);
  const [swapTxId, setSwapTxId] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [buyAmountLamports, setBuyAmountLamports] = useState<string | null>(null);

  const formatWalletAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatSolAmount = (lamports: string | number | undefined): string => {
    if (lamports === undefined || lamports === null) return '...';
    const amount = typeof lamports === 'string' ? BigInt(lamports) : BigInt(Math.round(Number(lamports)));
    return (Number(amount) / LAMPORTS_PER_SOL).toFixed(6);
  };

  const fetchTokenBalance = useCallback(async () => {
    if (isFetchingRef.current || !publicKey || !connected || !connection) return;

    const walletAddress = publicKey.toString();
    console.log("Fetching token balance for wallet:", walletAddress);

    try {
      isFetchingRef.current = true;
      setLoadingBalance(true);
      setVerificationError(null);
      setTokenBalance(null);

      const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const specificTokenAccount = accounts.value.find(
        (account) => account.account.data.parsed.info.mint === SPECIFIC_TOKEN_MINT
      );

      if (specificTokenAccount) {
        const parsedInfo = specificTokenAccount.account.data.parsed.info;
        const decimals = parsedInfo.tokenAmount.decimals;
        const fetchedBalance: TokenBalance = {
            mint: parsedInfo.mint,
            amount: parsedInfo.tokenAmount.uiAmount,
            decimals: decimals,
            lamports: parsedInfo.tokenAmount.amount
        };
        
        setTokenBalance(fetchedBalance);
        const requiredLamports = BigInt(REQUIRED_BALANCE) * BigInt(Math.pow(10, decimals));
        setBuyAmountLamports(requiredLamports.toString());
      } else {
        setTokenBalance(null);
        const defaultDecimals = 6;
        const requiredLamports = BigInt(REQUIRED_BALANCE) * BigInt(Math.pow(10, defaultDecimals));
        setBuyAmountLamports(requiredLamports.toString());
        setVerificationError("Required token not found in wallet.");
      }
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setVerificationError("Error fetching token balance");
      setTokenBalance(null);
      setBuyAmountLamports(null);
    } finally {
      isFetchingRef.current = false;
      setLoadingBalance(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    if (connected && publicKey) {
        fetchTokenBalance();
    } else {
        setTokenBalance(null);
        setVerificationError(null);
        setVerificationResult(null);
        setSignatureData(null);
        setQuoteData(null);
        setQuoteError(null);
        setBuyAmountLamports(null);
    }
  }, [connected, publicKey, fetchTokenBalance]);

  const handleSignMessage = async () => {
    if (!publicKey || !verificationCode || !signMessage) {
      setVerificationError("Cannot sign message: wallet not connected or missing verification code");
      toast.error("Cannot sign message: wallet not connected or missing verification code");
      return;
    }
    if (!tokenBalance || tokenBalance.amount < REQUIRED_BALANCE) {
      setVerificationError("Cannot sign message: Insufficient token balance.");
      toast.error("Cannot sign message: Insufficient token balance.");
      return;
    }

    try {
      setSigningMessage(true);
      setVerificationError(null);
      const messageString = `Verify wallet ownership for Discord role: ${verificationCode}`;
      const encodedMessage = new TextEncoder().encode(messageString);
      const signature = await signMessage(encodedMessage);
      setSignatureData({
        signature: Buffer.from(signature).toString('base64'),
        message: messageString
      });
      toast.success("Message signed successfully!");
    } catch (err) {
      console.error('Error signing message:', err);
      setVerificationError("Failed to sign message with wallet");
      toast.error("Failed to sign message with wallet. Please try again.");
      setSignatureData(null);
    } finally {
      setSigningMessage(false);
    }
  };

  const verifyWallet = useCallback(async () => {
    if (!verificationCode || !publicKey || !tokenBalance || !signatureData) {
        console.error("Verification prerequisites not met:", { verificationCode, publicKey, tokenBalance, signatureData });
        return;
    }
    if (tokenBalance.amount < REQUIRED_BALANCE) {
        setVerificationError("Token balance is insufficient for verification.");
        toast.error("Token balance is insufficient for verification.");
        setSignatureData(null);
        return;
    }

    try {
      setVerifying(true);
      setVerificationError(null);
      setVerificationResult(null);
      toast.info("Verifying wallet with server...");

      const response = await fetch(VERIFY_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationCode,
          walletAddress: publicKey.toString(),
          tokenBalance: tokenBalance.amount,
          signature: signatureData.signature,
          message: signatureData.message
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Verification request failed");
      }
      setVerificationResult({ success: true, message: result.message || "Verification successful!" });
      toast.success(result.message || "Verification successful! 🎉");
    } catch (err: unknown) {
      console.error("Verification Error:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred during verification.";
      setVerificationResult({ success: false, message });
      toast.error(`Verification Failed: ${message}`);
      setSignatureData(null);
    } finally {
      setVerifying(false);
    }
  }, [verificationCode, publicKey, tokenBalance, signatureData]);

  useEffect(() => {
    if (signatureData && tokenBalance && tokenBalance.amount >= REQUIRED_BALANCE && !verifying && !verificationResult) {
      verifyWallet();
    }
  }, [signatureData, tokenBalance, verifying, verificationResult, verifyWallet]);

  const fetchQuote = useCallback(async (): Promise<QuoteResponse | null> => {
    if (!buyAmountLamports) {
      setQuoteError("Token details not yet loaded.");
      return null;
    }
    if (!publicKey) {
      setQuoteError("Connect wallet to get price.");
      return null;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const platformFee = process.env.NEXT_PUBLIC_PLATFORM_FEES;
      const params = {
        inputMint: SOL_MINT,
        outputMint: SPECIFIC_TOKEN_MINT,
        amount: buyAmountLamports,
        slippageBps: 50,
        swapMode: 'ExactOut',
        onlyDirectRoutes: false,
        platformFeeBps: platformFee,
      };

      const response = await axios.get<QuoteResponse>(JUPITER_QUOTE_API, { params });
      setQuoteData(response.data);
      return response.data;
    } catch (err: unknown) {
      console.error('Error getting quote:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      const errorText = `Failed to fetch quote: ${message}`;
      setQuoteError(errorText);
      toast.error(errorText);
      setQuoteData(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [buyAmountLamports, publicKey]);

  const getSwapTransaction = async (quote: QuoteResponse): Promise<SwapResponse | null> => {
    if (!publicKey) {
      toast.error('Wallet not connected');
      return null;
    }

    try {
      const feeReciver = process.env.NEXT_PUBLIC_PLATFORM_FEE_RECIVER;
      const payload = {
        quoteResponse: quote,
        userPublicKey: publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: "auto",
        feeAccount: feeReciver,
      };

      const response = await axios.post<SwapResponse>(JUPITER_SWAP_API, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (err: unknown) {
      console.error('Error getting swap transaction:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      const errorText = `Failed to create swap transaction: ${message}`;
      toast.error(errorText + " Please try again.");
      return null;
    }
  };

  const executeSwap = async () => {
    if (!publicKey || !sendTransaction || !connection) {
      toast.error('Please connect your wallet first');
      return;
    }

    const walletAddress = publicKey.toString();
    console.log("Current wallet address for transaction:", walletAddress);

    let currentQuote = quoteData;
    if (!currentQuote || quoteError) {
      toast.info('Getting latest price...');
      const freshQuote = await fetchQuote();
      if (!freshQuote) {
        toast.error('Could not get a valid quote. Please try again.');
        return;
      }
      currentQuote = freshQuote;
    }

    setSwapLoading(true);
    setSwapSuccess(false);
    setSwapTxId(null);

    try {
      toast.info('Preparing transaction...');
      const swapData = await getSwapTransaction(currentQuote);

      if (!swapData || !swapData.swapTransaction) {
        setSwapLoading(false);
        return;
      }

      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');

      let transaction: VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      } catch (deserializeError) {
        console.error('Failed to deserialize transaction:', deserializeError);
        toast.error('Failed to process transaction data. Please try refreshing.');
        setSwapLoading(false);
        return;
      }

      toast.info('Please approve the transaction in your wallet...');
      const signature = await sendTransaction(transaction, connection);
      setSwapTxId(signature);
      console.log('Transaction sent:', signature);
      toast.success('Transaction sent! Waiting for confirmation...');

      // Improved confirmation polling approach
      const getConfirmation = async () => {
        const result = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        });
        return result.value?.confirmationStatus;
      };

      let confirmationStatus: string | null | undefined;
      let attempts = 0;
      const maxAttempts = 30;

      toast.info('Waiting for blockchain confirmation...', { autoClose: false, toastId: 'confirmation-wait' });
      
      while (!confirmationStatus && attempts < maxAttempts) {
        confirmationStatus = await getConfirmation();
        if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      toast.dismiss('confirmation-wait');

      if (!confirmationStatus || (confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized')) {
        toast.warn('Transaction submitted but confirmation timed out. Check your wallet for status.');
        setSwapSuccess(false);
      } else {
        console.log('Transaction confirmed:', signature);
        setSwapSuccess(true);
        toast.success('Transaction confirmed! Refreshing your balance...');
        
        // Check balance after transaction
        setTimeout(async () => {
          toast.info('Checking your updated token balance...', { toastId: 'balance-check' });
          try {
            if (!publicKey || publicKey.toString() !== walletAddress) {
              console.error("Wallet address mismatch or missing when refreshing balance!");
              toast.error('Wallet connection issue. Please reconnect your wallet.');
              return;
            }

            if (!connection) {
              console.error("Connection missing when refreshing balance!");
              toast.error('Connection issue. Please refresh the page.');
              return;
            }

            const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
              programId: TOKEN_PROGRAM_ID,
            });

            const specificTokenAccount = accounts.value.find(
              (account) => account.account.data.parsed.info.mint === SPECIFIC_TOKEN_MINT
            );

            if (specificTokenAccount) {
              const parsedInfo = specificTokenAccount.account.data.parsed.info;
              const decimals = parsedInfo.tokenAmount.decimals;
              const updatedBalance = {
                mint: parsedInfo.mint,
                amount: parsedInfo.tokenAmount.uiAmount,
                decimals: decimals,
                lamports: parsedInfo.tokenAmount.amount
              };
              
              setTokenBalance(updatedBalance);
              setVerificationError(null);
              
              const requiredLamports = BigInt(REQUIRED_BALANCE) * BigInt(Math.pow(10, decimals));
              setBuyAmountLamports(requiredLamports.toString());
              
              toast.dismiss('balance-check');
              
              if (updatedBalance.amount >= REQUIRED_BALANCE) {
                toast.success('Balance confirmed! Please sign the message to verify your wallet.', { 
                  autoClose: 7000,
                  toastId: 'sign-prompt'
                });
              } else {
                toast.warning(`Balance updated to ${updatedBalance.amount} WORK but still insufficient. Need ${REQUIRED_BALANCE} WORK.`, {
                  autoClose: 7000
                });
              }
            } else {
              console.log("Token not found in wallet after purchase!");
              setTokenBalance(null);
              setVerificationError("Required token not found in wallet after purchase.");
              toast.error("Token not found in wallet after purchase. Please check your wallet and retry.");
            }
          } catch (balanceError) {
            console.error("Error refreshing balance:", balanceError);
            toast.error('Failed to refresh your balance. Please reload the page.');
          } finally {
            isFetchingRef.current = false;
            setLoadingBalance(false);
          }
        }, 2000);
      }
    } catch (err: unknown) {
      console.error('Error executing swap:', err);
      let errorMessage = 'Failed to execute swap: An unexpected error occurred.';
      if (typeof err === 'object' && err !== null && 'message' in err) {
        const walletErrorMessage = String(err.message).toLowerCase();
        if (walletErrorMessage.includes('user rejected')) {
          errorMessage = 'Transaction rejected in wallet.';
        } else if (walletErrorMessage.includes('insufficient lamports')) {
          errorMessage = 'Insufficient SOL balance for transaction fee or purchase.';
        } else {
          errorMessage = `Failed to execute swap: ${err.message}`;
        }
      }
      toast.error(errorMessage);
      setSwapSuccess(false);
    } finally {
      setSwapLoading(false);
    }
  };

  const SignMessageButton = () => {
    const shouldShowButton = tokenBalance && 
                            tokenBalance.amount >= REQUIRED_BALANCE && 
                            !signatureData && 
                            !signingMessage && 
                            !verifying;
    
    const recentlyCompleted = swapSuccess && shouldShowButton;
                             
    if (!shouldShowButton) return null;
    
    return (
      <div className={`mt-6 ${recentlyCompleted ? 'animate-pulse' : ''}`}>
        {recentlyCompleted && (
          <p className="text-green-600 text-sm font-semibold mb-2 text-center">
            Your purchase was successful! Please sign the message now.
          </p>
        )}
        <button
          onClick={handleSignMessage}
          disabled={signingMessage || verifying}
          className={`w-full px-4 py-3 rounded text-white font-semibold transition duration-200 ${
            (signingMessage || verifying)
              ? 'bg-gray-400 cursor-not-allowed'
              : recentlyCompleted 
                ? 'bg-green-600 hover:bg-green-700 shadow-md'
                : 'bg-[#8151fd] hover:bg-[#8151fd]'
          }`}
        >
          {signingMessage ? 'Waiting for Signature...' : verifying ? 'Processing...' : 'Sign Message to Verify Ownership'}
        </button>
      </div>
    );
  };

  const BalanceRefresher = () => {
    if (!connected || !publicKey) return null;
    
    return (
      <button 
        onClick={() => {
          toast.info('Refreshing balance...');
          fetchTokenBalance();
        }}
        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
      >
        Refresh balance manually
      </button>
    );
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const shouldFetchQuote = connected && publicKey && buyAmountLamports && (!tokenBalance || tokenBalance.amount < REQUIRED_BALANCE);

    if (shouldFetchQuote) {
      if (!quoteData && !quoteLoading && !quoteError) {
        fetchQuote();
      }
      intervalId = setInterval(() => {
         fetchQuote();
      }, 30000);
    } else {
      setQuoteData(null);
      setQuoteError(null);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [connected, publicKey, tokenBalance, buyAmountLamports, fetchQuote, quoteData, quoteLoading, quoteError]);

  if (!verificationCode) {
    return (
      <div className="w-full max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Invalid Verification Link</p>
        <p>Missing verification code. Please use the link provided by the Discord bot.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
        <ToastContainer position="top-left" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Discord Role Verification</h1>
        <p className="mt-2 text-gray-600">
          Connect your Solana wallet to verify your token holdings ({REQUIRED_BALANCE.toLocaleString()} $WORK required)
        </p>
      </div>

      {!connected || !publicKey ? (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="mb-6 text-gray-500">
            Use the wallet button in the top right to connect your Solana wallet.
          </p>
          <p className="text-sm text-gray-500">
            We will check your balance of the required $WORK token.
          </p>
        </div>
      ) : (
        <>
          {verificationResult ? (
            <div className={`p-6 rounded-lg ${verificationResult.success ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
              <h2 className="text-xl font-bold mb-2">
                {verificationResult.success ? 'Verification Successful! 🎉' : 'Verification Failed'}
              </h2>
              <p>{verificationResult.message}</p>
              {verificationResult.success && (
                <p className="mt-4 text-sm">You can now close this window and return to Discord.</p>
              )}
               {!verificationResult.success && tokenBalance && tokenBalance.amount < REQUIRED_BALANCE && (
                                <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded text-orange-800">
                                    <p className="font-semibold">Your balance is still insufficient.</p>
                                    <p className="text-sm">Current: {tokenBalance.amount.toLocaleString()} / Required: {REQUIRED_BALANCE.toLocaleString()} $WORK</p>
                                     <button
                                          onClick={executeSwap}
                                          disabled={swapLoading || quoteLoading || !quoteData || !buyAmountLamports || !tokenBalance?.decimals}
                                          className={`w-full mt-4 px-4 py-2 rounded text-white font-semibold transition duration-200 ${
                                              (swapLoading || quoteLoading || !quoteData || !buyAmountLamports || !tokenBalance?.decimals)
                                                  ? 'bg-gray-400 cursor-not-allowed'
                                                  : 'bg-[#8151fd] hover:bg-[#8151fd]'
                                          }`}
                                      >
                                        {swapLoading ? 'Processing Purchase...' : quoteLoading ? 'Fetching Price...' : !quoteData ? 'Loading Price...' : `Buy ${REQUIRED_BALANCE.toLocaleString()} $WORK (~${formatSolAmount(quoteData?.inAmount)} SOL)`}
                                      </button>
                                       {quoteError && <p className="text-xs text-red-600 mt-1">{quoteError}</p>}
                                </div>
                            )}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg shadow mb-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-gray-800">Wallet Connected</h2>
                <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {formatWalletAddress(publicKey.toString())}
                </span>
              </div>

              <div className="text-sm mb-4 text-gray-700">
                <p>Checking balance for token:</p>
                <p className="text-xs text-gray-500 break-all mt-1 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
                  {SPECIFIC_TOKEN_MINT} ($WORK)
                </p>
              </div>

               {(verificationError && !verificationError.includes("Required token not found")) && (
                 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4 text-sm">
                   {verificationError}
                 </div>
               )}

              <div className="mt-4">
                {loadingBalance ? (
                   <div className="text-center py-4 text-gray-600">
                     <p>Loading token balance...</p>
                   </div>
                ) : tokenBalance ? (
                   <div className="p-4 bg-white rounded border border-gray-200">
                     <div className="flex justify-between items-center">
                       <h3 className="font-semibold text-gray-800">Current $WORK Balance:</h3>
                       <span className="text-xl font-bold text-black">
                         {tokenBalance.amount.toLocaleString(undefined, {
                           minimumFractionDigits: 0,
                           maximumFractionDigits: tokenBalance.decimals ?? 0,
                         })}
                       </span>
                     </div>

                     <div className="mt-4 pt-3 border-t border-gray-200 text-sm text-gray-600">
                       <div className="flex justify-between items-center">
                         <span>Required Balance:</span>
                         <span className="font-medium">{REQUIRED_BALANCE.toLocaleString()}</span>
                       </div>
                       
                       <div className="text-center mt-1">
                         <BalanceRefresher />
                       </div>

                       <div className="mt-4">
                         {tokenBalance.amount >= REQUIRED_BALANCE ? (
                           <div className={`p-3 rounded text-center text-sm ${signatureData ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                             {verifying ? (
                               <p>✅ Balance sufficient. Verifying ownership...</p>
                             ) : signatureData ? (
                                <p>✅ Balance sufficient. Signature captured. Sending verification...</p>
                             ) : signingMessage ? (
                               <p>✅ Balance sufficient. Waiting for wallet signature...</p>
                             ) : (
                               <p>✅ Your balance meets the requirements!</p>
                             )}
                           </div>
                         ) : (
                           <div className="bg-orange-100 text-orange-700 p-3 rounded text-center text-sm border border-orange-200">
                             <p className="font-semibold">Insufficient balance.</p>
                             <p>You need {REQUIRED_BALANCE.toLocaleString()} $WORK but have {tokenBalance.amount.toLocaleString()}.</p>

                               <div className="mt-4">
                                   <button
                                       onClick={executeSwap}
                                       disabled={swapLoading || quoteLoading || !quoteData || !buyAmountLamports || !tokenBalance?.decimals}
                                       className={`w-full px-4 py-2 rounded text-white font-semibold transition duration-200 ${
                                           (swapLoading || quoteLoading || !quoteData || !buyAmountLamports || !tokenBalance?.decimals)
                                               ? 'bg-gray-400 cursor-not-allowed'
                                               : 'bg-[#8151fd] hover:bg-[#8151fd]'
                                       }`}
                                   >
                                     {swapLoading ? 'Processing Purchase...' : quoteLoading ? 'Fetching Price...' : !quoteData ? 'Loading Price...' : `Buy ${REQUIRED_BALANCE.toLocaleString()} $WORK (~${formatSolAmount(quoteData?.inAmount)} SOL)`}
                                   </button>
                                    {quoteError && <p className="text-xs text-red-600 mt-1">{quoteError}</p>}
                                     {quoteData && !quoteLoading && !quoteError && (
                                         <p className="text-xs text-gray-600 mt-1">
                                             Price includes ~{quoteData.slippageBps / 100}% slippage tolerance.
                                             {quoteData.platformFee && ` (+ ${formatSolAmount(quoteData.platformFee.amount)} SOL fee)`}
                                         </p>
                                     )}
                                    {swapSuccess && (
                                         <div className="mt-2 text-xs text-green-700">
                                             Purchase successful! Balance updating...
                                         </div>
                                     )}
                               </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="text-center py-4 p-4 bg-gray-100 rounded border border-gray-200">
                    {verificationError && verificationError.includes("Required token not found") ? (
                        <div className="text-orange-700 text-sm">
                           <p className="font-semibold">Required $WORK token not found in your wallet.</p>
                           <p>You need to hold at least {REQUIRED_BALANCE.toLocaleString()} $WORK.</p>
                             <div className="mt-4">
                                   <button
                                       onClick={executeSwap}
                                       disabled={swapLoading || quoteLoading || !quoteData || !buyAmountLamports }
                                       className={`w-full px-4 py-2 rounded text-white font-semibold transition duration-200 ${
                                           (swapLoading || quoteLoading || !quoteData || !buyAmountLamports )
                                               ? 'bg-gray-400 cursor-not-allowed'
                                               : 'bg-blue-600 hover:bg-blue-700'
                                       }`}
                                   >
                                     {swapLoading ? 'Processing Purchase...' : quoteLoading ? 'Fetching Price...' : !quoteData ? 'Loading Price...' : `Buy ${REQUIRED_BALANCE.toLocaleString()} $WORK (~${formatSolAmount(quoteData?.inAmount)} SOL)`}
                                   </button>
                                    {quoteError && <p className="text-xs text-red-600 mt-1">{quoteError}</p>}
                                     {quoteData && !quoteLoading && !quoteError && (
                                         <p className="text-xs text-gray-600 mt-1">
                                             Price includes ~{quoteData.slippageBps / 100}% slippage tolerance.
                                              {quoteData.platformFee && ` (+ ${formatSolAmount(quoteData.platformFee.amount)} SOL fee)`}
                                         </p>
                                     )}
                                     {swapSuccess && (
                                         <div className="mt-2 text-xs text-green-700">
                                             Purchase successful! Balance updating...
                                         </div>
                                     )}
                               </div>
                           <div className="text-center mt-3">
                             <BalanceRefresher />
                           </div>
                        </div>
                     ) : (
                        <p className="text-gray-600">{verificationError || "Could not retrieve token balance."}</p>
                     )}
                   </div>
                )}
              </div>

              <SignMessageButton />

              {signingMessage && (
                <div className="text-center mt-4 text-gray-600">
                  <p>Please check your wallet to sign the message...</p>
                </div>
              )}

              {verifying && (
                <div className="text-center mt-4 text-gray-600">
                  <p>Verifying your details with the server...</p>
                </div>
              )}
            </div>
          )}

           {!verificationResult && (
               <div className="text-sm text-gray-600 text-center mt-6">
                 {tokenBalance && tokenBalance.amount >= REQUIRED_BALANCE ? (
                    <>
                        <p>Your balance is sufficient. Sign the message above to prove ownership.</p>
                        <p className="mt-1 text-xs">This signature confirms you control this wallet and costs no SOL.</p>
                    </>
                 ) : tokenBalance ? (
                     <p>Purchase the required $WORK tokens or add them to your wallet to proceed.</p>
                 ) : loadingBalance ? (
                      <p>Checking your $WORK balance...</p>
                 ) : (
                     <p>Connect your wallet or acquire $WORK tokens to proceed.</p>
                 )}
               </div>
           )}
        </>
      )}
    </div>
  );
}