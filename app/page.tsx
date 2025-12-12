"use client";
import { useEffect } from "react";
import Image from "next/image";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
  WalletDropdownBasename,
  WalletDropdownFundLink
} from '@coinbase/onchainkit/wallet';
import {
  Identity,
  Avatar,
  Name,
  Address,
  EthBalance
} from '@coinbase/onchainkit/identity';

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const router = useRouter();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8">
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 sm:w-48 sm:h-48">
          <Image
            src="/base-logo.png"
            alt="Base Logo"
            fill
            className="object-contain rounded-xl"
          />
        </div>
        <div className="relative w-32 h-32 sm:w-48 sm:h-48">
          <Image
            src="/trio-logo.png"
            alt="Trio Logo"
            fill
            className="object-contain rounded-xl"
          />
        </div>
      </div>
      <h1 className="text-4xl font-bold text-center">Base Mini App Template</h1>
      <p className="text-center text-gray-600">
        Welcome to your new Base MiniApp!
      </p>

      <div className="fixed bottom-8 w-full px-4">
        <button
          onClick={() => router.push('/examples')}
          className="w-full bg-[#0000ff] text-button-text font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
