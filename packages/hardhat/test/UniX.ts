import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { ethers } from "ethers"
import {ethers as hethers} from "hardhat"

const contractAddress = {
	USDC:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	WBTC:"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
	RewardController:"0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb",
	AaveV3Pool:"0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
	AaveEthGateway:"0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9",
	AaveWETH:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
}

describe("Unix test",()=>{

	async function deployContractFixture() {
		const [owner] = await hethers.getSigners()
		console.log("========owner========",await owner.getAddress())

		const WETH9 = await hethers.getContractFactory("WETH9")
		const weth = await WETH9.deploy()
		const wethaddr = await weth.getAddress()
		console.log("=====wethaddr======:",wethaddr)
		const ethBalance = await hethers.provider.getBalance(owner.address)

		const UniXBank = await hethers.getContractFactory("UniXBank")
		// const aaveV3Pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
		// const aaveEthGateway = "0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9"
		// const aaveRewardController = "0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb"

		const unixBank = await UniXBank.deploy(contractAddress.AaveV3Pool,weth.getAddress(),contractAddress.AaveEthGateway,contractAddress.RewardController,[weth.getAddress(),contractAddress.USDC,contractAddress.WBTC])
		await unixBank.waitForDeployment()

		const UniswapV2Factory = await hethers.getContractFactory("UniswapV2Factory")
		const feeToSetter = owner.address
		const uniswapFactory = await UniswapV2Factory.deploy(feeToSetter,unixBank.getAddress())

		const UniswapV2Router02 = await hethers.getContractFactory("UniswapV2Router02")
		const uniswapV2Router = await UniswapV2Router02.deploy(uniswapFactory.getAddress(),weth.getAddress())

		const unixHelperFactory = await hethers.getContractFactory("UniXHelper")
		const uniXHelper = await unixHelperFactory.deploy()


		const usdcWhale = await hethers.getImpersonatedSigner("0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503")
		const wbtcWhale = await hethers.getImpersonatedSigner("0x6daB3bCbFb336b29d06B9C793AEF7eaA57888922") 
		const ub = await hethers.provider.getBalance("0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503")
		const wb = await hethers.provider.getBalance("0x6daB3bCbFb336b29d06B9C793AEF7eaA57888922")
		
		const usdc = await hethers.getContractAt("AllocateErc20",contractAddress.USDC,usdcWhale)

		const wbtc = await hethers.getContractAt("AllocateErc20",contractAddress.WBTC,wbtcWhale)

		const a = await usdc.transfer(owner.address,numberString("100000e6"))
		await a.wait()
		const b = await wbtc.transfer(owner.address,numberString("100e8"))
		await b.wait()

		return {
			owner,
			unixBank,
			uniswapFactory,
			weth,
			uniswapV2Router,
			aaveV3Pool: contractAddress.AaveV3Pool,
			uniXHelper
		}
	}

	async function addLiquidityFixture() {
		const {uniswapV2Router,owner,unixBank,uniswapFactory,uniXHelper} = await loadFixture(deployContractFixture)	
		let tokenA = contractAddress.USDC
		let tokenB = contractAddress.WBTC
		let amountAIgnoreDecimals = "7000"
		let amountBIgnoreDecimals = "1"
		let tempToken, tempAmount
		if(tokenA.toLowerCase()>tokenB.toLowerCase()) {
			tempToken = tokenA
			tokenA = tokenB
			tokenB = tempToken
			tempAmount = amountAIgnoreDecimals
			amountAIgnoreDecimals = amountBIgnoreDecimals
			amountBIgnoreDecimals = tempAmount
		}
		const tokenAContract = await hethers.getContractAt("AllocateErc20",tokenA)
		const tokenBContract = await hethers.getContractAt("AllocateErc20",tokenB)

		const decimalsA = (await tokenAContract.decimals()).toString()
		const decimalsB = (await tokenBContract.decimals()).toString()

		const amountADesired = numberString(`${amountAIgnoreDecimals}e${decimalsA}`)
		const amountBDesired = numberString(`${amountBIgnoreDecimals}e${decimalsB}`)
		const amountAMin = amountADesired
		const amountBMin = amountBDesired
		await tokenAContract.approve(uniswapV2Router.getAddress(),amountADesired)
		await tokenBContract.approve(uniswapV2Router.getAddress(),amountBDesired)
		const to = owner

		const tx = await uniswapV2Router.addLiquidity(tokenA,tokenB,amountADesired,amountBDesired,amountAMin,amountBMin,to,deadline())
		await tx.wait()

		return {
			uniswapV2Router,
			owner,
			unixBank,
			uniswapFactory,
			uniXHelper
		}

	}

	async function addLiquidityETHFixture() {
		const {owner,uniswapV2Router,unixBank,weth,uniXHelper,uniswapFactory} = await deployContractFixture()
		const token = await hethers.getContractAt("AllocateErc20",contractAddress.USDC)
		const decimals = (await token.decimals()).toString()
		const amountTokenDesired = numberString(`40000e${decimals}`)
		const amountTokenMin = 0
		const amountETHMin = 0
		const to = owner
		await token.approve(uniswapV2Router.getAddress(),amountTokenDesired)
		const tx = await uniswapV2Router.addLiquidityETH(token.getAddress(),amountTokenDesired,amountTokenMin,amountETHMin,to,deadline(),{value:numberString("10e18")})
		await tx.wait()
		return {
			owner,
			uniswapV2Router,
			unixBank,
			token,
			decimals,
			weth,
			uniXHelper,
			uniswapFactory
		}
	}

	describe("addLiquidity",()=>{
		it("add liquidity and supply to aave v3", async ()=>{
			await loadFixture(addLiquidityFixture)
			
		})
		it("swapExactTokensForTokens", async ()=>{
			const {uniswapV2Router,owner,unixBank} = await loadFixture(addLiquidityFixture)
			const amountIn = numberString("100e6")
			const amountOutMin = 0
			const path = [contractAddress.USDC,contractAddress.WBTC]
			const to = owner.address
			const usdc = await hethers.getContractAt("AllocateErc20",contractAddress.USDC)
			await usdc.approve(unixBank.getAddress(),amountIn)
			const tx = await uniswapV2Router.swapExactTokensForTokens(amountIn,amountOutMin,path,to,deadline())
			await tx.wait()
		})
	})

	describe("addLiquidityETH",()=>{
		it("add liquidity eth",async ()=>{
			await loadFixture(addLiquidityETHFixture)
		})

		it("swapExactTokensForETH",async ()=> {
			const {uniswapV2Router,unixBank,token,decimals,owner,weth} = await loadFixture(addLiquidityETHFixture)
			const amountIn = numberString(`100e${decimals}`)
			await token.approve(unixBank.getAddress(),amountIn)
			const amountOutMin = 0
			const path = [contractAddress.USDC,weth.getAddress()]
			const to = owner.address
			const tx = await uniswapV2Router.swapExactTokensForETH(amountIn,amountOutMin,path,to,deadline())
			await tx.wait()
		})

		it("swapExactTokensForETHSupportingFeeOnTransferTokens",async ()=>{
			const {uniswapV2Router,unixBank,token,decimals,owner,weth} = await loadFixture(addLiquidityETHFixture)
			const amountIn = numberString(`100e${decimals}`)
			// await token.approve(uniswapV2Router.getAddress(),amountIn)
			await token.approve(unixBank.getAddress(),amountIn)
			const amountOutMin = 0
			const path = [contractAddress.USDC,weth.getAddress()]
			const to = owner.address
			const tx = await uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn,amountOutMin,path,to,deadline())
			await tx.wait()
		})

		it("swapExactETHForTokens",async ()=>{
			const {uniswapV2Router,unixBank,token,decimals,owner,weth} = await loadFixture(addLiquidityETHFixture)
			const amountOutMin = 0
			const path = [weth.getAddress(),contractAddress.USDC]
			const to  = owner.address
			const tx = await uniswapV2Router.swapExactETHForTokens(amountOutMin,path,to,deadline(),{value:numberString("1e18")})
			await tx.wait()
		})

		it("swapExactETHForTokensSupportingFeeOnTransferTokens",async ()=>{
			const {uniswapV2Router,unixBank,token,decimals,owner,weth} = await loadFixture(addLiquidityETHFixture)
			const amountOutMin = 0
			const path = [weth.getAddress(),contractAddress.USDC]
			const to  = owner.address
			const tx = await uniswapV2Router.swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin,path,to,deadline(),{value:numberString("1e18")})
			await tx.wait()
		})
	})

	describe("removeLiquidityETH",()=>{
		it("remove liquidity and withdraw from aave v3",async ()=>{
			console.log("=======================:")
			const {uniswapV2Router,owner,uniswapFactory,weth} = await loadFixture(addLiquidityETHFixture)
			const pairAddr = await uniswapFactory.getPair(contractAddress.USDC,weth.getAddress())
			const pair = await hethers.getContractAt("AllocateErc20",pairAddr)
			const liquidity= await pair.balanceOf(owner)
			await pair.approve(uniswapV2Router.getAddress(),liquidity)
			const amountAMin = 0
			const amountBMin = 0
			const to = owner.address
			console.log("liquidity:",liquidity)
			// const increaseTo = Math.floor((Date.now()+ 86400 * 1) / 1000) 
			// await time.increaseTo(increaseTo)
	
			const tx = await uniswapV2Router.removeLiquidityETH(contractAddress.USDC,liquidity,amountAMin,amountBMin,to,deadline())
			await tx.wait()
		})
	})

	// describe("removeLiquidity",()=>{
	// 	it("remove liquidity and withdraw from aave v3",async ()=>{
	// 		const {uniswapV2Router,owner,uniswapFactory} = await loadFixture(addLiquidityFixture)
	// 		const pairAddr = await uniswapFactory.getPair(contractAddress.USDC,contractAddress.WBTC)
	// 		const pair = await hethers.getContractAt("AllocateErc20",pairAddr)
	// 		const liquidity= await pair.balanceOf(owner)
	// 		await pair.approve(uniswapV2Router.getAddress(),liquidity)
	// 		const amountAMin = 0
	// 		const amountBMin = 0
	// 		const to = owner.address
	// 		console.log("liquidity:",liquidity)
	// 		const increaseTo = Math.floor((Date.now()+ 86400 * 1000) / 1000) 
	// 		await time.increaseTo(increaseTo)
	// 		const deadline = Math.floor(increaseTo + 60).toString()
	// 		const tx = await uniswapV2Router.removeLiquidity(contractAddress.USDC,contractAddress.WBTC,liquidity,amountAMin,amountBMin,to,deadline)
	// 		await tx.wait()
	// 	})
	// })

	// describe("reward test",()=>{
	// 	it("claimReward",async ()=>{
	// 		const {uniswapV2Router,owner,uniswapFactory,unixBank} = await loadFixture(addLiquidityFixture)
	// 		await time.increase(86400)
	// 		await unixBank.claimReward(owner,contractAddress.USDC)
	// 		await unixBank.claimInterest(owner,contractAddress.USDC)

	// 		await unixBank.claimReward(owner,contractAddress.WBTC)
	// 		await unixBank.claimInterest(owner,contractAddress.WBTC)
	// 	})

	// 	it("getUserAvailableInterest",async ()=>{
	// 		const {uniswapV2Router,owner,uniswapFactory,unixBank,uniXHelper} = await loadFixture(addLiquidityFixture)
	// 		await time.increase(86400)
	// 		const interest = await uniXHelper.getUserInterest.staticCall(owner,contractAddress.USDC,unixBank)

	// 		console.log("interest",interest)
			
	// 	})


	// 	it("getUserAvailableRewards",async ()=>{
	// 		const {uniswapV2Router,owner,uniswapFactory,unixBank,uniXHelper} = await loadFixture(addLiquidityFixture)
	// 		await time.increase(86400)
	// 		const res = await uniXHelper.getUserRewards.staticCall(owner,contractAddress.WBTC,contractAddress.RewardController,contractAddress.AaveV3Pool,unixBank)

	// 		console.log("res",res)
			
	// 	})
	// })

})

function deadline() {
	return Math.floor(Date.now()/1000 + 5 * 60).toString()
}

function numberString(numStr: string): string {
    if (!/e/i.test(numStr)) {
        return numStr;
    }
    let [base, exponent] = numStr.split(/e/i);
    let exp = parseInt(exponent, 10);

    if (base.indexOf('.') !== -1) {
        let [integerPart, decimalPart] = base.split('.');
        if (exp > 0) {
            if (decimalPart.length > exp) {
                integerPart += decimalPart.substring(0, exp);
                decimalPart = decimalPart.substring(exp);
                return integerPart + '.' + decimalPart;
            } else {
                return integerPart + decimalPart + '0'.repeat(exp - decimalPart.length);
            }
        } else {
            let leadingZeros = '0'.repeat(Math.abs(exp) - 1);
            return '0.' + leadingZeros + integerPart + decimalPart;
        }
    } else {
        if (exp > 0) {
            return base + '0'.repeat(exp);
        } else {
            let leadingZeros = '0'.repeat(Math.abs(exp) - 1);
            return '0.' + leadingZeros + base;
        }
    }
}