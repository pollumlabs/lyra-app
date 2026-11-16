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
  useGetSupplyInterestRate,
  useGetReserveFactor,
  useGetSuppliedDREX,
  useGetUnitValue,
  useSupplyDREX,
  useWithdrawDREX,
  useFlashLiquidateBorrow,
  useHasRole,
} from "@/hooks/useRBLLPoolContract";
import { fromUnits, toUnits, unitsToInput } from "@/hooks/useTx";
import { BigNumberish } from "ethers";
import Image from "next/image";
import { useState } from "react";
import { BORROWER, POOL_MANAGER_ROLE } from "@/constant/roles";
import { useToastStore } from "@/stores/toast";

// Headroom for the Uniswap fee and price impact when selling TSELIC in a recall.
const RECALL_SLIPPAGE_BPS = 500n;

export const ContextSupplyDrex = ({
  address,
  dataTotalSupplied,
  dataTotalBorrowed,
}: {
  address: string;
  dataTotalSupplied: BigNumberish;
  dataTotalBorrowed: BigNumberish;
}) => {
  const [valueDREX, setValueDREX] = useState("");
  const [valueRBLL, setValueRBLL] = useState("");
  // Max withdraw goes through withdrawAllDREX so accrued interest isn't left behind.
  const [isMaxWithdraw, setMaxWithdraw] = useState(false);

  const { data: dataAllowanceDREX } = useAllowanceDREX(address as EthereumAddress);
  const { data: dataDrexBalance, isLoading: isLoadingDrex } = useBalanceOfDREX(
    address as EthereumAddress
  );
  const { data: dataSuppliedDREX, isLoading: isLoadingSuppliedDREX } =
    useGetSuppliedDREX(address as EthereumAddress);
  const { data: canRecall } = useHasRole(POOL_MANAGER_ROLE, address);
  const { data: dataUnitValue } = useGetUnitValue<bigint>();
  const { data: dataReserveFactor } = useGetReserveFactor();
  const { data: dataSupplyInterestRate, isLoading: isLoadingSupplyInterestRate } =
    useGetSupplyInterestRate(dataTotalSupplied || 0, dataTotalBorrowed || 0);

  const isLoading = isLoadingDrex || isLoadingSupplyInterestRate || isLoadingSuppliedDREX;

  const drexBalance = fromUnits(dataDrexBalance, 6);
  const suppliedDREX = fromUnits(dataSuppliedDREX, 18);
  const formattedTotalSupply = fromUnits(dataTotalSupplied, 18);
  const formattedTotalBorrowed = fromUnits(dataTotalBorrowed, 18);
  const utilization =
    formattedTotalSupply === 0 ? 0 : (formattedTotalBorrowed / formattedTotalSupply) * 100;
  // Suppliers earn the utilization-scaled rate minus the protocol's reserve cut.
  const supplyApr =
    (Number(dataSupplyInterestRate || 0) / 1e6) *
    (1 - Number(dataReserveFactor || 0) / 1e8);

  const supplyAmount = toUnits(valueDREX, 6);
  const rbllAmount = toUnits(valueRBLL, 6); // rBRLL redeems 1:1 for DREX (6 decimals)
  const allowance = typeof dataAllowanceDREX === "bigint" ? dataAllowanceDREX : 0n;
  const drexBalanceUnits = typeof dataDrexBalance === "bigint" ? dataDrexBalance : 0n;
  const suppliedUnits =
    typeof dataSuppliedDREX === "bigint" ? dataSuppliedDREX / 10n ** 12n : 0n;

  // TSELIC needed to buy `rbllAmount` DREX at the oracle price, plus slippage.
  const recallTselicMax =
    typeof dataUnitValue === "bigint" && dataUnitValue > 0n
      ? (rbllAmount * 10n ** 30n * (10_000n + RECALL_SLIPPAGE_BPS)) /
        (dataUnitValue * 10_000n)
      : 0n;

  const { write: writeApprove, isLoading: isLoadingApproval } = useApproveDREX();
  const { write: writeDeposit, isLoading: isLoadingDeposit } = useSupplyDREX(supplyAmount);
  const { write: writeWithdrawal, isLoading: isLoadingWithDrawal } = useWithdrawDREX(
    isMaxWithdraw ? "MAX" : rbllAmount
  );
  const { write: writeRecall, isLoading: isLoadingRecall } = useFlashLiquidateBorrow(
    BORROWER,
    rbllAmount,
    recallTselicMax
  );

  const overBalance = (value: bigint, limit: bigint) => {
    if (value > limit) {
      useToastStore
        .getState()
        .showToast("The amount entered is greater than the current balance.", "error");
    }
  };

  const onRbllChange = (value: string) => {
    setMaxWithdraw(false);
    setValueRBLL(value);
    overBalance(toUnits(value, 6), suppliedUnits);
  };

  const fillMaxRbll = () => {
    setMaxWithdraw(true);
    setValueRBLL(unitsToInput(suppliedUnits, 6));
  };

  return (
    <Tabs>
      <TabContent title="Supply">
        <div className="flex h-[400px] w-full flex-col items-center justify-start gap-6 pt-5">
          <div className="flex w-full items-start justify-start gap-3">
            <div className="flex h-full w-full flex-col items-start justify-start gap-1">
              <div className="inline-flex items-start justify-start gap-6">
                <div className="text-base font-normal leading-normal text-gray-400">
                  Balance:{" "}
                  {drexBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  DREX
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueDREX}
                  onChange={(e) => {
                    setValueDREX(e.target.value);
                    overBalance(toUnits(e.target.value, 6), drexBalanceUnits);
                  }}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-center gap-2.5 p-2">
                  <button
                    className="text-brandBlue-300 text-base font-normal leading-normal"
                    onClick={() => setValueDREX(unitsToInput(dataDrexBalance, 6))}
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
              <span>Supply APR:</span>
              <span>
                {supplyApr.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                %
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Total Supplied:</span>
              <span>
                {!isLoading
                  ? `R$ ${Number(formattedTotalSupply).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "R$ 0"}
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Total Borrowed:</span>
              <span>
                {!isLoading
                  ? `R$ ${Number(formattedTotalBorrowed).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}`
                  : "R$ 0"}
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Utilization Rate:</span>
              <span>
                {!isLoading
                  ? `${utilization.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "0"}
                %
              </span>
            </div>
          </div>
          {allowance >= supplyAmount ? (
            <Button
              text="Supply"
              onClick={writeDeposit}
              isLoading={isLoadingDeposit}
              disabled={supplyAmount === 0n || supplyAmount > drexBalanceUnits}
            />
          ) : (
            <Button
              text="Approve"
              onClick={writeApprove}
              isLoading={isLoadingApproval}
            />
          )}
        </div>
      </TabContent>
      <TabContent title="Withdraw">
        <div className="flex h-[400px] w-full flex-col items-center justify-center gap-6 pt-5">
          <div className="flex w-full items-start justify-start gap-3">
            <div className="flex h-full w-full flex-col items-start justify-start gap-4">
              <div className="inline-flex items-start justify-start gap-6">
                <div className="text-base font-normal leading-normal text-gray-400">
                  Balance:{" "}
                  {!isLoading
                    ? `${suppliedDREX.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                    : "0"}{" "}
                  rBRLL
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueRBLL}
                  onChange={(e) => onRbllChange(e.target.value)}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-center gap-2.5 p-2">
                  <button
                    className="text-brandBlue-300 text-base font-normal leading-normal"
                    onClick={fillMaxRbll}
                  >
                    max
                  </button>
                  <div className="relative h-6 w-6">
                    <Image
                      src={"/images/brll.png"}
                      alt="logo"
                      layout="fill"
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="text-xs">rBRLL</div>
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueRBLL} // Set this value to be the same as the first input
                  readOnly // Makes this input read-only
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-end gap-2.5 p-2">
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
              <span>Available Liquidity:</span>
              <span>
                {!isLoading
                  ? `R$ ${(formattedTotalSupply - formattedTotalBorrowed).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "R$ 0"}
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Total Supplied:</span>
              <span>
                {!isLoading
                  ? `R$ ${Number(formattedTotalSupply).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "R$ 0"}
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Total Borrowed:</span>
              <span>
                {!isLoading
                  ? `R$ ${Number(formattedTotalBorrowed).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}`
                  : "R$ 0"}
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>Utilization Rate:</span>
              <span>
                {!isLoading
                  ? `${utilization.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "0"}
                %
              </span>
            </div>
          </div>

          <Button
            text="Withdraw"
            onClick={writeWithdrawal}
            isLoading={isLoadingWithDrawal}
            disabled={!isMaxWithdraw && (rbllAmount === 0n || rbllAmount > suppliedUnits)}
          />
        </div>
      </TabContent>
      <TabContent title="Recall">
        <div className="flex h-[400px] w-full flex-col items-center justify-start gap-6 pt-5">
          <div className="flex w-full items-start justify-start gap-3">
            <div className="flex h-full w-full flex-col items-start justify-start gap-4">
              <div className="inline-flex items-start justify-start gap-6">
                <div className="text-base font-normal leading-normal text-gray-400">
                  Balance:{" "}
                  {!isLoading
                    ? `${suppliedDREX.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                    : "0"}{" "}
                  rBRLL
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueRBLL}
                  onChange={(e) => onRbllChange(e.target.value)}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-center gap-2.5 p-2">
                  <button
                    className="text-brandBlue-300 text-base font-normal leading-normal"
                    onClick={() => setValueRBLL(unitsToInput(suppliedUnits, 6))}
                  >
                    max
                  </button>
                  <div className="relative h-6 w-6">
                    <Image
                      src={"/images/brll.png"}
                      alt="logo"
                      layout="fill"
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="text-xs">rBRLL</div>
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueRBLL} // Set this value to be the same as the first input
                  readOnly // Makes this input read-only
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-end gap-2.5 p-2">
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
          <div className="flex h-full w-full  text-white">
            Instant recall makes it easy to exchange TSELIC collateral for
            DREX through Uniswap.
          </div>

          <Button
            text="Recall"
            onClick={writeRecall}
            isLoading={isLoadingRecall}
            disabled={!canRecall || rbllAmount === 0n || recallTselicMax === 0n}
          />
        </div>
      </TabContent>
    </Tabs>
  );
};
