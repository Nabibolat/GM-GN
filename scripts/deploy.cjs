const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Deploying GMGN to ${hre.network.name} (chainId ${network.chainId})`);

  const GMGN = await hre.ethers.getContractFactory("GMGN");
  const contract = await GMGN.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("GMGN deployed to:", address);
  console.log("Explorer:", hre.network.name === "base"
    ? `https://basescan.org/address/${address}`
    : `https://liteforge.explorer.caldera.xyz/address/${address}`);
  console.log("\nAdd this address to frontend/.env using the matching VITE_GMGN_*_ADDRESS variable.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
