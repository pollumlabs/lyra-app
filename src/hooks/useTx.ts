import { useEffect } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  parseUnits,
} from "viem";
import { useContractWrite, useWaitForTransaction } from "wagmi";

import { useToastStore } from "@/stores/toast";

const toast = (message: string, type: "success" | "error") =>
  useToastStore.getState().showToast(message, type);

const shortHash = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

/** The revert reason if there is one, otherwise viem's one-line summary. */
export function errorMessage(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.reason) {
      return revert.reason;
    }
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Decimal string from an input → base units. Anything unparsable or negative is 0. */
export function toUnits(value: string, decimals: number): bigint {
  try {
    const units = parseUnits(value.trim() as `${number}`, decimals);
    return units > 0n ? units : 0n;
  } catch {
    return 0n;
  }
}

/** Base units → number for display. Tolerates reads that haven't resolved yet. */
export function fromUnits(value: unknown, decimals: number): number {
  return typeof value === "bigint" ? Number(formatUnits(value, decimals)) : 0;
}

/** Base units → exact decimal string, for filling inputs without float rounding. */
export function unitsToInput(value: unknown, decimals: number): string {
  return typeof value === "bigint" ? formatUnits(value, decimals) : "";
}

type TxConfig = {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
};

/**
 * Sends a contract write when `write()` is called and reports it through toasts.
 *
 * The call is simulated at click time with the current args (no cached prepare),
 * so a revert surfaces as its reason instead of a button that silently does
 * nothing. `isLoading` covers both signing and waiting for the receipt.
 */
export function useTx(config: TxConfig, successMessage: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { writeAsync, data, isLoading: isSigning } = useContractWrite(config as any);
  const hash = data?.hash;
  const receipt = useWaitForTransaction({ hash });

  useEffect(() => {
    if (!receipt.data) return;
    if (receipt.data.status === "success") toast(successMessage, "success");
    else toast(`Transaction ${shortHash(receipt.data.transactionHash)} reverted`, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.data]);

  useEffect(() => {
    if (receipt.error) toast(errorMessage(receipt.error), "error");
  }, [receipt.error]);

  const write = async () => {
    try {
      const { hash } = await writeAsync();
      toast(`Transaction ${shortHash(hash)} submitted`, "success");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const isPending = !!hash && !receipt.data && !receipt.error;
  return { write, isLoading: isSigning || isPending };
}
