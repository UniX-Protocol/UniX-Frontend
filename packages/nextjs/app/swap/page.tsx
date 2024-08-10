"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useAccount, useReadContract } from "wagmi";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import UniswapV2PairABI from "~~/contracts/abis/UniswapV2Pair.json";
import externalContracts from "~~/contracts/externalContracts";

const Swap: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [sellCoin, setSellCoin] = useState<string>("Select coin")
  const [buyCoin, setBuyCoin] = useState<String>("Select coin")
  const [sellAmount, setSellAmount] = useState<string | bigint>("")
  const [buyAmount, setBuyAmount] = useState<string | bigint>("")
  const { data: wethContract } = useDeployedContractInfo("WETH9");


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
  console.log("reserve result")
  console.log(reserves)

  function getBuyAmount(amount: string | bigint, coin: string) {
    if (amount === undefined || coin === undefined ) { return "" }
    if (coin === "ETH") {
      return BigInt(1)
    } else {
      return BigInt(2)
    }
  }

  useEffect(() => {
    const buy_amount = getBuyAmount(sellAmount, sellCoin)
    setBuyAmount(buy_amount)
  }, [sellAmount, sellCoin]);

  const handleSwapAction = async () => {
    
  }

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="stat-value flex items-center pt-10 mb-10">SWAP Between USDC and ETH</div>
        <div className="card bg-neutral text-neutral-content w-96">
          <div className="card-body items-center text-center">
            <div className="join">
              <div className="join-item flex items-center">
                <IntegerInput
                  value={sellAmount}
                  onChange={updatedTxValue => {
                    setSellAmount(updatedTxValue);
                  }}
                  placeholder="Sell Amount"
                />
              </div>
              <div className="join-item flex items-center pl-5">
                <button className="btn btn-active btn-sm" onClick={() => document.getElementById('select_coin').showModal()}>{sellCoin}</button>
                <dialog id="select_coin" className="modal">
                  <div className="modal-box">
                    <form method="dialog">
                      <button className="btn btn-primary m-10" onClick={() => {
                        setSellCoin("USDC")
                        setBuyCoin("ETH")
                      }}>USDC</button>
                      <button className="btn btn-primary m-10" onClick={() => {
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
            </div>
            <div className="join">
              <div className="join-item flex items-center">
                <IntegerInput
                  value={buyAmount}
                  onChange={updatedTxValue => {
                    setSellAmount(updatedTxValue);
                  }}
                  placeholder="Buy Amount"
                />
              </div>
              <div className="join-item flex items-center pl-5">
                <button className="btn btn-active btn-sm">{buyCoin}</button>
              </div>
            </div>
            <div className="card-actions justify-end">
              <button className="btn btn-primary btn-block">Swap</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Swap;
