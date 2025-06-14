"use client";
import type React from "react";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { DiscordSignInButton } from "./discord-sign-in-button";
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "./theme-toggle";

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [endpointUrl, setEndpointUrl] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setEndpointUrl(`${origin}/api/rpc`);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  if (!endpointUrl) {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConnectionProvider endpoint={endpointUrl}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {/* Desktop - visible on large screens and up */}
            <div className="hidden lg:flex gap-2 items-center fixed top-4 right-8 z-[1000]">
              <ThemeToggle />
              <WalletMultiButton />
              <DiscordSignInButton />
            </div>

            {/* Mobile/Tablet - Theme toggle and hamburger menu for medium screens and below */}
            <div className="lg:hidden fixed top-4 right-4 z-[1000] flex items-center gap-2">
              <ThemeToggle />

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 bg-gray-800 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>

                {/* Sliding menu */}
                <div
                  className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 ${
                    isMenuOpen ? "translate-x-0" : "translate-x-full"
                  }`}
                  style={{ zIndex: 999 }}
                >
                  <div className="p-6 pt-16">
                    <div className="flex flex-col gap-4 items-center">
                      <div className="flex justify-center">
                        <WalletMultiButton className="!max-w-[200px] !justify-center" />
                      </div>
                      <div className="flex justify-center">
                        <DiscordSignInButton />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlay with backdrop blur */}
                {isMenuOpen && (
                  <div
                    className="fixed inset-0 backdrop-blur-sm bg-black/20 transition-all duration-300"
                    style={{ zIndex: 998 }}
                    onClick={() => setIsMenuOpen(false)}
                  />
                )}
              </div>
            </div>

            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
}
