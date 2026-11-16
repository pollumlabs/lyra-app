import { useContractRead } from 'wagmi';
import { BigNumberish } from 'ethers';
import { useTx } from './useTx';
import { abi as rBRLLABI } from '../contracts/rBRLLABI';
import { abi as InterestRateModelABI } from '../contracts/InterestRateModelABI';
import { rBRLLPool, InterestRateModel, FAUCET } from '../constant/contracts'
import { abi as FaucetABI } from '../contracts/FaucetABI';

interface ContractReadHookReturn<T> {
  data: T;
  isError: boolean;
  isLoading: boolean;
}

function usePoolTx(functionName: string, args: readonly unknown[], successMessage: string) {
  return useTx({ address: rBRLLPool, abi: rBRLLABI, functionName, args }, successMessage);
}

export function useFaucetWrite() {
  return useTx(
    { address: FAUCET, abi: FaucetABI, functionName: 'claimTokens' },
    'Claimed 0.1 TSELIC and 1,000 DREX'
  );
}

export function useRBRLLPoolRead<T = any>(functionName: string, args?: any[]): ContractReadHookReturn<T> {
  const { data, isError, isLoading } = useContractRead({
    address: rBRLLPool,
    abi: rBRLLABI,
    functionName,
    args,
    watch:true
  });

  return { data: data as T, isError, isLoading };
}

// 'MAX' uses the contract's *All variants, which settle the exact balance
// (including interest accrued after the UI last read it).
export function useSupplyDREX(amount: bigint) {
  return usePoolTx('supplyDREX', [amount], 'DREX supplied');
}

export function useWithdrawDREX(amount: bigint | 'MAX') {
  return amount === 'MAX'
    ? usePoolTx('withdrawAllDREX', [], 'DREX withdrawn')
    : usePoolTx('withdrawDREX', [amount], 'DREX withdrawn');
}

export function useRepayDREX(amount: bigint | 'MAX') {
  return amount === 'MAX'
    ? usePoolTx('repayAll', [], 'Debt repaid')
    : usePoolTx('repayDREX', [amount], 'Debt repaid');
}

// Function to get total supplied
export function useGetTotalSupplied() {
  return useRBRLLPoolRead('totalSupplyrBRLL');
}

// Function to get total borrowed
export function useGetTotalBorrowed() {
  return useRBRLLPoolRead('totalBorrowrBRLL');
}

// Function to get total borrowed
export function useGetTotalDepositedTSELIC() {
  return useRBRLLPoolRead('totalDepositedTSELIC');
}


export function useFlashLiquidateBorrow(borrower: string, repayAmount: bigint, tselicInMaximum: bigint) {
  return usePoolTx('flashLiquidateBorrow', [borrower, repayAmount, tselicInMaximum], 'Recall executed');
}

export function useSupplyTSELIC(amount: bigint) {
  return usePoolTx('supplyTSELIC', [amount], 'TSELIC supplied');
}

export function useWithdrawTSELIC(amount: bigint | 'MAX') {
  return amount === 'MAX'
    ? usePoolTx('withdrawAllTSELIC', [], 'TSELIC withdrawn')
    : usePoolTx('withdrawTSELIC', [amount], 'TSELIC withdrawn');
}

// Function to get borrowed amount
export function useGetBorrowedAmount(userAddress: string) {
  return useRBRLLPoolRead('getBorrowedAmount', [userAddress]);
}

// Function to get deposited TSELIC
export function useGetDepositedTSELIC(userAddress: string) {
  return useRBRLLPoolRead('depositedTSELIC', [userAddress]);
}

// Function to get supplied DREX
export function useGetSuppliedDREX(userAddress: string) {
  return useRBRLLPoolRead('balanceOf', [userAddress]);
}

export function useBorrowDREX(amount: bigint) {
  return usePoolTx('borrowDREX', [amount], 'DREX borrowed');
}

export function useHasRole(role: string, userAddress: string) {
  return useRBRLLPoolRead<boolean>('hasRole', [role, userAddress]);
}

// Collateral value * 100 / debt must stay >= this (1e18-scaled percent, 101e18 = 101%).
export function useGetSafeCollateralRate() {
  return useRBRLLPoolRead<bigint>('safeCollateralRate');
}

// Share of interest kept by the protocol, scaled by 1e8.
export function useGetReserveFactor() {
  return useRBRLLPoolRead<bigint>('reserveFactor');
}

// Function to get the market price of TSELIC via Chainlink
export function useGetUnitValue<T = any>(): ContractReadHookReturn<T> {
  const { data, isError, isLoading } = useContractRead({
    address: InterestRateModel,
    abi: InterestRateModelABI,
    functionName: 'getUnitValue'
  });

  return { data: data as T , isError, isLoading };
}

// Function to get Supply Secondly Rate
export function useGetSupplyInterestRate(totalSupply: BigNumberish, totalBorrow: BigNumberish) {
  const { data, isError, isLoading } = useContractRead({
    address: InterestRateModel,
    abi: InterestRateModelABI,
    functionName: 'getSupplyInterestRate',
    args: [totalSupply, totalBorrow]
  });

  return { data, isError, isLoading };
}

// Function to get the Interest Rate of TSELIC via Chainlink
export function useGetInterestRate() {
  const { data, isError, isLoading } = useContractRead({
    address: InterestRateModel,
    abi: InterestRateModelABI,
    functionName: 'getInterestRate'
  });

  return { data, isError, isLoading };
}