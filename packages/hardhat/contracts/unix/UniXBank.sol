pragma solidity ^0.8.24;

import '@uniswap/lib/contracts/libraries/TransferHelper.sol';
import './interface/IUniswapV2Pair.sol';
import './interface/IAaveV3Pool.sol';
import './interface/IERC20.sol';
import './library/DataTypes.sol';
import './interface/IWrappedTokenGatewayV3.sol';
import './interface/IWETH.sol';
import './interface/IAaveV3RewardController.sol';
import './library/WadRayMath.sol';

contract UniXBank {
	using WadRayMath for uint;
	bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transfer(address,uint256)')));

	address public immutable aaveV3Pool;
	address public immutable wETH;
	address public immutable ethGateway;
	address public immutable aaveRewardController;

	struct PairBalance {
		uint balance0;
		uint balance1;
	}

	struct UserInfo {
		uint lastTimestamp;
		uint amount;
		uint share;
		uint accInterest;
		mapping(address => uint) accRewards; // rewardToken => accReward
	}

	struct PoolInfo {
		address aToken;
		uint lastTimestamp;
		uint amount;
		uint share;
		uint accInterest;
		mapping(address => uint) accRewards; // rewardToken => accReward
		mapping(address => UserInfo) userInfo; // user => UserInfo
	}



	mapping(address => PairBalance) private pairReserve;
	mapping (address => uint) reserves;  // token => reserve
	mapping(address => bool) public supportEarnTokens;
	mapping(address => PoolInfo) pools;

	constructor(address _aaveV3Pool,address _wETh, address _ethGateway,address _aaveRewardController,address[] memory _supportEarnTokens) {
		aaveV3Pool = _aaveV3Pool;
		wETH = _wETh;
		ethGateway = _ethGateway;
		aaveRewardController = _aaveRewardController;
		for(uint i = 0; i < _supportEarnTokens.length; i++){
			supportEarnTokens[_supportEarnTokens[i]] = true;
			if(_supportEarnTokens[i] == wETH){
				pools[_supportEarnTokens[i]].aToken = IAaveV3Pool(aaveV3Pool).getReserveData(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2).aTokenAddress;
			}else{
				pools[_supportEarnTokens[i]].aToken = IAaveV3Pool(aaveV3Pool).getReserveData(_supportEarnTokens[i]).aTokenAddress;
			}
			
		}
	}

	receive() external payable {

	}

	function getPairBanlance(address pair) external view returns(uint balance0,uint balance1) {
		PairBalance memory pb = pairReserve[pair];
		balance0 = pb.balance0;
		balance1 = pb.balance1;
	}


	function onMint(address user,address pair,uint amount0, uint amount1) external returns(uint balance0,uint balance1) {
		require(msg.sender == pair,"invalid caller");
		PairBalance storage pb = pairReserve[pair];
		pb.balance0 = pb.balance0 + amount0;
		pb.balance1 = pb.balance1 + amount1;
		balance0 = pb.balance0;
		balance1 = pb.balance1;
		address token0 = IUniswapV2Pair(pair).token0();
		address token1 = IUniswapV2Pair(pair).token1();
		_aaveV3Supply(token0, amount0);
		_aaveV3Supply(token1, amount1);
		_updateShare(user, token0, amount0);
		_updateShare(user, token1, amount1);
	}

	function onBurn(address user,address pair, uint amount0, uint amount1) external {
		PairBalance storage pb = pairReserve[pair];
		IUniswapV2Pair iPair = IUniswapV2Pair(pair);
		address token0 = iPair.token0();
		address token1 = iPair.token1();
		_onBurn(user, pair, token0, amount0, pb.balance0);	
		_onBurn(user, pair, token1, amount1, pb.balance1);	
	}

	function _onBurn(address user,address pair, address token,uint amount, uint reserve) internal {
		if(supportEarnTokens[token]){
			_claimReward(user, token);
			_claimedInterest(token, user);
			PoolInfo storage poolInfo = pools[token];
			uint removedShare = amount * poolInfo.userInfo[user].share / reserve;
			poolInfo.share -= removedShare;
			poolInfo.userInfo[user].share -= removedShare;
			_safeTransferTo(pair, token, user, amount);
			address[] memory assets = new address[](1);
			assets[0] = poolInfo.aToken;
			IAaveV3RewardController arc = IAaveV3RewardController(aaveRewardController);
			(address[] memory rewardsList,) = arc.getAllUserRewards(assets, address(this));
			for(uint i = 0; i < rewardsList.length; i++){
				uint changedAccUserReward = poolInfo.userInfo[user].accRewards[rewardsList[i]] * amount / reserve;
				poolInfo.userInfo[user].accRewards[rewardsList[i]] -= changedAccUserReward;
				poolInfo.accRewards[rewardsList[i]] -= changedAccUserReward;
			}
				

			uint changedAccUserInterest = poolInfo.userInfo[user].accInterest * amount / reserve;
			poolInfo.userInfo[user].accInterest -= changedAccUserInterest;
			poolInfo.accInterest -= changedAccUserInterest;

		}
	}

	function onTransfer(address pair, address from, address to,uint amount) external {
		PairBalance storage pb = pairReserve[pair];
		IUniswapV2Pair iPair = IUniswapV2Pair(pair);
		address token0 = iPair.token0();
		address token1 = iPair.token1();	
		uint amount0 = amount * pb.balance0 / iPair.totalSupply();
		uint amount1 = amount * pb.balance1 / iPair.totalSupply();
		_onTransfer(token0, from, to, amount0, pb.balance0);
		_onTransfer(token1, from, to, amount1, pb.balance1);

	}

	function _onTransfer(address token,address from, address to, uint amount, uint reserve) internal {
		if(supportEarnTokens[token]){
			_claimReward(from, token);
			// _claimReward(to, token);
			_claimedInterest(token,from);
			PoolInfo storage poolInfo = pools[token];
			uint changeShare = amount * poolInfo.userInfo[from].share / reserve;
			uint changeAmount = amount * poolInfo.userInfo[from].amount / reserve;
			poolInfo.userInfo[from].share -= changeShare;
			poolInfo.userInfo[from].amount -= changeAmount;

			poolInfo.userInfo[to].share += changeShare;
			poolInfo.userInfo[to].amount += changeAmount;

			address[] memory assets = new address[](1);
			assets[0] = poolInfo.aToken;
			IAaveV3RewardController arc = IAaveV3RewardController(aaveRewardController);
			(address[] memory rewardsList,) = arc.getAllUserRewards(assets, address(this));
			for(uint i = 0; i < rewardsList.length; i++){
				uint changedAccUserReward = poolInfo.userInfo[from].accRewards[rewardsList[i]] * amount / reserve;
				poolInfo.userInfo[from].accRewards[rewardsList[i]] -= changedAccUserReward;
				poolInfo.userInfo[to].accRewards[rewardsList[i]] += changedAccUserReward;
			}

			uint changedAccUserInterest = poolInfo.userInfo[from].accInterest * amount / reserve;
			poolInfo.userInfo[from].accInterest -= changedAccUserInterest;
			poolInfo.userInfo[to].accInterest += changedAccUserInterest;

		}
	}


	function safeTransferTo(address pair,address token, address to, uint value) external {
		require(msg.sender == pair,"invalid caller");
		_safeTransferTo(pair, token, to, value);
	}

	function _safeTransferTo(address pair,address token, address to, uint value) internal{
		uint balance = IERC20(token).balanceOf(address(this));
		if(value > balance){
			_aaveV3Withdraw(token, value - balance,false);
		}
		(bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2: TRANSFER_FAILED');
		PairBalance storage pb = pairReserve[pair];
		if(IUniswapV2Pair(pair).token0() == token){
			pb.balance0 = pb.balance0 - value;
		}else{
			pb.balance1 = pb.balance1 - value;
		}
	}

	function safeTransferFrom(address pair,address token, address from,uint value) external {
		TransferHelper.safeTransferFrom(
            token, from, address(this), value
        );
		_aaveV3Supply(token, value);
		PairBalance storage pb = pairReserve[pair];
		if(IUniswapV2Pair(pair).token0() == token){
			pb.balance0 = pb.balance0 + value;
		}else{
			pb.balance1 = pb.balance1 + value;
		}
	}

	function claimReward(address user,address token) external {
		_claimReward(user, token);
	}

	function _claimReward(address user,address token) internal {
		if(supportEarnTokens[token]){
			_updateShare(user, token, 0);
			PoolInfo storage poolInfo = pools[token];
			address[] memory assets = new address[](1);
			assets[0] = poolInfo.aToken;
			IAaveV3RewardController arc = IAaveV3RewardController(aaveRewardController);
			(address[] memory rewardsList, uint256[] memory unclaimedAmounts) = arc.getAllUserRewards(assets, address(this));
			for(uint i = 0; i < rewardsList.length; i++){
				uint rewardAmount = (poolInfo.accRewards[rewardsList[i]] + unclaimedAmounts[i]) * poolInfo.userInfo[user].share / poolInfo.share - poolInfo.userInfo[user].accRewards[rewardsList[i]];
				arc.claimRewards(assets, rewardAmount, user, rewardsList[i]);
				poolInfo.accRewards[rewardsList[i]] += rewardAmount;
				poolInfo.userInfo[user].accRewards[rewardsList[i]] += rewardAmount;
			}
		}
	}

	function _updateShare(address user,address token, uint amount) internal {
		if(supportEarnTokens[token]){
			PoolInfo storage poolInfo = pools[token];
			uint timestamp = block.timestamp;
			if(poolInfo.lastTimestamp == 0){
				poolInfo.amount = amount;
				poolInfo.lastTimestamp = timestamp;
				poolInfo.userInfo[user].amount = amount;
				poolInfo.userInfo[user].lastTimestamp = timestamp;
			}else{
				uint diffTime = timestamp - poolInfo.lastTimestamp;
				poolInfo.share += poolInfo.amount * diffTime;
				if(poolInfo.userInfo[user].lastTimestamp > 0){
					uint userDiffTime = timestamp - poolInfo.userInfo[user].lastTimestamp;
					poolInfo.userInfo[user].share += poolInfo.userInfo[user].amount * userDiffTime;
				}
				poolInfo.amount += amount;
				poolInfo.userInfo[user].amount += amount;
				poolInfo.userInfo[user].lastTimestamp = timestamp;
				poolInfo.lastTimestamp = timestamp;

			}
		}
	}

	function _aaveV3Supply(address token,uint amount) internal {
		if(supportEarnTokens[token]){
			if(token == wETH) {
				IWETH(wETH).withdraw(amount);
				IWrappedTokenGatewayV3(ethGateway).depositETH{value:amount}(aaveV3Pool, address(this), 0);
			}else {
				IERC20(token).approve(aaveV3Pool, amount);
				IAaveV3Pool(aaveV3Pool).supply(token, amount, address(this), 0);
			}
			reserves[token] += amount;
		}
	}


	function _aaveV3Withdraw(address token, uint amount,bool isClaimInterest) internal {
		if(supportEarnTokens[token]){
			if(token == wETH) {
				IWrappedTokenGatewayV3 tokenGateway = IWrappedTokenGatewayV3(ethGateway);
				address aaveWETH = tokenGateway.getWETHAddress();
				address aWETH = IAaveV3Pool(aaveV3Pool).getReserveData(aaveWETH).aTokenAddress;
				IERC20(aWETH).approve(ethGateway, amount);
				tokenGateway.withdrawETH(aaveV3Pool, amount, address(this));
				IWETH(wETH).deposit{value:amount}();
			}else {
				IERC20(token).approve(aaveV3Pool, amount);
				address aToken = IAaveV3Pool(aaveV3Pool).getReserveData(token).aTokenAddress;
				IERC20(aToken).approve(aaveV3Pool, amount);
				IAaveV3Pool(aaveV3Pool).withdraw(token, amount, address(this));
			}
			if(!isClaimInterest){
				reserves[token] -= amount;
			}
		}
	}

	function _getPrincipalAndInterest(address token) internal view returns(uint principalAndInterest){
		principalAndInterest = IERC20(pools[token].aToken).balanceOf(address(this));
	}

	function _getInterest(address token) internal view returns(uint interest){
		uint principalAndInterest = _getPrincipalAndInterest(token);
		interest = principalAndInterest - reserves[token];
	}

	function getInterest(address token) external view  returns(uint interest){
		interest = _getInterest(token);
	}


	function _claimedInterest(address token,address user) internal {
		uint interest = _getInterest(token);
		_updateShare(user, token, 0);
		PoolInfo storage poolInfo = pools[token];
		uint totalInterest = poolInfo.accInterest + interest;
		uint claimedInterest = poolInfo.userInfo[user].share * totalInterest / poolInfo.share - poolInfo.userInfo[user].accInterest;
		if(claimedInterest > 0){
			_aaveV3Withdraw(token, claimedInterest,true);
			TransferHelper.safeTransfer(token, user, claimedInterest);
			poolInfo.userInfo[user].accInterest += claimedInterest;
			poolInfo.accInterest += claimedInterest;
		}
	}

	function claimInterest(address user,address token ) external {
		_claimedInterest(token,user);
	}

}