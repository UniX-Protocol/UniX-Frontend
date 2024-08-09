"use client";

import { useScaffoldWriteContract } from "../../hooks/scaffold-eth";
import { NextPage } from "next";

const Rewards: NextPage = () => {
  // useSimulateContract({
  //   abi:
  // })

  const usdc = useScaffoldWriteContract("USDC");

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={async () => {
          await usdc.writeContractAsync({
            functionName: "approve",
            args: ["0xB3e3757AfaB8eB52021115150caBFD6B0c838293", BigInt("10000000")],
          });
        }}
      >
        {" "}
        approve
      </button>
    </div>
  );
};

export default Rewards;
