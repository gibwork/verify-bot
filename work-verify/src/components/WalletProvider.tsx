"use client"
import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import "@solana/wallet-adapter-react-ui/styles.css"
import { DiscordSignInButton } from "./discord-sign-in-button"
import { LedgerWalletAdapter, PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { ThemeProvider } from "next-themes"
import { ThemeToggle } from "./theme-toggle"

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [endpointUrl, setEndpointUrl] = useState<string>("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin
      setEndpointUrl(`${origin}/api/rpc`)
    }
  }, [])

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new LedgerWalletAdapter()],
    [],
  )

  if (!endpointUrl) {
    return null
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConnectionProvider endpoint={endpointUrl}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {/* Desktop - visible on medium screens and up */}
            <div className="hidden md:flex gap-2 items-center fixed top-4 right-8 z-[1000]">
              <ThemeToggle />
              <WalletMultiButton />
              <DiscordSignInButton />
            </div>

            <div className="md:hidden fixed top-4 right-4 z-[1000]">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              {isMenuOpen && (
                <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-md p-4 min-w-[200px]">
                  <div className="flex flex-col gap-3">
                    <ThemeToggle />
                    <WalletMultiButton />
                    <DiscordSignInButton />
                  </div>
                </div>
              )}
            </div>

            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  )
}
