const hre = require("hardhat");

const ADDRESSES = {
  treasury: "0x0Ff48CAed29E63B89D72283329DE81E91932E357",
  platformTreasury: "0x586224ccDAFeFd8901626e812D7662D4Ec2c43b1",
  streamFactory: "0x2c72355ba178bf8a7Cd3557623b391104F4fBa5F",
  usdc: "0x3600000000000000000000000000000000000000"
};

async function main() {
  console.log("🔍 DEBUGGING STREAM CREATION ISSUE\n");
  
  const [deployer] = await hre.ethers.getSigners();
   const employee = new hre.ethers.Wallet(process.env.EMPLOYEE1_PK, hre.ethers.provider);
  
  console.log("Accounts:");
  console.log("  Deployer:", deployer.address);
  console.log("  Employee:", employee.address);
  
  // Connect to contracts
  const streamFactory = await hre.ethers.getContractAt("StreamFactory", ADDRESSES.streamFactory);
  const treasury = await hre.ethers.getContractAt("Treasury", ADDRESSES.treasury);
  const platformTreasury = await hre.ethers.getContractAt("PlatformTreasury", ADDRESSES.platformTreasury);
  const usdc = await hre.ethers.getContractAt("IERC20", ADDRESSES.usdc);
  
  console.log("\n=== STEP 1: Check Permissions ===");
  
  // Check if StreamFactory has STREAM_MANAGER_ROLE on Treasury
  const STREAM_MANAGER_ROLE = await treasury.STREAM_MANAGER_ROLE();
  const hasManagerRole = await treasury.hasRole(STREAM_MANAGER_ROLE, ADDRESSES.streamFactory);
  console.log("StreamFactory has STREAM_MANAGER_ROLE:", hasManagerRole);
  
  if (!hasManagerRole) {
    console.log("❌ PROBLEM: StreamFactory missing STREAM_MANAGER_ROLE!");
    console.log("FIX: Run this command:");
    console.log(`  treasury.grantStreamManagerRole("${ADDRESSES.streamFactory}")`);
    process.exit(1);
  }
  
  // Check if StreamFactory has FEE_COLLECTOR_ROLE on PlatformTreasury
  const FEE_COLLECTOR_ROLE = await platformTreasury.FEE_COLLECTOR_ROLE();
  const hasFeeRole = await platformTreasury.hasRole(FEE_COLLECTOR_ROLE, ADDRESSES.streamFactory);
  console.log("StreamFactory has FEE_COLLECTOR_ROLE:", hasFeeRole);
  
  if (!hasFeeRole) {
    console.log("❌ PROBLEM: StreamFactory missing FEE_COLLECTOR_ROLE!");
    console.log("FIX: Run this command:");
    console.log(`  platformTreasury.grantRole(FEE_COLLECTOR_ROLE, "${ADDRESSES.streamFactory}")`);
    process.exit(1);
  }
  
  console.log("✅ All permissions correct\n");
  
  console.log("=== STEP 2: Check Balances ===");
  
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("USDC Balance:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");
  
  const treasuryBalance = await treasury.userBalances(deployer.address);
  console.log("Treasury Balance:", hre.ethers.formatUnits(treasuryBalance, 6), "USDC");
  
  const availableBalance = await treasury.availableBalance(deployer.address);
  console.log("Available Balance:", hre.ethers.formatUnits(availableBalance, 6), "USDC");
  
  const lockedBalance = await treasury.lockedBalances(deployer.address);
  console.log("Locked Balance:", hre.ethers.formatUnits(lockedBalance, 6), "USDC");
  
  console.log("\n=== STEP 3: Check Allowances ===");
  
  const allowance = await usdc.allowance(deployer.address, ADDRESSES.treasury);
  console.log("Treasury Allowance:", hre.ethers.formatUnits(allowance, 6), "USDC");
  
  if (allowance < hre.ethers.parseUnits("100", 6)) {
    console.log("⚠️  Low allowance, approving...");
    const approveTx = await usdc.approve(ADDRESSES.treasury, hre.ethers.MaxUint256);
    await approveTx.wait();
    console.log("✅ Approved");
  }
  
  console.log("\n=== STEP 4: Test Stream Parameters ===");
  
  const amountPerSecond = hre.ethers.parseUnits("0.01", 6);
  const depositAmount = hre.ethers.parseUnits("2", 6);
  const duration = 0;
  
  console.log("Parameters:");
  console.log("  Employee:", employee.address);
  console.log("  Rate:", hre.ethers.formatUnits(amountPerSecond, 6), "USDC/sec");
  console.log("  Deposit:", hre.ethers.formatUnits(depositAmount, 6), "USDC");
  console.log("  Duration:", duration, "(indefinite)");
  
  // Calculate costs
  const platformFeeBps = await streamFactory.platformFeeBps();
  const fee = (depositAmount * platformFeeBps) / 10000n;
  const totalCost = depositAmount + fee;
  
  console.log("\nCost Breakdown:");
  console.log("  Deposit:", hre.ethers.formatUnits(depositAmount, 6), "USDC");
  console.log("  Fee (0.5%):", hre.ethers.formatUnits(fee, 6), "USDC");
  console.log("  Total Cost:", hre.ethers.formatUnits(totalCost, 6), "USDC");
  console.log("  Available:", hre.ethers.formatUnits(availableBalance, 6), "USDC");
  
  if (availableBalance < totalCost) {
    console.log("\n❌ PROBLEM: Insufficient balance!");
    console.log(`Need ${hre.ethers.formatUnits(totalCost, 6)} USDC`);
    console.log(`Have ${hre.ethers.formatUnits(availableBalance, 6)} USDC`);
    console.log("\nFIX: Deposit more USDC to Treasury");
    process.exit(1);
  }
  
  console.log("✅ Sufficient balance\n");
  
  console.log("=== STEP 5: Try Creating Stream with Error Details ===\n");
  
  try {
    // Try to estimate gas first
    console.log("Estimating gas...");
    const gasEstimate = await streamFactory.createStream.estimateGas(
      employee.address,
      amountPerSecond,
      depositAmount,
      duration
    );
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Try actual creation
    console.log("\nCreating stream...");
    const tx = await streamFactory.createStream(
      employee.address,
      amountPerSecond,
      depositAmount,
      duration
    );
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("\n✅ SUCCESS! Stream created!");
    console.log("Transaction:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Find event
    const event = receipt.logs.find(log => {
      try {
        const parsed = streamFactory.interface.parseLog(log);
        return parsed && parsed.name === 'StreamCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsedEvent = streamFactory.interface.parseLog(event);
      console.log("\nStream Details:");
      console.log("  Stream ID:", parsedEvent.args.streamId.toString());
      console.log("  Contract:", parsedEvent.args.streamContract);
    }
    
  } catch (error) {
    console.log("\n❌ STREAM CREATION FAILED\n");
    
    // Try to get revert reason
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode error
      try {
        const iface = new hre.ethers.Interface([
          "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
          "error InsufficientBalance(uint256 available, uint256 required)"
        ]);
        
        const decoded = iface.parseError(error.data);
        console.log("Decoded error:", decoded);
      } catch (decodeError) {
        console.log("Could not decode error");
      }
    }
    
    console.log("\nFull error:", error.message);
    
    // Check common issues
    console.log("\n=== TROUBLESHOOTING ===");
    console.log("\nPossible causes:");
    console.log("1. StreamFactory doesn't have permission to grant roles");
    console.log("2. Treasury contract issue with allocateToStream");
    console.log("3. PlatformTreasury cannot receive fees");
    console.log("4. PaymentStream deployment failing");
    
    // Test individual components
    console.log("\n=== COMPONENT TESTS ===\n");
    
    // Test if we can call allocateToStream directly
    try {
      console.log("Testing Treasury.allocateToStream access...");
      // This should fail if permissions are wrong
      await treasury.connect(deployer).allocateToStream.staticCall(
        999,
        deployer.address,
        hre.ethers.parseUnits("1", 6)
      );
      console.log("❌ Deployer should NOT be able to call allocateToStream");
    } catch (e) {
      console.log("✅ Correctly blocked - only STREAM_MANAGER can call");
    }
    
    // Check if StreamFactory can grant roles
    console.log("\nChecking if StreamFactory can grant roles to new contracts...");
    const DEFAULT_ADMIN_ROLE = await treasury.DEFAULT_ADMIN_ROLE();
    const factoryIsAdmin = await treasury.hasRole(DEFAULT_ADMIN_ROLE, ADDRESSES.streamFactory);
    console.log("StreamFactory has DEFAULT_ADMIN_ROLE:", factoryIsAdmin);
    
    if (!factoryIsAdmin) {
      console.log("\n❌ CRITICAL: StreamFactory needs DEFAULT_ADMIN_ROLE to grant permissions!");
      console.log("This is needed so it can grant STREAM_MANAGER_ROLE to new PaymentStream contracts");
      console.log("\nFIX:");
      console.log(`  await treasury.grantRole(DEFAULT_ADMIN_ROLE, "${ADDRESSES.streamFactory}")`);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ SCRIPT ERROR:", error);
    process.exit(1);
  });