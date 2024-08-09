"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address, IntegerInput } from "~~/components/scaffold-eth";

const Swap: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [txValue, setTxValue] = useState<string | bigint>("");
  const [sellCoin, setSellCoin] = useState<string>("Select coin")
  const [buyCoin, setBuyCoin] = useState<String>("Select coin")

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="stat-value flex items-center pt-10 mb-10">SWAP Between USDC and ETH</div>
        <div className="card bg-neutral text-neutral-content w-96">
          <div className="card-body items-center text-center">
            <div className="join">
              <div className="join-item flex items-center">
                <IntegerInput
                  value={txValue}
                  onChange={updatedTxValue => {
                    setTxValue(updatedTxValue);
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
                  value={txValue}
                  onChange={updatedTxValue => {
                    setTxValue(updatedTxValue);
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
