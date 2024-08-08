pragma solidity ^0.8.24;
import './interface/IERC20.sol';
import './interface/IAaveV3RewardController.sol';
import './interface/IAaveV3Pool.sol';

interface IUniXBank{
	function claimInterest(address user,address token ) external;
	function claimReward(address user,address token) external;
}
contract UniXHelper {
	constructor(){}

	function getUserInterest(address user,address token, IUniXBank unixBank) external returns(uint interest){
		uint balanceBefore = IERC20(token).balanceOf(user);
		unixBank.claimInterest(user, token);
		uint balanceAfter = IERC20(token).balanceOf(user);
		interest = balanceAfter - balanceBefore;
	}

	function getUserRewards(address user,address token,IAaveV3RewardController rewardController, IAaveV3Pool pool,IUniXBank unixBank)external returns(address[] memory rewardsList,uint[] memory rewards) {
		address[] memory assets = new address[](1);
		assets[0] = pool.getReserveData(token).aTokenAddress;
		(rewardsList,) = rewardController.getAllUserRewards(assets, user);
		rewards = new uint[](rewardsList.length); 
		for(uint i = 0; i < rewardsList.length; i++){
			rewards[i] = IERC20(rewardsList[i]).balanceOf(user);
		}
		unixBank.claimReward(user, token);
		for(uint i = 0; i < rewardsList.length; i++){
			rewards[i] = IERC20(rewardsList[i]).balanceOf(user) - rewards[i];
		}
	}

}