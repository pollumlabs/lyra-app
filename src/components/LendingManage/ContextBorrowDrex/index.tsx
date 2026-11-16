"use client";

import { Button } from "@/components/Button";
import Tabs, { TabContent } from "@/components/Tabs";
import {
  EthereumAddress,
  useBalanceOfDREX,
  useAllowanceDREX,
  useApproveDREX,
} from "@/hooks/useErc20";
import {
  useBorrowDREX,
  useGetBorrowedAmount,
  useGetDepositedTSELIC,
  useGetSafeCollateralRate,
  useGetUnitValue,
  useRepayDREX,
} from "@/hooks/useRBLLPoolContract";
import { fromUnits, toUnits, unitsToInput } from "@/hooks/useTx";
import { useToastStore } from "@/stores/toast";
import { BigNumberish } from "ethers";
import Image from "next/image";
import { useState } from "react";

const RBLL_PER_DREX = 10n ** 12n; // rBRLL has 18 decimals, DREX 6
const DEFAULT_SAFE_RATE = 101n * 10n ** 18n;

const asBigint = (value: unknown) => (typeof value === "bigint" ? value : 0n);
const fmt2 = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ContextBorrowDrex = ({
  address,
  dataTotalSupplied,
  dataTotalBorrowed,
}: {
  address: string;
  dataTotalSupplied: BigNumberish;
  dataTotalBorrowed: BigNumberish;
}) => {
  const [borrowValue, setBorrowValue] = useState("");
  const [repayValue, setRepayValue] = useState("");
  // Max repay goes through repayAll, which settles the exact debt including
  // interest accrued after the UI last read it.
  const [isMaxRepay, setMaxRepay] = useState(false);

  const { data: dataDrexBalance, isLoading: isLoadingDrex } = useBalanceOfDREX(
    address as EthereumAddress
  );
  const { data: dataDepositedTSELIC, isLoading: isLoadingDepositedTSELIC } =
    useGetDepositedTSELIC(address as EthereumAddress);
  const { data: dataBorrowedAmount, isLoading: isLoadingBorrowedAmount } =
    useGetBorrowedAmount(address as EthereumAddress);
  const { data: dataUnitValue, isLoading: isLoadingUnitValue } = useGetUnitValue();
  const { data: dataAllowanceDREX } = useAllowanceDREX(address as EthereumAddress);
  const { data: dataSafeRate } = useGetSafeCollateralRate();

  const isLoading =
    isLoadingDrex || isLoadingDepositedTSELIC || isLoadingBorrowedAmount || isLoadingUnitValue;

  const drexBalanceUnits = asBigint(dataDrexBalance);
  const deposited = asBigint(dataDepositedTSELIC);
  const debt = asBigint(dataBorrowedAmount); // rBRLL, 18 decimals
  const unitValue = asBigint(dataUnitValue);
  const allowance = asBigint(dataAllowanceDREX);
  const safeRate = asBigint(dataSafeRate) || DEFAULT_SAFE_RATE;
  const liquidity = asBigint(dataTotalSupplied) - asBigint(dataTotalBorrowed);

  // The pool requires collateralValue * 100 / debt >= safeCollateralRate.
  const maxDebt = (deposited * unitValue * 100n) / safeRate;
  const headroom = maxDebt > debt ? maxDebt - debt : 0n;
  // Keep 0.1% back so interest accrued before the tx lands doesn't trip the check.
  const byCollateral = (headroom * 999n) / 1000n / RBLL_PER_DREX;
  const byLiquidity = liquidity > 0n ? liquidity / RBLL_PER_DREX : 0n;
  const maxBorrow = byCollateral < byLiquidity ? byCollateral : byLiquidity;

  // repayAll pulls debt/1e12 + 1 DREX.
  const debtDrex = debt > 0n ? debt / RBLL_PER_DREX + 1n : 0n;

  const borrowAmount = toUnits(borrowValue, 6);
  const repayAmount = isMaxRepay ? debtDrex : toUnits(repayValue, 6);

  const { write: writeBorrowDREX, isLoading: isLoadingBorrowDREX } =
    useBorrowDREX(borrowAmount);
  const { write: writeRepayDREX, isLoading: isLoadingRepayDREX } = useRepayDREX(
    isMaxRepay ? "MAX" : repayAmount
  );
  const { write: writeApproveDREX, isLoading: isLoadingApproveDREX } = useApproveDREX();

  const warn = (message: string) => useToastStore.getState().showToast(message, "error");

  const drexBalance = fromUnits(dataDrexBalance, 6);
  const depositedTSELIC = fromUnits(dataDepositedTSELIC, 18);
  const borrowedAmount = fromUnits(dataBorrowedAmount, 18);
  const collateralValue = fromUnits(deposited * unitValue, 36);
  const availableLiquidity = fromUnits(liquidity, 18);

  return (
    <Tabs>
      <TabContent title="Borrow">
        <div className="flex h-[400px] w-full flex-col items-center justify-start gap-6 pt-5">
          <div className="flex w-full items-start justify-start gap-3">
            <div className="flex h-full w-full flex-col items-start justify-start gap-1">
              <div className="inline-flex items-start justify-start gap-6">
                <div className="text-base font-normal leading-normal text-gray-400">
                  Balance: {!isLoading ? fmt2(drexBalance) : "0"} DREX
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={borrowValue}
                  onChange={(e) => {
                    setBorrowValue(e.target.value);
                    if (toUnits(e.target.value, 6) > maxBorrow) {
                      warn("The amount entered is greater than your borrow limit.");
                    }
                  }}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-center gap-2.5 p-2">
                  <button
                    className="text-brandBlue-300 text-base font-normal leading-normal"
                    onClick={() => setBorrowValue(unitsToInput(maxBorrow, 6))}
                  >
                    max
                  </button>
                  <div className="relative h-6 w-6">
                    <Image
                      src={"/images/drex.png"}
                      alt="logo"
                      layout="fill"
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="text-xs">DREX</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-full w-full flex-col gap-2">
            <div className=" flex justify-between text-white">
              <span>TSELIC Supplied:</span>
              <span>{!isLoading ? fmt2(depositedTSELIC) : "0"} TSELIC</span>
            </div>
            <div className=" flex justify-between text-white">
              <span>Supplied (in Drex):</span>
              <span>{!isLoading ? `R$ ${fmt2(collateralValue)}` : "R$ 0"}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>DREX Borrowed:</span>
              <span>{!isLoading ? fmt2(borrowedAmount) : "0"} DREX</span>
            </div>
            <div className=" flex justify-between text-white">
              <span>Available Liquidity:</span>
              <span>{!isLoading ? fmt2(availableLiquidity) : "0"} DREX</span>
            </div>
          </div>
          <Button
            text="Borrow"
            onClick={writeBorrowDREX}
            disabled={borrowAmount === 0n || borrowAmount > maxBorrow}
            isLoading={isLoadingBorrowDREX}
          />
        </div>
      </TabContent>
      <TabContent title="Repay">
        <div className="flex h-[400px] w-full flex-col items-center justify-start gap-6 pt-5">
          <div className="flex w-full items-start justify-start gap-3">
            <div className="flex h-full w-full flex-col items-start justify-start gap-1">
              <div className="inline-flex items-start justify-start gap-6">
                <div className="text-base font-normal leading-normal text-gray-400">
                  Balance: {!isLoading ? fmt2(drexBalance) : "0"} DREX
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={repayValue}
                  onChange={(e) => {
                    setMaxRepay(false);
                    setRepayValue(e.target.value);
                    if (toUnits(e.target.value, 6) > drexBalanceUnits) {
                      warn("The amount entered is greater than the current balance.");
                    }
                  }}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-center gap-2.5 p-2">
                  <button
                    className="text-brandBlue-300 text-base font-normal leading-normal"
                    onClick={() => {
                      setMaxRepay(true);
                      setRepayValue(unitsToInput(debtDrex, 6));
                    }}
                  >
                    max
                  </button>
                  <div className="relative h-6 w-6">
                    <Image
                      src={"/images/drex.png"}
                      alt="logo"
                      layout="fill"
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="text-xs">DREX</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-full w-full flex-col gap-2">
            <div className="flex justify-between text-white">
              <span>Debt:</span>
              <span>{!isLoading ? fmt2(borrowedAmount) : "0"} DREX</span>
            </div>
          </div>

          {allowance < repayAmount ? (
            <Button
              text="Approve"
              onClick={writeApproveDREX}
              isLoading={isLoadingApproveDREX}
            />
          ) : (
            <Button
              text="Repay"
              onClick={writeRepayDREX}
              isLoading={isLoadingRepayDREX}
              disabled={
                repayAmount === 0n ||
                repayAmount > drexBalanceUnits ||
                (!isMaxRepay && repayAmount * RBLL_PER_DREX > debt)
              }
            />
          )}
        </div>
      </TabContent>
    </Tabs>
  );
};
