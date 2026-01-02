"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Hardcoded values for WORK token
const WORK_TOKEN = {
  mint: "F7Hwf8ib5DVCoiuyGr618Y3gon429Rnd1r5F9R5upump",
  decimals: 6,
  amount: 200000000000,
  symbol: "WORK"
};

export default function MissingParams() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyWork = () => {
    setIsLoading(true);
    // Construct URL with hardcoded parameters
    const queryParams = new URLSearchParams({
      tokenMint: WORK_TOKEN.mint,
      requiredRawAmount: WORK_TOKEN.amount.toString(),
      tokenSymbol: WORK_TOKEN.symbol,
      tokenDecimals: WORK_TOKEN.decimals.toString(),
      guildName: "GibWork"
    });
    
    router.push(`/buy?${queryParams.toString()}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 text-center mt-16">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-4 text-primary">Missing Parameters</h1>
        
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          The buy page requires specific parameters to function correctly. These parameters are typically provided through a proper buy link.
        </p>
        
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">How to get a valid link:</h2>
          <ol className="text-left text-gray-700 dark:text-gray-300 list-decimal pl-5">
            <li className="mb-2 ml-3">Use the Discord bot command to generate a buy link</li>
            <li className="mb-2 ml-3">Click on the link provided by the bot</li>
            <li className="mb-2 ml-3">Do not modify the URL parameters</li>
          </ol>
        </div>
        
        <div className="mb-6">
          <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-4"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
          <div className="w-full h-px bg-gray-300 dark:bg-gray-600 my-4"></div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Buy WORK tokens directly:</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            You can proceed with buying WORK tokens with the default settings.
          </p>
          
          <button
            onClick={handleBuyWork}
            disabled={isLoading}
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition duration-300 flex items-center justify-center w-full"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {isLoading ? "Loading..." : "Buy 200000 WORK Tokens"}
          </button>
        </div>
      </div>
    </div>
  );
}
