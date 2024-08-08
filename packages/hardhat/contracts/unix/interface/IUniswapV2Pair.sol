pragma solidity ^0.8.24;
interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function balanceOf(address account) external view returns (uint);
    function totalSupply() external view  returns (uint);
}