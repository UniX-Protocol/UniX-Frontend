import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
// import { Contract } from "ethers";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log(`========================deployer: ${deployer} ==========================`);

  const contractAddress = {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    RewardController: "0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb",
    AaveV3Pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    AaveEthGateway: "0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9",
  };

  await deploy("WETH9", {
    from: deployer,
    args: [],
    log: true,
  });

  const WETH = await (await hre.ethers.getContract("WETH9", deployer)).getAddress();

  await deploy("UniXBank", {
    from: deployer,
    args: [
      contractAddress.AaveV3Pool,
      WETH,
      contractAddress.AaveEthGateway,
      contractAddress.RewardController,
      [WETH, "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", "0x29f2D40B0605204364af54EC677bD022dA425d03"],
    ],
    log: true,
  });

  const UnixBank = await (await hre.ethers.getContract("UniXBank", deployer)).getAddress();

  const feeToSetter = deployer;
  await deploy("UniswapV2Factory", {
    from: deployer,
    args: [feeToSetter, UnixBank],
    log: true,
  });

  const UniswapV2Factory = await (await hre.ethers.getContract("UniswapV2Factory", deployer)).getAddress();

  await deploy("UniswapV2Router02", {
    from: deployer,
    args: [UniswapV2Factory, WETH],
    log: true,
  });
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["YourContract"];
