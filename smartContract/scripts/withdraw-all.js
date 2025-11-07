const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const TREASURY_ADDRESS = "0x0Ff48CAed29E63B89D72283329DE81E91932E357";   // 

  const treasury = await hre.ethers.getContractAt("Treasury", TREASURY_ADDRESS);
  const usdc = await hre.ethers.getContractAt("IERC20", "0x3600000000000000000000000000000000000000");

  const balance = await treasury.userBalances(owner.address);
  console.log("Treasury balance:", hre.ethers.formatUnits(balance, 6), "USDC");

  if (balance === 0n) {
    console.log("Nothing to withdraw.");
    return;
  }

  console.log("Withdrawing everything...");
  const tx = await treasury.withdraw(balance);   // or: treasury.withdraw(balance)
  await tx.wait();

  const after = await usdc.balanceOf(owner.address);
  console.log("USDC in wallet now:", hre.ethers.formatUnits(after, 6), "USDC");
  console.log("DONE! All funds returned.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});