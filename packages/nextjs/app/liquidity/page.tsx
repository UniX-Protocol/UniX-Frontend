"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount, useWriteContract } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-eth";
import externalContracts from "~~/contracts/externalContracts";
import { parseEther } from "viem";

const Liquidity: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { data: result, isPending, writeContractAsync } = useWriteContract();
  const { data: routerContract, isLoading: deployedContractLoading } = useDeployedContractInfo("UniswapV2Router02");
  const { writeContractAsync: usdcContract } = useScaffoldWriteContract("USDC");
  const { data: approvedUSDC } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [connectedAddress, routerContract?.address],
  });
  const { data: position } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [connectedAddress, routerContract?.address],
  });
  const writeTxn = useTransactor();

  const handleApprove = async () => {
    if (usdcContract) {
      try {
        await usdcContract({
          functionName: "approve",
          args: [routerContract.address, BigInt(10000000000000)],
        });
      } catch (e) {
        console.error("Error setting greeting:", e);
      }
    }
  };

  const handleAddLiquidity = async () => {
    console.log(approvedUSDC)
    if (BigInt(approvedUSDC) > 0) {
      if (writeContractAsync) {
        try {
          const makeWriteWithParams = () =>
            writeContractAsync({
              address: routerContract.address,
              functionName: 'addLiquidityETH',
              abi: routerContract.abi,
              args: [externalContracts[202407311228].USDC.address, BigInt(100000), BigInt(100000), BigInt(100000), connectedAddress, Math.floor(Date.now() / 1000) + 36000000],
              value: BigInt(100000),
            });
          await writeTxn(makeWriteWithParams);

        } catch (e: any) {
          console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
        }
      }
    } else {
      handleApprove();
    }

  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-row items-center justify-between my-5 min-w-96">
          <h1>Position</h1>
          <button className="btn" onClick={() => document.getElementById('my_modal_1').showModal()}>New Position</button>
          <dialog id="my_modal_1" className="modal">
            <div className="modal-box h-96">
              <form method="dialog">
                {/* if there is a button in form, it will close the modal */}
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
              </form>
              <div className="flex flex-col justify-between items-center h-full">
                <h1>Add Liquidity</h1>
                <label className="input input-bordered flex items-center gap-2">
                  <input type="text" className="grow" placeholder="" />
                  <span>ETH</span>
                </label>
                <label className="input input-bordered flex items-center gap-2">
                  <input type="text" className="grow" placeholder="" />
                  <span>USDC</span>
                </label>
              <button className="btn" onClick={() => handleAddLiquidity()}>Supply</button>

              </div>

            </div>
          </dialog>
        </div>
        <div className="card glass w-96">
          <figure>
            <img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="car!" />
          </figure>
          <div className="card-body">
            <h2 className="card-title">Life hack</h2>
            <p>How to park your car at your garage?</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Learn now!</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Liquidity;
