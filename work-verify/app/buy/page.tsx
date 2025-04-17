'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import axios, { AxiosResponse } from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QuoteResponse, SwapResponse } from '@/utils/types';
import { SOL_MINT , SPECIFIC_TOKEN_MINT ,VERIFY_API_ENDPOINT ,JUPITER_QUOTE_API , JUPITER_SWAP_API , TOKEN_DECIMALS, REQUIRED_BALANCE } from '@/utils/config';


export default function SwapPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(true);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const buyAmount = REQUIRED_BALANCE * (10**TOKEN_DECIMALS);
  console.log(buyAmount)
  //const feeAccount = ''

  const getQuote = async (): Promise<QuoteResponse> => {
    try {
      setQuoteLoading(true);
      const platformFee = process.env.NEXT_PUBLIC_PLATFORM_FEES;
      const response: AxiosResponse<QuoteResponse> = await axios.get(
        JUPITER_QUOTE_API,
        {
          params: {
            inputMint: SOL_MINT,
            outputMint: SPECIFIC_TOKEN_MINT,
            amount: buyAmount,
            swapMode: 'ExactOut',
            platformFeeBps: platformFee,
          },
        }
      );
      return response.data;
    } catch (err: unknown) {
      console.error('Error getting quote:', err);
      if (err instanceof Error) {
        toast.error(`Failed to fetch quote: ${err.message}`);
      } else {
        toast.error('Failed to fetch quote: An unexpected error occurred.');
      }
      throw err;
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialQuote = async (): Promise<void> => {
      try {
        const quote = await getQuote();
        setQuoteData(quote);
        setQuoteError(null);
      } catch (err: unknown) {
        console.error('Failed to fetch initial quote:', err);
        if (err instanceof Error) {
          setQuoteError(`Failed to load quote. Please refresh the page. Error: ${err.message}`);
        } else {
          setQuoteError('Failed to load quote. Please refresh the page. An unexpected error occurred.');
        }
      }
    };

    fetchInitialQuote();

    const intervalId = setInterval(fetchInitialQuote, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const getSwapTransaction = async (
    quoteResponse: QuoteResponse
  ): Promise<SwapResponse | null> => {
    try {
      if (!publicKey) {
        toast.error('Wallet not connected');
        return null;
      }
      const feeReciver = process.env.NEXT_PUBLIC_PLATFORM_FEE_RECIVER;
      const response: AxiosResponse<SwapResponse> = await axios.post(
        JUPITER_SWAP_API,
        {
          userPublicKey: publicKey.toString(),
          quoteResponse: quoteResponse,
          dynamicComputeUnitLimit: true,
          feeAccount: feeReciver,
        }
      );

      return response.data;
    } catch (err: unknown) {
      console.error('Error getting swap transaction:', err);
      if (err instanceof Error) {
        toast.error(`Failed to create swap transaction. Please try again. Error: ${err.message}`);
      } else {
        toast.error('Failed to create swap transaction. Please try again. An unexpected error occurred.');
      }
      throw err;
    }
  };

  const executeSwap = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!quoteData) {
      toast.error('Quote not available. Please wait or refresh the page.');
      return;
    }

    setLoading(true);
    try {
      let currentQuote: QuoteResponse = quoteData;
      if (quoteLoading || quoteError) {
        toast.info('Getting fresh quote...');
        currentQuote = await getQuote();
        setQuoteData(currentQuote);
      }

      toast.info('Preparing transaction...');
      const swapData = await getSwapTransaction(currentQuote);

      if (!swapData) {
        toast.error('Failed to create swap transaction. Please try again.');
        setLoading(false);
        return;
      }

      if (swapData.simulationError) {
        console.error('Simulation error:', swapData.simulationError);
        toast.error(
          `Transaction simulation failed: ${swapData.simulationError}. This could be due to insufficient SOL balance for the transaction and fees, price slippage exceeding the limit, or issues with the underlying liquidity pools. Please ensure you have enough SOL and try again.`
        );
        setLoading(false);
        return;
      }

      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');

      let transaction: Transaction | VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      } catch (err: unknown) {
        console.error('Failed to deserialize transaction:', err);
        if (err instanceof Error) {
          toast.error(`Failed to process transaction data. Please try again. Error: ${err.message}`);
        } else {
          toast.error('Failed to process transaction data. Please try again. An unexpected error occurred.');
        }
        setLoading(false);
        return;
      }

      toast.info('Please approve the transaction in your wallet...');
      const signature = await sendTransaction(transaction, connection);
      setTxId(signature);

      console.log('Transaction sent:', signature);
      toast.success('Transaction sent! Waiting for confirmation...');

      const getConfirmation = async () => {
        const result = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        });
        return result.value?.confirmationStatus;
      };

      let confirmationStatus: string | null | undefined;
      let attempts = 0;
      const maxAttempts = 30;

      while (!confirmationStatus && attempts < maxAttempts) {
        confirmationStatus = await getConfirmation();
        if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      if (
        !confirmationStatus ||
        (confirmationStatus !== 'confirmed' && confirmationStatus !== 'finalized')
      ) {
        toast.warn('Transaction submitted but confirmation timed out. Check your wallet for status.');
      } else {
        setSuccess(true);
        toast.success('Successfully swapped tokens!');
      }
    } catch (err: unknown) {
      console.error('Error executing swap:', err);
      if (err instanceof Error) {
        toast.error(`Failed to execute swap: ${err.message}`);
      } else {
        toast.error('Failed to execute swap: An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatSolAmount = (lamports: string | number): string => {
    const amount = typeof lamports === 'string' ? parseFloat(lamports) : lamports;
    return (amount / 1_000_000_000).toFixed(4);
  };

  return (
    <div className="max-w-lg mt-48 mx-auto p-4 text-black">
      <ToastContainer position="top-left" autoClose={4000} />

      <h1 className="text-3xl font-bold mb-8 text-white">Swap SOL for Work Tokens</h1>

      <div className="bg-gray-100 p-6 rounded-lg shadow-lg mb-8">
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Swap Details</h2>

          {quoteLoading && !quoteData && (
            <div className="bg-white p-4 rounded-lg mb-6 text-center">
              <p>Loading quote...</p>
            </div>
          )}

          {quoteError && (
            <div className="bg-white p-4 rounded-lg mb-6 text-center">
              <p>{quoteError}</p>
              <button
                onClick={() =>
                  getQuote()
                    .then((data) => setQuoteData(data))
                    .catch((err: unknown) => {
                      if (err instanceof Error) {
                        setQuoteError(`Failed to load quote: ${err.message}`);
                      } else {
                        setQuoteError('Failed to load quote: An unexpected error occurred.');
                      }
                    })
                }
                className="mt-2 px-4 py-2  text-white rounded"
              >
                Try Again
              </button>
            </div>
          )}

          {quoteData && (
            <div className="bg-white p-4 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span>You&apos;ll pay:</span>
                <span className="font-medium">
                  {formatSolAmount(quoteData.inAmount)} SOL
                  {quoteLoading && <span className="ml-2 text-xs">(refreshing...)</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span>You&apos;ll receive:</span>
                <span className="font-medium">{buyAmount/1000000} WORK</span>
              </div>
            </div>
          )}

          <button
            onClick={executeSwap}
            disabled={loading || success || !publicKey || !quoteData}
            className={`w-full py-3 rounded-lg font-medium ${
              !publicKey || !quoteData
                ? 'bg-gray-400 cursor-not-allowed'
                : loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : success
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-[#8151fd] hover:bg-blue-600'
            } text-white font-bold transition duration-200`}
          >
            {!publicKey ? 'Connect Wallet First' : !quoteData ? 'Loading Quote...' : loading ? 'Processing...' : success ? 'Successfully Purchased!' : `Buy ${buyAmount/1000000} $WORK for ${quoteData ? formatSolAmount(quoteData.inAmount) + ' SOL' : '...'}`}
          </button>

          {success && (
            <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
              <p className="font-medium mb-2">
                🎉 Congratulations! You&apos;ve successfully purchased 200,000 WORK tokens.
              </p>
              {txId && (
                <a
                  href={`https://solscan.io/tx/${txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View transaction on Solscan
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}