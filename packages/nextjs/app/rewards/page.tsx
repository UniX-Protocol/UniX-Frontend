"use client";

import { useEffect } from "react";
import deployedContracts from "../../contracts/deployedContracts";
import externalContracts from "../../contracts/externalContracts";
import {
  useDeployedContractInfo,
  useScaffoldContract,
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
  const {data:uniXHelperInfo} = useDeployedContractInfo("UniXHelper")
  const {data:usdcInfo} = useDeployedContractInfo("USDC")
  const {data:unixBankInfo} = useDeployedContractInfo("UniXBank")
  const {data:routerInfo} = useDeployedContractInfo("UniswapV2Router02")
  const {data:userInterest,isLoading,error,isSuccess} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[address??"",usdcInfo?.address,unixBankInfo?.address]
  })


  const uniswapV2Router02 = useScaffoldWriteContract("UniswapV2Router02");
  const { data } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: aaa } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [address, routerInfo?.address],
  });

  useEffect(() => {
    console.log("======", data?.toString());
  }, [data]);

  useEffect(() => {
    console.log("xxxxxx", userInterest?.toString());
  }, [userInterest]);

  useEffect(() => {
    console.log("isLoadingxxxxxx", error?.message);
  }, [isLoading]);

  // const [balance,setBalance] = useState(0)

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={async () => {
          await usdc.writeContractAsync({
            functionName: "approve",
            args: [routerInfo?.address, BigInt("1000000000000000000")],
          });
        }}
      >
        xxx{userInterest?.result}xxx
        ====={aaa?.toString()}===== approve
      </button>

      <button
        onClick={async () => {
          await uniswapV2Router02.writeContractAsync({
            functionName: "addLiquidityETH",
            args: [
              usdcInfo?.address,
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
