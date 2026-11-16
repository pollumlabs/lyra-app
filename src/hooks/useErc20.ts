import { useContractRead } from 'wagmi';
import { BigNumberish } from 'ethers';
import { maxUint256 } from 'viem';
import { useTx } from './useTx';
import { abi as ERC20ABI } from '../contracts/ERC20ABI';
import { DREX, TSELIC29, rBRLLPool } from '../constant/contracts'


export type EthereumAddress = `0x${string}`;
type ERC20FunctionName = 'approve' | 'balanceOf' | 'totalSupply' | 'transfer' | 'transferFrom' | 'allowance' | 'name' | 'symbol' | 'decimals';
type ERC20ReadArgs = [string] | string[]

interface ContractReadHookReturn<T = any> {
  data: T;
  isError: boolean;
  isLoading: boolean;
}


function createERC20Hooks(address: `0x${string}`, symbol: string) {
  // Hook to perform read operations on an ERC20 contract
  function useERC20Read<T = any>(functionName: ERC20FunctionName, args?: ERC20ReadArgs): ContractReadHookReturn<T> {
    const { data, isError, isLoading } = useContractRead({
      address,
      abi: ERC20ABI,
      functionName,
      args,
      watch: true
    });

    return { data: data as T, isError, isLoading };
  }

  // Function to approve spending of tokens
  function useApprove() {
    return useTx(
      { address, abi: ERC20ABI, functionName: 'approve', args: [rBRLLPool, maxUint256] },
      `${symbol} approved`
    );
  }

  // Function to get the approved token balance of a given address
  function useAllowance(owner: EthereumAddress): ContractReadHookReturn<BigNumberish> {
    const agrs = [owner, rBRLLPool]
    return useERC20Read('allowance', agrs);
  }

  // Function to get the token balance of a given address
  function useBalanceOf(owner: EthereumAddress): ContractReadHookReturn<BigNumberish> {
    return useERC20Read('balanceOf', [owner]);
  }

  return { useERC20Read, useApprove, useAllowance, useBalanceOf };
}

export const {
  useERC20Read: useDREXRead,
  useApprove: useApproveDREX,
  useAllowance: useAllowanceDREX,
  useBalanceOf: useBalanceOfDREX
} = createERC20Hooks(DREX, 'DREX');

export const {
  useERC20Read: useTSELICRead,
  useApprove: useApproveTSELIC,
  useAllowance: useAllowanceTSELIC,
  useBalanceOf: useBalanceOfTSELIC
} = createERC20Hooks(TSELIC29, 'TSELIC');
