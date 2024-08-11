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
  useTransactor,
  useWatchBalance,
} from "../../hooks/scaffold-eth";
import { contracts } from "../../utils/scaffold-eth/contract";
import { getAllContracts } from "../../utils/scaffold-eth/contractsData";
import { NextPage } from "next";
import { useAccount, useReadContract, useReadContracts, useSimulateContract, useToken, useWriteContract } from "wagmi";
import { Address, Balance } from "../../components/scaffold-eth";
import BigNumber from "bignumber.js";
import { formatValue } from "../../utils/BignumberUtil";

type ListItem = { token: string; itemType: "Interest" | "Reward"; available: bigint }

const Rewards: NextPage = () => {
  const [list, setList] = useState<ListItem[]>([])

  const writeTxn = useTransactor()
  const { address: userAddress } = useAccount();
  const { data: uniXHelperInfo } = useDeployedContractInfo("UniXHelper")
  const { data: usdcInfo } = useDeployedContractInfo("USDC")
  const { data: unixBankInfo } = useDeployedContractInfo("UniXBank")

  const { data: wbtcInfo } = useDeployedContractInfo("WBTC")
  const { data: aaveWETHInfo } = useDeployedContractInfo("AAVEWETH")
  const { data: WETHInfo } = useDeployedContractInfo("WETH9")
  const { data: routerInfo } = useDeployedContractInfo("UniswapV2Router02")
  const { data: rewardControllerInfo } = useDeployedContractInfo("AaveV3RewardController")
  const { data: poolInfo } = useDeployedContractInfo("AaveV3Pool")
  const { writeContractAsync } = useWriteContract()

  const {data:userUSDCInterest,isLoading:isUSDCInterestLoading,isSuccess:isUSDCInterestSuccess,isRefetching:isRefetching1} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[userAddress??"",usdcInfo?.address,unixBankInfo?.address],
    query:{
      refetchInterval:3000
    }
  })

  const {data:userWBTCInterest,isLoading:isWBTCInterestLoading,isSuccess:isWBTCInterestSuccess,isRefetching:isRefetching2} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[userAddress??"",wbtcInfo?.address,unixBankInfo?.address],
    query:{
      refetchInterval:3000
    }
  })

  const {data:userWETHInterest,isLoading:isETHInterestLoading,isSuccess:isETHInterestSuccess,isRefetching:isRefetching3} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserInterest",
    args:[userAddress??"",WETHInfo?.address,unixBankInfo?.address],
    query:{
      refetchInterval:3000
    }
  })

  const {data:userUSDCRewards,isLoading:isUSDCRewardLoading,isSuccess:isUSDCRewardSuccess,isRefetching:isRefetching4} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserRewards",
    args:[userAddress,usdcInfo?.address,rewardControllerInfo?.address,poolInfo?.address,unixBankInfo?.address],
    query:{
      refetchInterval:3000
    }
  })

  const {data:userWBTCRewards,isLoading:isWBTCRewardLoading,isSuccess:isWBTCRewardSuccess,isRefetching:isRefetching5} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserRewards",
    args:[userAddress,wbtcInfo?.address,rewardControllerInfo?.address,poolInfo?.address,unixBankInfo?.address],
    query:{
      refetchInterval:3000
    }
  })

  const {data:userETHRewards,isLoading:isETHRewardLoading,isSuccess:isETHRewardSuccess,isRefetching:isRefetching6} = useSimulateContract({
    abi:uniXHelperInfo?.abi,
    address:uniXHelperInfo?.address,
    functionName:"getUserRewards",
    args:[userAddress,aaveWETHInfo?.address,rewardControllerInfo?.address,poolInfo?.address,unixBankInfo?.address],
    query:{
      refetchInterval:3000
    }
  })

  useEffect(()=>{
    if(isUSDCInterestSuccess&&isWBTCInterestSuccess&&isETHInterestSuccess&&isUSDCRewardSuccess&&isWBTCRewardSuccess&&isETHRewardSuccess){
      const data = new Array<ListItem>()
      data.push({token:usdcInfo?.address??"",itemType:"Interest",available:userUSDCInterest?.result})
      data.push({token:wbtcInfo?.address??"",itemType:"Interest",available:userWBTCInterest?.result});
      data.push({token:WETHInfo?.address??"",itemType:"Interest",available:userWETHInterest?.result});
      (userUSDCRewards.result[0] as string[]).map((tokenAddress,i)=>{
        data.push({token:tokenAddress,itemType:"Reward",available:userUSDCRewards.result[1][i]})
      });

      (userWBTCRewards.result[0] as string[]).map((tokenAddress, i) => {
        let isExist = false
        data.forEach((item) => {
          if (item.token.toLowerCase() === tokenAddress.toLowerCase() && item.itemType === "Reward") {
            isExist = true
            return
          }
        })
        if (!isExist) {
          data.push({ token: tokenAddress, itemType: "Reward", available: userWBTCRewards.result[1][i] })
        }
      });

      (userETHRewards.result[0] as string[]).map((tokenAddress, i) => {
        let isExist = false
        data.forEach((item) => {
          if (item.token.toLowerCase() === tokenAddress.toLowerCase() && item.itemType === "Reward") {
            isExist = true
            return
          }
        })
        if (!isExist) {
          data.push({ token: tokenAddress, itemType: "Reward", available: userETHRewards.result[1][i] })
        }
      });
      setList([...data])
    }
    
  },[isUSDCInterestLoading,isWBTCInterestLoading,isETHInterestLoading,isUSDCRewardLoading,isWBTCRewardLoading,isETHRewardLoading,isRefetching1,isRefetching2,isRefetching3,isRefetching4,isRefetching5,isRefetching6])

  // useEffect(()=>{
  //   const intervalId = setInterval(()=>{
  //     setRefresh(refresh+1)
  //     console.log("=========",refresh)
  //   }, 3000)
  //   return () => clearInterval(intervalId)
  // },[])


  const handleClaim = useCallback(async (token: string, type: "Interest" | "Reward") => {
    if (type === "Interest") {
      await writeTxn(() => writeContractAsync({
        abi: unixBankInfo?.abi ?? [],
        address: unixBankInfo?.address ?? "",
        functionName: "claimInterest",
        args: [userAddress ?? "", token]
      }))
      // await writeContractAsync({
      //   abi:unixBankInfo?.abi??[],
      //   address:unixBankInfo?.address??"",
      //   functionName:"claimInterest",
      //   args:[userAddress??"",token]
      // })
    }else{
      await writeTxn(()=>writeContractAsync({
        abi:unixBankInfo?.abi??[],
        address:unixBankInfo?.address??"",
        functionName:"claimReward",
        args:[userAddress??"",token]
      }))

      // await writeContractAsync({
      //   abi:unixBankInfo?.abi??[],
      //   address:unixBankInfo?.address??"",
      //   functionName:"claimReward",
      //   args:[userAddress??"",token]
      // })
      
    }
  }, [unixBankInfo])


  return (
    <div className="flex flex-col items-center h-auto">
      <div className="flex w-screen h-auto pt-4 pl-12 pr-12">
        <span className="w-40">Symbol</span>
        <span className="flex-1">TokenAddress</span>
        <span className="flex-1">Balance</span>
        <span className="flex-1">Available</span>
        <span>Option</span>
      </div>
      {list.map((data,i)=>{
      return <ItemView data={data} key={i} handleClaim={()=>handleClaim(data.token,data.itemType)} abi={WETHInfo?.abi} user={userAddress??""}/>
      })}
    </div>


  );
};

const ItemView = ({ data, handleClaim, abi, user }: { data: ListItem, handleClaim: () => void, abi: any, user: string }) => {
  const [balance, setBalance] = useState("")
  const [available, setAvailable] = useState("")
  const { data: symbol } = useReadContract({
    abi,
    functionName: "symbol",
    address: data.token,
    args: []
  })
  const { data: balanceOf, isLoading: isBalanceLoading, isSuccess: isBalanceSuccess } = useReadContract({
    abi,
    functionName: "balanceOf",
    address: data.token,
    args: [user]
  })

  const { data: decimals, isLoading: isDecimalsLoading, isSuccess: isDecimalsSuccess } = useReadContract({
    abi,
    functionName: "decimals",
    address: data.token,
    args: []
  })

  useEffect(() => {
    if (isBalanceSuccess && isDecimalsSuccess) {
      const b = balanceOf as bigint
      const d = decimals as number
      const bal = BigNumber(b.toString()).div(BigNumber(10 ** d))
      setBalance(formatValue(bal.toString(), 18))
      const ava = BigNumber(data.available.toString()).div(BigNumber(10 ** d))
      setAvailable(formatValue(ava.toString(), 18))
    }
  },[isBalanceLoading,isDecimalsLoading,data])

  return <div className="flex w-screen h-auto pt-4 pl-12 pr-8">
    <span className="w-40">{symbol as string}</span>
    <span className="flex-1">{data.token.slice(0, 4) + "..." + data.token.slice(data.token.length - 4, data.token.length)}</span>
    <span className="flex-1">{balance}</span>
    <span className="flex-1">{available}</span>
    <button className="btn" onClick={() => {
      try {
        handleClaim()
      } catch (error) {
        console.error("handleClaim error:", error)
      }
    }}>claim</button>
  </div>
}

export default Rewards;
