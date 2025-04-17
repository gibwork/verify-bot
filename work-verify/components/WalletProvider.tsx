"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";


export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  //const network = WalletAdapterNetwork.Mainnet; 
  const [endpointUrl, setEndpointUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setEndpointUrl(`${origin}/api/rpc`);
    }
  }, []); 
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [] 
  );

  if (!endpointUrl) {
    return null; 
  }

  return (
    <ConnectionProvider endpoint={endpointUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ position: 'absolute', top: 24, right: 30 }}>
            <WalletMultiButton />
          </div>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}