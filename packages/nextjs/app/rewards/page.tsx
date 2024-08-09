"use client";

import { useEffect } from "react";
import deployedContracts from "../../contracts/deployedContracts";
import externalContracts from "../../contracts/externalContracts";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
  useWatchBalance,
} from "../../hooks/scaffold-eth";
import { contracts } from "../../utils/scaffold-eth/contract";
import { getAllContracts } from "../../utils/scaffold-eth/contractsData";
import { NextPage } from "next";
import { useAccount, useSimulateContract } from "wagmi";

const Rewards: NextPage = () => {
  // useSimulateContract({
  //   abi:
  // })

  const usdc = useScaffoldWriteContract("USDC");
  const { targetNetwork } = useTargetNetwork();
  // const unixHelperContract = getAllContracts()["UnixHelper"]
  const { address } = useAccount();
  // useSimulateContract({
  //   abi:deployedContracts[202407311228].UniXHelper.abi,
  //   functionName:"getUserInterest",
  //   args:[address,usdc.]
  // })

  const uniswapV2Router02 = useScaffoldWriteContract("UniswapV2Router02");
  const { data } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: aaa } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [address, "0x7c1aeb1A96D5edCaCdAd925e48253b71B771461C"],
  });

  useEffect(() => {
    console.log("======", data?.toString());
  }, [data]);

  // const [balance,setBalance] = useState(0)

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={async () => {
          await usdc.writeContractAsync({
            functionName: "approve",
            args: ["0x7c1aeb1A96D5edCaCdAd925e48253b71B771461C", BigInt("1000000000000000000")],
          });
        }}
      >
        ====={aaa?.toString()}===== approve
      </button>

      <button
        onClick={async () => {
          await uniswapV2Router02.writeContractAsync({
            functionName: "addLiquidityETH",
            args: [
              externalContracts[202407311228].USDC.address,
              BigInt(100000000000),
              BigInt(0),
              BigInt(0),
              address,
              BigInt(Math.floor(Date.now() / 1000 + 86400 * 2)),
            ],
            value: BigInt("100000000000000000"),
          });
        }}
      >
        ===
        {data?.toString()}
        === AddLiquidityETH
      </button>
    </div>
  );
};

export default Rewards;
