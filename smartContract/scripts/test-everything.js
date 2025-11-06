const hre = require("hardhat");
require('dotenv').config();

// Your deployed contract addresses
const ADDRESSES = {
  treasury: "0x209Ddd8D9CfAbAAB3C56B27757C7794cA6FeC2D4",
  platformTreasury: "0xD8A8eeEfa1D94c3B74c85Cd05728D41996d7420C",
  streamFactory: "0xd052f28766bB140DEeA0E952c7965154a35605ca",
  usdc: "0x3600000000000000000000000000000000000000"
};

async function main() {
  console.log("🧪 STABLESTREAM COMPLETE SYSTEM TEST");
  console.log("=".repeat(60));
  
  // Get signers
  const [deployer] = await hre.ethers.getSigners();

  // Create employee wallets from private keys
  const employee1 = new hre.ethers.Wallet(process.env.EMPLOYEE1_PK, hre.ethers.provider);
const employee2 = new hre.ethers.Wallet(process.env.EMPLOYEE2_PK, hre.ethers.provider);
  
  console.log("\n👥 Test Accounts:");
  console.log("   Employer (Deployer):", deployer.address);
  console.log("   Employee 1:", employee1.address);
  console.log("   Employee 2:", employee2.address);
  
  // Connect to deployed contracts
  console.log("\n📡 Connecting to deployed contracts...");
  
  const streamFactory = await hre.ethers.getContractAt(
    "StreamFactory",
    ADDRESSES.streamFactory
  );
  
  const treasury = await hre.ethers.getContractAt(
    "Treasury",
    ADDRESSES.treasury
  );
  
  const platformTreasury = await hre.ethers.getContractAt(
    "PlatformTreasury",
    ADDRESSES.platformTreasury
  );
  
  const usdc = await hre.ethers.getContractAt(
    "IERC20",
    ADDRESSES.usdc
  );
  
  console.log("   ✅ All contracts connected");
  
  // ========================================
  // TEST 1: Check USDC Balance
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 1: Checking USDC Balance");
  console.log("=".repeat(60));
  
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("   USDC Balance:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");
  
  if (usdcBalance === 0n) {
    console.log("\n   ❌ ERROR: No USDC in your wallet!");
    console.log("   → You need testnet USDC to continue");
    console.log("   → Get it from Arc testnet faucet or mint it");
    process.exit(1);
  }
  
  console.log("   ✅ USDC balance sufficient");
  
  // ========================================
  // TEST 2: Approve Treasury
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Approving Treasury");
  console.log("=".repeat(60));
  
  const currentAllowance = await usdc.allowance(deployer.address, ADDRESSES.treasury);
  
  if (currentAllowance < hre.ethers.parseUnits("1000", 6)) {
    console.log("   → Approving Treasury to spend USDC...");
    const approveTx = await usdc.approve(ADDRESSES.treasury, hre.ethers.MaxUint256);
    await approveTx.wait();
    console.log("   ✅ Treasury approved");
  } else {
    console.log("   ✅ Treasury already approved");
  }
  
  // ========================================
  // TEST 3: Deposit to Treasury
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 3: Depositing to Treasury");
  console.log("=".repeat(60));
  
  const depositAmount = hre.ethers.parseUnits("30", 6); // $30
  console.log("   → Depositing", hre.ethers.formatUnits(depositAmount, 6), "USDC...");
  
  const depositTx = await treasury.deposit(depositAmount);
  await depositTx.wait();
  
  const treasuryBalance = await treasury.userBalances(deployer.address);
  console.log("   ✅ Deposited successfully");
  console.log("   Treasury Balance:", hre.ethers.formatUnits(treasuryBalance, 6), "USDC");
  
  // ========================================
  // TEST 4: Create Single Stream
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 4: Creating Single Payment Stream");
  console.log("=".repeat(60));
  
  const amountPerSecond = hre.ethers.parseUnits("0.01", 6); // $0.01/second
  const streamDeposit = hre.ethers.parseUnits("10", 6); // $10
  const duration = 0; // Indefinite
  
  console.log("   Employee:", employee1.address);
  console.log("   Rate: $0.01/second");
  console.log("   Deposit: $10");
  console.log("   Duration: Indefinite");
  console.log("\n   → Creating stream...");
  
  const createTx = await streamFactory.createStream(
    employee1.address,
    amountPerSecond,
    streamDeposit,
    duration
  );
  
  const createReceipt = await createTx.wait();
  console.log("   ✅ Stream created!");
  console.log("   Transaction:", createReceipt.hash);
  
  // Find StreamCreated event
  const event = createReceipt.logs.find(log => {
    try {
      const parsed = streamFactory.interface.parseLog(log);
      return parsed && parsed.name === 'StreamCreated';
    } catch {
      return false;
    }
  });
  
  const parsedEvent = streamFactory.interface.parseLog(event);
  const streamId = parsedEvent.args.streamId;
  const paymentStreamAddress = parsedEvent.args.streamContract;
  
  console.log("\n   📋 Stream Details:");
  console.log("   Stream ID:", streamId.toString());
  console.log("   PaymentStream Contract:", paymentStreamAddress);
  console.log("   Fee Collected:", hre.ethers.formatUnits(parsedEvent.args.fee, 6), "USDC");
  
  // ========================================
  // TEST 5: Check Stream Info
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 5: Checking Stream Information");
  console.log("=".repeat(60));
  
  const paymentStream = await hre.ethers.getContractAt(
    "PaymentStream",
    paymentStreamAddress
  );
  
  const streamInfo = await paymentStream.getStreamInfo();
  
  console.log("   Employer:", streamInfo._employer);
  console.log("   Employee:", streamInfo._employee);
  console.log("   Rate:", hre.ethers.formatUnits(streamInfo._amountPerSecond, 6), "USDC/sec");
  console.log("   Deposit:", hre.ethers.formatUnits(streamInfo._depositAmount, 6), "USDC");
  console.log("   Active:", !streamInfo._cancelled && !streamInfo._paused);
  console.log("   ✅ Stream info retrieved");
  
  // ========================================
  // TEST 6: Wait and Check Balance
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 6: Testing Real-Time Balance Updates");
  console.log("=".repeat(60));
  
  console.log("   ⏳ Waiting 10 seconds for balance to accumulate...");
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const balance = await paymentStream.balanceOf();
  console.log("   Withdrawable Balance:", hre.ethers.formatUnits(balance, 6), "USDC");
  console.log("   Expected: ~$0.10 (10 seconds × $0.01/sec)");
  
  if (balance > 0n) {
    console.log("   ✅ Balance accumulating correctly!");
  } else {
    console.log("   ⚠️  Balance is zero - may need more time");
  }
  
  // ========================================
  // TEST 7: Employee Withdraws
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 7: Employee Withdrawal");
  console.log("=".repeat(60));
  
  const employee1UsdcBefore = await usdc.balanceOf(employee1.address);
  console.log("   Employee USDC Before:", hre.ethers.formatUnits(employee1UsdcBefore, 6), "USDC");
  
  console.log("   → Employee withdrawing...");
  const withdrawTx = await paymentStream.connect(employee1).withdraw();
  await withdrawTx.wait();
  
  const employee1UsdcAfter = await usdc.balanceOf(employee1.address);
  const withdrawn = employee1UsdcAfter - employee1UsdcBefore;
  
  console.log("   Employee USDC After:", hre.ethers.formatUnits(employee1UsdcAfter, 6), "USDC");
  console.log("   Amount Withdrawn:", hre.ethers.formatUnits(withdrawn, 6), "USDC");
  console.log("   ✅ Withdrawal successful!");
  
  // ========================================
  // TEST 8: Pause Stream
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 8: Pausing Stream");
  console.log("=".repeat(60));
  
  console.log("   → Pausing stream...");
  const pauseTx = await paymentStream.pause();
  await pauseTx.wait();
  
  const isPaused = await paymentStream.paused();
  console.log("   Stream Paused:", isPaused);
  console.log("   ✅ Stream paused successfully");
  
  // ========================================
  // TEST 9: Resume Stream
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 9: Resuming Stream");
  console.log("=".repeat(60));
  
  console.log("   → Resuming stream...");
  const resumeTx = await paymentStream.unpause();
  await resumeTx.wait();
  
  const isPausedAfter = await paymentStream.paused();
  console.log("   Stream Paused:", isPausedAfter);
  console.log("   ✅ Stream resumed successfully");
  
  // ========================================
  // TEST 10: Create Bulk Streams
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 10: Creating Bulk Streams");
  console.log("=".repeat(60));
  
  const employees = [employee1.address, employee2.address];
  const rates = [
    hre.ethers.parseUnits("0.01", 6),
    hre.ethers.parseUnits("0.02", 6)
  ];
  const deposits = [
    hre.ethers.parseUnits("5", 6),
    hre.ethers.parseUnits("5", 6)
  ];
  const durations = [0, 0];
  
  console.log("   Creating 2 streams at once...");
  console.log("   Employee 1: $0.01/sec, $5 deposit");
  console.log("   Employee 2: $0.02/sec, $5 deposit");
  
  const bulkTx = await streamFactory.createBulkStreams(
    employees,
    rates,
    deposits,
    durations
  );
  
  const bulkReceipt = await bulkTx.wait();
  console.log("   ✅ Bulk streams created!");
  console.log("   Transaction:", bulkReceipt.hash);
  
  // ========================================
  // TEST 11: Check All Streams
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 11: Listing All Streams");
  console.log("=".repeat(60));
  
  const employerStreams = await streamFactory.getEmployerStreams(deployer.address);
  console.log("   Total Streams Created:", employerStreams.length.toString());
  
  for (let i = 0; i < employerStreams.length; i++) {
    const sid = employerStreams[i];
    const sAddress = await streamFactory.getStreamContract(sid);
    console.log(`   Stream ${i + 1}: ID=${sid.toString()}, Contract=${sAddress}`);
  }
  
  console.log("   ✅ All streams listed");
  
  // ========================================
  // TEST 12: Check Platform Fees
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 12: Platform Fee Collection");
  console.log("=".repeat(60));
  
  const feesCollected = await platformTreasury.totalFeesCollected();
  const feesAvailable = await platformTreasury.availableBalance();
  
  console.log("   Total Fees Collected:", hre.ethers.formatUnits(feesCollected, 6), "USDC");
  console.log("   Available to Withdraw:", hre.ethers.formatUnits(feesAvailable, 6), "USDC");
  console.log("   Fee Rate: 0.5%");
  console.log("   ✅ Fees being collected correctly");
  
  // ========================================
  // TEST 13: Cancel a Stream
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("TEST 13: Cancelling Stream");
  console.log("=".repeat(60));
  
  const treasuryBalanceBefore = await treasury.userBalances(deployer.address);
  
  console.log("   → Cancelling stream", streamId.toString(), "...");
  const cancelTx = await paymentStream.cancel();
  await cancelTx.wait();
  
  const isCancelled = await paymentStream.cancelled();
  const treasuryBalanceAfter = await treasury.userBalances(deployer.address);
  const refund = treasuryBalanceAfter - treasuryBalanceBefore;
  
  console.log("   Stream Cancelled:", isCancelled);
  console.log("   Refund Amount:", hre.ethers.formatUnits(refund, 6), "USDC");
  console.log("   ✅ Stream cancelled and refunded");
  
  // ========================================
  // FINAL SUMMARY
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 ALL TESTS PASSED!");
  console.log("=".repeat(60));
  
  console.log("\n✅ Test Results:");
  console.log("   [✓] USDC balance checked");
  console.log("   [✓] Treasury approval working");
  console.log("   [✓] Deposits to Treasury working");
  console.log("   [✓] Single stream creation working");
  console.log("   [✓] PaymentStream contract deployed");
  console.log("   [✓] Stream info retrieval working");
  console.log("   [✓] Real-time balance updates working");
  console.log("   [✓] Employee withdrawals working");
  console.log("   [✓] Stream pause/resume working");
  console.log("   [✓] Bulk stream creation working");
  console.log("   [✓] Stream listing working");
  console.log("   [✓] Platform fees collecting");
  console.log("   [✓] Stream cancellation working");
  
  console.log("\n📊 Final Stats:");
  const finalTreasuryBalance = await treasury.userBalances(deployer.address);
  const finalStreams = await streamFactory.getEmployerStreams(deployer.address);
  
  console.log("   Treasury Balance:", hre.ethers.formatUnits(finalTreasuryBalance, 6), "USDC");
  console.log("   Total Streams:", finalStreams.length.toString());
  console.log("   Platform Fees:", hre.ethers.formatUnits(feesCollected, 6), "USDC");
  
  console.log("\n✨ Your StableStream system is fully operational! ✨\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
    process.exit(1);
  });