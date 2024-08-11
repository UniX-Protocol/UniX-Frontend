"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-eth";
import externalContracts from "~~/contracts/externalContracts";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import UniswapV2PairABI from "~~/contracts/abis/UniswapV2Pair.json";
import { useState } from "react";
import BigNumber from "bignumber.js";

const Liquidity: NextPage = () => {
  const [amount, setAmount] = useState(0);
  const [ethAmount, setEthAmount] = useState("0");
  const [usdcAmount, setUsdcAmount] = useState("0");
  const { address: connectedAddress } = useAccount();
  const { data: result, isPending, writeContractAsync } = useWriteContract();
  const { data: routerContract, isLoading: deployedContractLoading } = useDeployedContractInfo("UniswapV2Router02");
  const { data: wethContract } = useDeployedContractInfo("WETH9");
  const { writeContractAsync: usdcContract } = useScaffoldWriteContract("USDC");
  const { data: approvedUSDC } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [connectedAddress, deployedContracts[202407311228].UniswapV2Router02.address],
  });

  // const { data: usdc } = useScaffoldReadContract({
  //   contractName: "USDC",
  //   functionName: "balanceOf",
  //   args: [connectedAddress],
  // });

  // console.log(usdc, 'usdc')

  const { data: pair } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "getPair",
    args: [wethContract?.address, externalContracts[202407311228].USDC.address],
  });

  const { data: reserves } = useScaffoldReadContract({
    contractName: "UniXBank",
    functionName: "getPairBanlance",
    args: [pair],
  });

  // console.log(pair, 'pair')

  const { data: position } = useReadContract({
    abi: UniswapV2PairABI,
    address: pair,
    args: [connectedAddress],
    functionName: 'balanceOf',
    query: {
      refetchInterval: 2000,
    }
  })

  const { data: approvedLP } = useReadContract({
    abi: UniswapV2PairABI,
    address: pair,
    args: [connectedAddress, deployedContracts[202407311228].UniswapV2Router02.address],
    functionName: 'allowance',
    query: {
      refetchInterval: 2000,
    }
  })

  // const { data: reserves } = useReadContract({
  //   abi: UniswapV2PairABI,
  //   address: pair,
  //   args: [],
  //   functionName: 'getReserves',
  // })

  const { data: token0 } = useReadContract({
    abi: UniswapV2PairABI,
    address: pair,
    args: [],
    functionName: 'token0',
  })

  const ETHIndex = token0 == wethContract?.address ? 0 : 1;
  const USDCIndex = ETHIndex == 0 ? 1 : 0;


  console.log(reserves, 'reserves')

  // const { data: token0 } = useReadContract({
  //   abi: UniswapV2PairABI,
  //   address: pair,
  //   args: [],
  //   functionName: 'token0',
  // })

  const { data: totalSupply } = useReadContract({
    abi: UniswapV2PairABI,
    address: pair,
    args: [],
    functionName: 'totalSupply',
    query: {
      refetchInterval: 2000,
    }
  })


  const percent = position && totalSupply ? BigNumber(position as string).div(BigNumber(totalSupply as string)) : BigNumber(0);
  console.log(percent, percent.toFixed(), 'percent')

  console.log(reserves ? (BigNumber((reserves as any)[ETHIndex]).multipliedBy(percent).integerValue().toFixed()) : 0, 'bignumber')

  console.log(reserves, 'reserves')

  console.log(position, 'position')
  console.log(totalSupply, 'totalSupply')


  const writeTxn = useTransactor();

  const handleApproveUSDC = async () => {
    console.log(usdcContract)
    if (usdcContract) {
      try {
        await usdcContract({
          functionName: "approve",
          args: [routerContract?.address, BigInt(10000000000000)],
        });
      } catch (e) {
        console.error("Error approve USDC:", e);
      }
    }
  };

  const handleApproveLP = async () => {
    if (writeContractAsync) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: pair as string,
            functionName: 'approve',
            abi: UniswapV2PairABI,
            args: [routerContract?.address, BigInt(100000000000000000000)],
          });
        await writeTxn(makeWriteWithParams);

      } catch (e: any) {
        console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
      }
    }
  };

  const handleAddLiquidity = async () => {
    console.log('usdc', usdcAmount, parseUnits(usdcAmount, 6), parseEther(ethAmount))
    if (approvedUSDC && BigInt(approvedUSDC) > 0) {
      if (writeContractAsync) {
        try {
          const makeWriteWithParams = () =>
            writeContractAsync({
              address: routerContract?.address as string,
              functionName: 'addLiquidityETH',
              abi: routerContract?.abi as any,
              args: [externalContracts[202407311228].USDC.address, parseUnits(usdcAmount, 6), BigInt(0), BigInt(0), connectedAddress as string, Math.floor(Date.now() / 1000) + 36000000],
              value: parseEther(ethAmount),
            });
          await writeTxn(makeWriteWithParams);

        } catch (e: any) {
          console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
        }
        // @ts-ignore
        document.getElementById('add')?.close();
      }
    } else {
      handleApproveUSDC();
    }
  };

  const handleRemoveLiquidity = async () => {
    console.log(approvedLP)
    if (approvedLP && BigInt(approvedLP as string) > BigInt(position as string) * BigInt(amount) / BigInt(100)) {
      if (writeContractAsync) {
        try {
          console.log(BigInt(BigNumber(position as string).multipliedBy(BigNumber(amount)).dividedBy(BigNumber(100)).integerValue().toFixed()), 'amount')
          const makeWriteWithParams = () =>
            writeContractAsync({
              address: routerContract?.address as string,
              functionName: 'removeLiquidityETH',
              abi: routerContract?.abi as any,
              args: [externalContracts[202407311228].USDC.address, BigInt(BigNumber(position as string).multipliedBy(BigNumber(amount)).dividedBy(BigNumber(100)).integerValue().toFixed()), BigInt(0), BigInt(0), connectedAddress as string, Math.floor(Date.now() / 1000) + 36000000],
            });
          await writeTxn(makeWriteWithParams);
        } catch (e: any) {
          console.error("⚡️ ~ file: WriteOnlyFunctionForm.tsx:handleWrite ~ error", e);
        }
        // @ts-ignore
        document.getElementById('remove')?.close();

      }
    } else {
      handleApproveLP();
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-row items-center justify-between my-5 min-w-96">
          <h1>Position</h1>
          <button className="btn" onClick={
            // @ts-ignore
            () => document.getElementById('add').showModal()}>New Position</button>
          <dialog id="add" className="modal">
            <div className="modal-box h-96">
              <form method="dialog">
                {/* if there is a button in form, it will close the modal */}
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
              </form>
              <div className="flex flex-col justify-between items-center h-full">
                <h1>Add Liquidity</h1>
                <label className="input input-bordered flex items-center gap-2">
                  <input type="text" className="grow" placeholder="" value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} />
                  <span>ETH</span>
                </label>
                <label className="input input-bordered flex items-center gap-2">
                  <input type="text" className="grow" placeholder="" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} />
                  <span>USDC</span>
                </label>
                <button className="btn w-72 btn-info" onClick={() => handleAddLiquidity()}>{approvedUSDC ? 'Supply' : 'Approve'}</button>

              </div>

            </div>
          </dialog>
        </div>
        <div className="card glass w-96">
          {position && reserves ? (<>
            <div className="flex flex-col p-5 min-h-80 justify-around">
              <div className="px-5">USDC/ETH</div>
              <div className="flex flex-col p-5 justify-around max-h-64">
                <div className="flex flex-row justify-between py-1"><span>Total Pooled Tokens</span><span>{parseFloat(formatEther(position as bigint)).toFixed(10)}</span></div>
                <div className="flex flex-row justify-between py-1"><span>Pooled ETH</span><span>{reserves ? formatEther(BigInt(BigNumber((reserves as any)[ETHIndex]).multipliedBy(percent).integerValue().toFixed())) : 0}</span></div>
                <div className="flex flex-row justify-between py-1"><span>Pooled USDC</span><span>{reserves ? formatUnits((BigInt(BigNumber((reserves as any)[USDCIndex]).multipliedBy(percent).integerValue().toFixed())), 6) : 0}</span></div>
                <div className="flex flex-row justify-between py-1"><span>Your Pool Share</span><span>{(parseFloat(position as string) / parseFloat(totalSupply as string) * 100).toFixed(2)}%</span></div>
              </div>

              <button className="btn btn-error" onClick={
                // @ts-ignore
                () => document.getElementById('remove').showModal()}>Remove</button>
              <dialog id="remove" className="modal">
                <div className="modal-box h-96">
                  <form method="dialog">
                    {/* if there is a button in form, it will close the modal */}
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                  </form>
                  <div className="flex flex-col justify-around items-center h-full">
                    <h1>Remove Liquidity</h1>
                    <div className="w-full flex flex-col items-center">
                      <span>{amount}%</span>
                      <input type="range" min={0} max="100" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="range range-error" />
                    </div>
                    <div className="w-full">
                      <label className="flex items-center flex-row justify-between">
                        <span>ETH</span> <span>{formatEther((BigInt(BigNumber((reserves as any)[ETHIndex]).multipliedBy(percent).multipliedBy(amount).dividedBy(BigNumber(100)).integerValue().toFixed())))}</span>
                      </label>
                      <label className="flex items-center flex-row justify-between">
                        <span>USDC</span> <span>{formatUnits(BigInt(BigNumber((reserves as any)[USDCIndex]).multipliedBy(percent).multipliedBy(amount).dividedBy(BigNumber(100)).integerValue().toFixed()), 6)}</span>
                      </label>
                    </div>
                    <button className="btn btn-error w-full" onClick={() => handleRemoveLiquidity()}>{BigInt(approvedLP ? approvedLP as string : 0) > BigInt(position ? position as string : 0) * BigInt(amount) / BigInt(100) ? 'Remove' : 'Approve'}</button>

                  </div>

                </div>
              </dialog>
            </div>
          </>) : (<>
            <div className="p-5">
              No position
            </div>
          </>)}
        </div>
      </div>
    </>
  );
};

export default Liquidity;
