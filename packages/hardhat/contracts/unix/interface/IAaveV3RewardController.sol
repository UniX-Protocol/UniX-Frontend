pragma solidity ^0.8.24;
interface IAaveV3RewardController {
	function getRewardsByAsset(address asset) external view returns (address[] memory);
	function getAllUserRewards(address[] calldata assets,address user) external view returns (address[] memory rewardsList, uint256[] memory unclaimedAmounts);
	// function claimAllRewardsToSelf(address[] calldata assets) external returns (address[] memory rewardsList, uint256[] memory claimedAmounts);
	function claimRewards(address[] calldata assets,uint256 amount,address to,address reward) external returns (uint256);
}