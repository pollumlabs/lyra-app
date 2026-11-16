import { createConfig, configureChains } from "wagmi"

import { sepolia } from "wagmi/chains"
import { publicProvider } from "wagmi/providers/public"

import { InjectedConnector } from "wagmi/connectors/injected"
import { MetaMaskConnector } from "wagmi/connectors/metaMask"
import { WalletConnectConnector } from "wagmi/connectors/walletConnect"

// viem's default Sepolia RPC (rpc.sepolia.org) is unreliable; use publicnode.
const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com"
export const appChain = {
  ...sepolia,
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: { http: [SEPOLIA_RPC] },
    public: { http: [SEPOLIA_RPC] },
  },
}

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [appChain],
  [publicProvider()],
)

export const connectionConfig = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: "7d4d4bcd74915500431c20f675eda851",
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
})
