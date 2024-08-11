"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useAccount, useSimulateContract, useToken, useWriteContract } from "wagmi";
import { Address, Balance } from "../../components/scaffold-eth";

type ListItem  = {token:string; itemType:"Interest"|"Reward"; available:bigint}

const Rewards: NextPage = () => {
  const [list, setList] = useState<ListItem[]>([])

  const { address:userAddress } = useAccount();
  const {data:uniXHelperInfo} = useDeployedContractInfo("UniXHelper")
  const {data:usdcInfo} = useDeployedContractInfo("USDC")
  const {data:unixBankInfo} = useDeployedContractInfo("UniXBank")

  const {data:wbtcInfo} = useDeployedContractInfo("WBTC")
  const {data:aaveWETHInfo} = useDeployedContractInfo("AAVEWETH")
  const {data:WETHInfo} = useDeployedContractInfo("WETH9")
  const {data:routerInfo} = useDeployedContractInfo("UniswapV2Router02")
  const {data:rewardControllerInfo} = useDeployedContractInfo("AaveV3RewardController")
  const {data:poolInfo} = useDeployedContractInfo("AaveV3Pool")
  const {writeContractAsync} = useWriteContract()

  const {data:userUSDCInterest,isLoading:isUSDCInterestLoading,isSuccess:isUSDCInterestSuccess} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[userAddress??"",usdcInfo?.address,unixBankInfo?.address]
  })

  const {data:userWBTCInterest,isLoading:isWBTCInterestLoading,isSuccess:isWBTCInterestSuccess} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[userAddress??"",wbtcInfo?.address,unixBankInfo?.address]
  })

  const {data:userWETHInterest,isLoading:isETHInterestLoading,isSuccess:isETHInterestSuccess,error} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[userAddress??"",WETHInfo?.address,unixBankInfo?.address]
  })

  const {data:userUSDCRewards,isLoading:isUSDCRewardLoading,isSuccess:isUSDCRewardSuccess} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserRewards",
    args:[userAddress,usdcInfo?.address,rewardControllerInfo?.address,poolInfo?.address,unixBankInfo?.address]
  })

  const {data:userWBTCRewards,isLoading:isWBTCRewardLoading,isSuccess:isWBTCRewardSuccess} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserRewards",
    args:[userAddress,wbtcInfo?.address,rewardControllerInfo?.address,poolInfo?.address,unixBankInfo?.address]
  })

  const {data:userETHRewards,isLoading:isETHRewardLoading,isSuccess:isETHRewardSuccess} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserRewards",
    args:[userAddress,aaveWETHInfo?.address,rewardControllerInfo?.address,poolInfo?.address,unixBankInfo?.address]
  })

  useEffect(()=>{
    if(isUSDCInterestSuccess&&isWBTCInterestSuccess&&isETHInterestSuccess&&isUSDCRewardSuccess&&isWBTCRewardSuccess&&isETHRewardSuccess){
      const data:ListItem[] = []
      data.push({token:usdcInfo?.address??"",itemType:"Interest",available:userUSDCInterest?.result})
      data.push({token:wbtcInfo?.address??"",itemType:"Interest",available:userWBTCInterest?.result});
      data.push({token:WETHInfo?.address??"",itemType:"Interest",available:userWETHInterest?.result});


      (userUSDCRewards.result[0] as string[]).map((tokenAddress,i)=>{
        data.push({token:tokenAddress,itemType:"Reward",available:userUSDCRewards.result[1][i]})
      });

      (userWBTCRewards.result[0] as string[]).map((tokenAddress,i)=>{
        let isExist = false
        data.forEach((item)=>{
          if(item.token.toLowerCase() === tokenAddress.toLowerCase() && item.itemType === "Reward"){
            isExist = true
            return
          }
        })
        if(!isExist){
          data.push({token:tokenAddress,itemType:"Reward",available:userWBTCRewards.result[1][i]})
        }
      });

      (userETHRewards.result[0] as string[]).map((tokenAddress,i)=>{
        let isExist = false
        data.forEach((item)=>{
          if(item.token.toLowerCase() === tokenAddress.toLowerCase() && item.itemType === "Reward"){
            isExist = true
            return
          }
        })
        if(!isExist){
          data.push({token:tokenAddress,itemType:"Reward",available:userETHRewards.result[1][i]})
        }
      });
      setList(data)
    }
    
  },[isUSDCInterestLoading,isWBTCInterestLoading,isETHInterestLoading,isUSDCRewardLoading,isWBTCRewardLoading,isETHRewardLoading])

  const handleClaim = useCallback(async (token:string,type:"Interest"|"Reward")=>{
    if(type === "Interest"){
      await writeContractAsync({
        abi:unixBankInfo?.abi??[],
        address:unixBankInfo?.address??"",
        functionName:"claimInterest",
        args:[userAddress??"",token]
      })
    }else{
      await writeContractAsync({
        abi:unixBankInfo?.abi??[],
        address:unixBankInfo?.address??"",
        functionName:"claimReward",
        args:[userAddress??"",token]
      })
    }
  },[unixBankInfo])

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {list.map((data,i)=>{
        return <div className="flex w-screen h-auto pt-4 pb4" key={i}>
        <span className="flex-1">{data.token}</span>
        <span className="flex-1">{data.available.toString()}</span>
        <button className=" w-40" onClick={()=>{
          try{
            handleClaim(data.token,data.itemType)
          }catch(error){
            console.error("handleClaim error:", error);
          }
        }}>claim</button>
      </div>
      })}
    </div>
  );
};

export default Rewards;
