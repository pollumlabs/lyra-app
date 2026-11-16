"use client";
import { Button } from "@/components/Button";
import Tabs, { TabContent } from "@/components/Tabs";
import {
  EthereumAddress,
  useAllowanceTSELIC,
  useApproveTSELIC,
  useBalanceOfTSELIC,
} from "@/hooks/useErc20";
import {
  useGetBorrowedAmount,
  useGetDepositedTSELIC,
  useSupplyTSELIC,
  useWithdrawTSELIC,
} from "@/hooks/useRBLLPoolContract";
import { fromUnits, toUnits, unitsToInput } from "@/hooks/useTx";
import { useToastStore } from "@/stores/toast";
import Image from "next/image";
import { useState } from "react";

export const ContextSupplyTSelic = ({ address }: { address: string }) => {
  const [valueTselic, setValueTselic] = useState("");
  const [valueWithdrawlTselic, setValueWithdrawlTselic] = useState("");
  // Max withdraw goes through withdrawAllTSELIC so no dust is left behind.
  const [isMaxWithdraw, setMaxWithdraw] = useState(false);

  const { data: dataTselicBalance, isLoading: isLoadingTselic } =
    useBalanceOfTSELIC(address as EthereumAddress);
  const { data: dataDepositedTSELIC, isLoading: isLoadingDepositedTSELIC } =
    useGetDepositedTSELIC(address as EthereumAddress);
  const { data: dataBorrowedAmount, isLoading: isLoadingBorrowedAmount } =
    useGetBorrowedAmount(address as EthereumAddress);
  const { data: dataAllowanceTSELIC, isLoading: isLoadingAllowanceTSELIC } =
    useAllowanceTSELIC(address as EthereumAddress);

  const isLoading =
    isLoadingTselic ||
    isLoadingDepositedTSELIC ||
    isLoadingBorrowedAmount ||
    isLoadingAllowanceTSELIC;

  const formattedTselicBalance = fromUnits(dataTselicBalance, 18);
  const formattedDepositedTSELIC = fromUnits(dataDepositedTSELIC, 18);
  const formattedBorrowed = fromUnits(dataBorrowedAmount, 18);

  const supplyAmount = toUnits(valueTselic, 18);
  const withdrawAmount = toUnits(valueWithdrawlTselic, 18);
  const allowance = typeof dataAllowanceTSELIC === "bigint" ? dataAllowanceTSELIC : 0n;
  const tselicBalance = typeof dataTselicBalance === "bigint" ? dataTselicBalance : 0n;
  const deposited = typeof dataDepositedTSELIC === "bigint" ? dataDepositedTSELIC : 0n;

  const { write: writeApproveTSELIC, isLoading: isLoadingApproveTSELIC } =
    useApproveTSELIC();
  const { write: writeSupplyTSELIC, isLoading: isLoadingSupplyTSELIC } =
    useSupplyTSELIC(supplyAmount);
  const { write: writeWithdrawTSELIC, isLoading: isLoadingWithdrawTSELIC } =
    useWithdrawTSELIC(isMaxWithdraw ? "MAX" : withdrawAmount);

  const overBalance = (value: bigint, limit: bigint) => {
    if (value > limit) {
      useToastStore
        .getState()
        .showToast("The amount entered is greater than the current balance.", "error");
    }
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
                  {!isLoading
                    ? `${Number(formattedTselicBalance).toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}`
                    : "0"}{" "}
                  TSELIC
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueTselic}
                  onChange={(e) => {
                    setValueTselic(e.target.value);
                    overBalance(toUnits(e.target.value, 18), tselicBalance);
                  }}
                  style={{
                    WebkitAppearance: "none",
                    MozAppearance: "textfield",
                  }}
                />
                <div className="flex w-[130px] items-center justify-center gap-2.5 p-2">
                  <button
                    className="text-brandBlue-300 text-base font-normal leading-normal"
                    onClick={() =>
                      setValueTselic(unitsToInput(dataTselicBalance, 18))
                    }
                  >
                    max
                  </button>
                  <div className="relative h-6 w-6">
                    <Image
                      src={"/images/tesouroSelic.png"}
                      alt="logo"
                      layout="fill"
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="text-xs">TSELIC</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full w-full flex-col gap-2">
            <div className=" flex justify-between text-white">
              <span>TSELIC Supplied:</span>
              <span>
                {!isLoading ? `${formattedDepositedTSELIC}` : "0"} TSELIC
              </span>
            </div>
          </div>

          {allowance < supplyAmount ? (
            <Button
              text="Approve"
              onClick={writeApproveTSELIC}
              isLoading={isLoadingApproveTSELIC}
            />
          ) : (
            <Button
              text="Supply"
              onClick={writeSupplyTSELIC}
              isLoading={isLoadingSupplyTSELIC}
              disabled={supplyAmount === 0n || supplyAmount > tselicBalance}
            />
          )}
        </div>
      </TabContent>
      <TabContent title="Withdraw">
        <div className="flex h-[400px] w-full flex-col items-center justify-start gap-6 pt-5">
          <div className="flex w-full items-start justify-start gap-3">
            <div className="flex h-full w-full flex-col items-start justify-start gap-1">
              <div className="inline-flex items-start justify-start gap-6">
                <div className="text-base font-normal leading-normal text-gray-400">
                  Supplied:{" "}
                  {!isLoading
                    ? `${Number(formattedDepositedTSELIC).toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}`
                    : "0"}{" "}
                  TSELIC
                </div>
              </div>
              <div className="border-brandBlue-300 inline-flex w-full items-center justify-between rounded-lg border border-opacity-20 bg-gray-700 px-3">
                <input
                  type="number"
                  className="h-full min-w-[50px] border-none bg-transparent text-base font-normal leading-normal text-white shadow outline-none focus:border-transparent focus:outline-none focus:ring-0"
                  placeholder={"0"}
                  value={valueWithdrawlTselic}
                  onChange={(e) => {
                    setMaxWithdraw(false);
                    setValueWithdrawlTselic(e.target.value);
                    overBalance(toUnits(e.target.value, 18), deposited);
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
                      setMaxWithdraw(true);
                      setValueWithdrawlTselic(unitsToInput(dataDepositedTSELIC, 18));
                    }}
                  >
                    max
                  </button>
                  <div className="relative h-6 w-6">
                    <Image
                      src={"/images/tesouroSelic.png"}
                      alt="logo"
                      layout="fill"
                      className="rounded-full object-cover"
                    />
                  </div>
                  <div className="text-xs">TSELIC</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex h-full w-full flex-col gap-2">
            <div className=" flex justify-between text-white">
              <span>TSELIC Supplied:</span>
              <span>
                {!isLoading ? `${formattedDepositedTSELIC}` : "0"} TSELIC
              </span>
            </div>
            <div className="flex justify-between text-white">
              <span>DREX Borrowed:</span>
              <span>
                {!isLoading
                  ? `${formattedBorrowed.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "0"}{" "}
                DREX
              </span>
            </div>
          </div>
          <Button
            text="Withdraw"
            onClick={writeWithdrawTSELIC}
            isLoading={isLoadingWithdrawTSELIC}
            disabled={!isMaxWithdraw && (withdrawAmount === 0n || withdrawAmount > deposited)}
          />
        </div>
      </TabContent>
    </Tabs>
  );
};
