"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-eth";
import UniswapV2PairABI from "~~/contracts/abis/UniswapV2Pair.json";
import externalContracts from "~~/contracts/externalContracts";
import deployedContracts from "~~/contracts/deployedContracts";
import BigNumber from "bignumber.js";
import { parseEther, parseUnits } from "viem";

const Swap: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [sellCoin, setSellCoin] = useState<string>("Select coin")
  const [buyCoin, setBuyCoin] = useState<string>("Select coin")
  const [sellAmount, setSellAmount] = useState("")
  const [buyAmount, setBuyAmount] = useState("")
  const { data: wethContract } = useDeployedContractInfo("WETH9");
  const { writeContractAsync: usdcContract } = useScaffoldWriteContract("USDC");
  const { data: routerContract, isLoading: deployedContractLoading } = useDeployedContractInfo("UniswapV2Router02");
  const { data: result, isPending, writeContractAsync } = useWriteContract();
  const { data: unixBankInfo } = useDeployedContractInfo("UniXBank")
  const { data: approvedUSDC } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [connectedAddress, deployedContracts[202407311228].UniswapV2Router02.address],
  });

  const { data: pair } = useScaffoldReadContract({
    contractName: "UniswapV2Factory",
    functionName: "getPair",
    args: [wethContract?.address, externalContracts[202407311228].USDC.address],
  });

  const { data: reserves } = useReadContract({
    abi: UniswapV2PairABI,
    address: pair,
    args: [],
    functionName: 'getReserves',
  })
  console.log("reserve result", reserves)
  const { data: token0 } = useReadContract({
    abi: UniswapV2PairABI,
    address: pair,
    args: [],
    functionName: 'token0',
  })

  const ETHIndex = token0 === wethContract?.address ? 0 : 1;
  const USDCIndex = ETHIndex === 0 ? 1 : 0;

  const { data: ethbalance } = useReadContract({
    abi: UniswapV2PairABI,
    functionName: "balanceOf",
    address: wethContract?.address,
    args: [connectedAddress]
  })

  const { data: usdcbalance } = useReadContract({
    abi: UniswapV2PairABI,
    functionName: "balanceOf",
    address: externalContracts[202407311228].USDC.address,
    args: [connectedAddress]
  })
  console.log("eth balance", ethbalance)
  console.log("usdc balance", usdcbalance)

  function getBuyAmount(amount: string, coin: string) {
    if (amount === undefined || coin === undefined) { return "" }
    if (!reserves) { return "" }
    if (coin === "ETH") {
      return String(BigNumber(amount).multipliedBy((BigNumber((reserves as any)[USDCIndex]).dividedBy(BigNumber(1e6))).dividedBy((BigNumber((reserves as any)[ETHIndex]).dividedBy(BigNumber(1e18))))))
    } else if (coin === "USDC") {
      return String(BigNumber(amount).multipliedBy((BigNumber((reserves as any)[ETHIndex]).dividedBy(BigNumber(1e18))).dividedBy((BigNumber((reserves as any)[USDCIndex]).dividedBy(BigNumber(1e6))))))
    } else {
      return ""
    }
  }

  useEffect(() => {
    const buy_amount = getBuyAmount(sellAmount, sellCoin)
    setBuyAmount(buy_amount)
  }, [sellAmount, sellCoin]);

  const writeTxn = useTransactor();

  const handleApproveUSDC = async () => {
    if (usdcContract) {
      try {
        await usdcContract({
          functionName: "approve",
          args: [unixBankInfo!.address, BigInt(9999999)],
        });
      } catch (e) {
        console.error("Error approve USDC:", e);
      }
    }
  };

  const handleSwapAction = async () => {
    if (sellCoin === "ETH") {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: routerContract!.address,
            functionName: 'swapExactETHForTokens',
            abi: routerContract!.abi,
            args: [BigInt(0), [wethContract!.address, externalContracts[202407311228].USDC.address], connectedAddress, BigInt(Math.floor(Date.now() / 1000) + 36000000)],
            value: parseEther(sellAmount)
          })
          await writeTxn(makeWriteWithParams);
      } catch (e: any) {
        console.error(e)
      }
    } else {
      if (approvedUSDC && BigInt(sellAmount) > approvedUSDC ) {
        handleApproveUSDC
      }
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: routerContract!.address,
            functionName: 'swapExactTokensForETH',
            abi: routerContract!.abi,
            args: [parseUnits(sellAmount, 6), BigInt(0), [externalContracts[202407311228].USDC.address, wethContract!.address], connectedAddress!, BigInt(Math.floor(Date.now() / 1000) + 36000000)]
          })
          await writeTxn(makeWriteWithParams);
      } catch (e: any) {
        console.error("Error swap usdc to eth", e)
      }
    }
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="stat-value flex items-center pt-10 mb-10">SWAP Between USDC and ETH</div>
        <div className="card bg-base-100 text-primary-content w-96 h-50">
          <div className="card-body items-center text-center">
            <div className="input input-bordered flex items-center">
              <input type="number" className="grow" placeholder="Sell Amount" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
              <span>
                <div className="flex items-center pl-5">
                  <button className="btn btn-active btn-sm" onClick={() => document.getElementById('select_coin').showModal()}>{sellCoin}</button>
                  <dialog id="select_coin" className="modal">
                    <div className="modal-box">
                      <form method="dialog">
                        <button className="btn m-10" onClick={() => {
                          setSellCoin("USDC")
                          setBuyCoin("ETH")
                        }}>USDC</button>
                        <button className="btn m-10" onClick={() => {
                          setSellCoin("ETH")
                          setBuyCoin("USDC")
                        }}>ETH</button>
                      </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                      <button>close</button>
                    </form>
                  </dialog>
                </div>
              </span>
            </div>
            <div className="flex items-center">
              <div className="input input-bordered flex items-center">
                <input type="number" className="grow" placeholder="Buy Amount" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} />
                <span>
                  <div className="join-item flex items-center pl-5">
                    <button className="btn btn-active btn-sm">{buyCoin}</button>
                  </div>
                </span>
              </div>
            </div>
          </div>
          <div className="card-actions justify-center m-5">
            <button className="btn" 
              onClick={() => handleSwapAction()} 
              disabled={connectedAddress === undefined}
            >
              Swap
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Swap;
