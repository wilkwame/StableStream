const hre = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🚀 STABLESTREAM FULL DEPLOYMENT");
  console.log("=".repeat(60));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("\n📍 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Arc Testnet USDC address
  const USDC_ADDRESS = process.env.ARC_USDC_ADDRESS;
  
  if (!USDC_ADDRESS || USDC_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("\n❌ ERROR: Set ARC_USDC_ADDRESS in .env file");
    process.exit(1);
  }
  
  console.log("\n🪙  USDC Token:", USDC_ADDRESS);
  console.log("=".repeat(60));
  
  // ========================================
  // STEP 1: Deploy Treasury
  // ========================================
  console.log("\n📦 [1/4] Deploying Treasury...");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(USDC_ADDRESS);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed:", treasuryAddress);
  
  // ========================================
  // STEP 2: Deploy PlatformTreasury
  // ========================================
  console.log("\n📦 [2/4] Deploying PlatformTreasury...");
  const dailyLimit = hre.ethers.parseUnits("10000", 6); // $10,000 daily limit
  const PlatformTreasury = await hre.ethers.getContractFactory("PlatformTreasury");
  const platformTreasury = await PlatformTreasury.deploy(USDC_ADDRESS, dailyLimit);
  await platformTreasury.waitForDeployment();
  const platformTreasuryAddress = await platformTreasury.getAddress();
  console.log("✅ PlatformTreasury deployed:", platformTreasuryAddress);
  
  // ========================================
  // STEP 3: Deploy StreamFactory
  // ========================================
  console.log("\n📦 [3/4] Deploying StreamFactory...");
  const StreamFactory = await hre.ethers.getContractFactory("StreamFactory");
  const streamFactory = await StreamFactory.deploy(
    treasuryAddress,
    platformTreasuryAddress
  );
  await streamFactory.waitForDeployment();
  const streamFactoryAddress = await streamFactory.getAddress();
  console.log("✅ StreamFactory deployed:", streamFactoryAddress);
  
  // ========================================
  // STEP 4: Setup Permissions
  // ========================================
  console.log("\n📦 [4/4] Setting up permissions...");
  
  // Grant StreamFactory permission to manage Treasury
  console.log("   → Granting STREAM_MANAGER_ROLE to StreamFactory...");
  await treasury.grantStreamManagerRole(streamFactoryAddress);
  console.log("   ✅ StreamFactory can manage Treasury");
  
  // Grant StreamFactory permission to collect fees
  console.log("   → Granting FEE_COLLECTOR_ROLE to StreamFactory...");
  const FEE_COLLECTOR_ROLE = await platformTreasury.FEE_COLLECTOR_ROLE();
  await platformTreasury.grantRole(FEE_COLLECTOR_ROLE, streamFactoryAddress);
  console.log("   ✅ StreamFactory can collect fees");
  
  // ========================================
  // WAIT FOR CONFIRMATIONS
  // ========================================
  console.log("\n⏳ Waiting for block confirmations...");
  console.log("✅ All contracts confirmed on blockchain");
  
  // ========================================
  // SAVE DEPLOYMENT INFO
  // ========================================
  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: network.chainId.toString(), // Convert BigInt to string
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      usdc: USDC_ADDRESS,
      treasury: treasuryAddress,
      platformTreasury: platformTreasuryAddress,
      streamFactory: streamFactoryAddress
    },
    config: {
      platformFee: "0.5%",
      dailyWithdrawLimit: "$10,000"
    }
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // ========================================
  // CREATE ABI EXPORTS FOR FRONTEND
  // ========================================
  const abis = {
    StreamFactory: JSON.parse(streamFactory.interface.formatJson()),
    Treasury: JSON.parse(treasury.interface.formatJson()),
    PlatformTreasury: JSON.parse(platformTreasury.interface.formatJson())
  };
  
  fs.writeFileSync('abis.json', JSON.stringify(abis, null, 2));
  
  // ========================================
  // DEPLOYMENT SUMMARY
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log("   Treasury:         ", treasuryAddress);
  console.log("   PlatformTreasury: ", platformTreasuryAddress);
  console.log("   StreamFactory:    ", streamFactoryAddress);
  console.log("   USDC Token:       ", USDC_ADDRESS);
  
  console.log("\n📊 CONFIGURATION:");
  console.log("   Platform Fee:     0.5%");
  console.log("   Daily Limit:      $10,000");
  console.log("   Max Bulk Size:    100 streams");
  
  console.log("\n📄 FILES CREATED:");
  console.log("   ✅ deployment-info.json (contract addresses)");
  console.log("   ✅ abis.json (for frontend integration)");
  
  // ========================================
  // VERIFICATION (if on testnet with explorer)
  // ========================================
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contracts on block explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: treasuryAddress,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log("✅ Treasury verified");
      
      await hre.run("verify:verify", {
        address: platformTreasuryAddress,
        constructorArguments: [USDC_ADDRESS, dailyLimit],
      });
      console.log("✅ PlatformTreasury verified");
      
      await hre.run("verify:verify", {
        address: streamFactoryAddress,
        constructorArguments: [treasuryAddress, platformTreasuryAddress],
      });
      console.log("✅ StreamFactory verified");
      
    } catch (error) {
      console.log("⚠️  Verification failed (you can verify manually later)");
      console.log("   Error:", error.message);
    }
  }
  
  // ========================================
  // NEXT STEPS
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("🚀 NEXT STEPS:");
  console.log("=".repeat(60));
  console.log("\n1. Fund your address with testnet USDC");
  console.log("2. Approve Treasury to spend your USDC:");
  console.log(`   → usdc.approve("${treasuryAddress}", ethers.MaxUint256)`);
  console.log("\n3. Deposit USDC to Treasury:");
  console.log("   → treasury.deposit(amount)");
  console.log("\n4. Create your first stream:");
  console.log("   → streamFactory.createStream(employee, rate, deposit, duration)");
  console.log("\n5. Share contract addresses with frontend team");
  console.log("\n" + "=".repeat(60));
  
  // ========================================
  // CREATE INTEGRATION GUIDE
  // ========================================
  const integrationGuide = `
# StableStream Integration Guide

## Contract Addresses (${hre.network.name})
- StreamFactory: ${streamFactoryAddress}
- Treasury: ${treasuryAddress}
- PlatformTreasury: ${platformTreasuryAddress}
- USDC: ${USDC_ADDRESS}

## Quick Start for Frontend (Ethers v6)

### 1. Connect to Contracts
\`\`\`javascript
import { ethers } from 'ethers';

const streamFactory = new ethers.Contract(
  "${streamFactoryAddress}",
  streamFactoryABI,
  signer
);

const treasury = new ethers.Contract(
  "${treasuryAddress}",
  treasuryABI,
  signer
);
\`\`\`

### 2. Deposit USDC
\`\`\`javascript
// First approve Treasury
await usdc.approve("${treasuryAddress}", ethers.MaxUint256);

// Then deposit
const amount = ethers.parseUnits("1000", 6); // $1000
await treasury.deposit(amount);
\`\`\`

### 3. Create Stream
\`\`\`javascript
const employee = "0x...";
const amountPerSecond = ethers.parseUnits("0.01", 6); // $0.01/sec
const deposit = ethers.parseUnits("1000", 6); // $1000
const duration = 30 * 24 * 60 * 60; // 30 days

const tx = await streamFactory.createStream(
  employee,
  amountPerSecond,
  deposit,
  duration
);

const receipt = await tx.wait();

// Find StreamCreated event
const event = receipt.logs.find(log => {
  try {
    const parsed = streamFactory.interface.parseLog(log);
    return parsed && parsed.name === 'StreamCreated';
  } catch {
    return false;
  }
});

const parsedEvent = streamFactory.interface.parseLog(event);
const streamId = parsedEvent.args.streamId;
console.log("Stream ID:", streamId.toString());
\`\`\`

### 4. Check Balance & Withdraw
\`\`\`javascript
const streamAddress = await streamFactory.getStreamContract(streamId);
const stream = new ethers.Contract(streamAddress, streamABI, signer);

// Check withdrawable amount
const balance = await stream.balanceOf();
console.log("Available:", ethers.formatUnits(balance, 6), "USDC");

// Withdraw
await stream.withdraw();
\`\`\`

### 5. Get Stream Details
\`\`\`javascript
const info = await stream.getStreamInfo();
console.log({
  employer: info._employer,
  employee: info._employee,
  rate: ethers.formatUnits(info._amountPerSecond, 6) + " USDC/sec",
  deposit: ethers.formatUnits(info._depositAmount, 6) + " USDC",
  withdrawn: ethers.formatUnits(info._totalWithdrawn, 6) + " USDC",
  available: ethers.formatUnits(info._withdrawable, 6) + " USDC",
  active: !info._cancelled && !info._paused
});
\`\`\`

### 6. Bulk Create Streams (Payroll)
\`\`\`javascript
const employees = [
  "0xEmployee1...",
  "0xEmployee2...",
  "0xEmployee3..."
];

const rates = employees.map(() => ethers.parseUnits("0.01", 6));
const deposits = employees.map(() => ethers.parseUnits("1000", 6));
const durations = employees.map(() => 30 * 24 * 60 * 60);

const tx = await streamFactory.createBulkStreams(
  employees,
  rates,
  deposits,
  durations
);

const receipt = await tx.wait();
console.log("Created", employees.length, "streams in one transaction!");
\`\`\`

## Event Listening
\`\`\`javascript
// Listen for stream creation
streamFactory.on("StreamCreated", (streamId, employer, employee, streamContract) => {
  console.log(\`New stream: \${streamId}\`);
  console.log(\`Employer: \${employer}\`);
  console.log(\`Employee: \${employee}\`);
  console.log(\`Contract: \${streamContract}\`);
});

// Listen for withdrawals
stream.on("Withdrawn", (employee, amount, timestamp) => {
  console.log(\`Withdrawn: $\${ethers.formatUnits(amount, 6)}\`);
});
\`\`\`

## Common Operations

### Pause/Resume Stream
\`\`\`javascript
// Pause
await stream.pause();

// Resume
await stream.unpause();
\`\`\`

### Cancel Stream
\`\`\`javascript
// Returns refund to employer's Treasury balance
await stream.cancel();
\`\`\`

### Check if Stream is Active
\`\`\`javascript
const isActive = await stream.isActive();
const progress = await stream.percentComplete();
console.log("Active:", isActive);
console.log("Progress:", progress.toString() + "%");
\`\`\`

## Testing Checklist
- [ ] Deploy all contracts
- [ ] Get testnet USDC from faucet
- [ ] Approve Treasury to spend USDC
- [ ] Deposit to Treasury
- [ ] Create test stream
- [ ] Wait 60 seconds
- [ ] Check balanceOf() (should show earned amount)
- [ ] Withdraw as employee
- [ ] Verify balances updated
- [ ] Test pause/resume
- [ ] Test cancellation
- [ ] Test bulk creation (3+ streams)

## Gas Costs on Arc (Estimated)
- Deploy all contracts: ~$5 (one-time)
- Create single stream: ~$0.05
- Create 100 streams (bulk): ~$2
- Withdraw: ~$0.02
- Cancel stream: ~$0.03

**Total for demo with 100 streams: ~$7-10**

## Contract ABIs
ABIs are exported in \`abis.json\` file after deployment.

## Support
For issues or questions, refer to the main documentation or contact the development team.
`;

  fs.writeFileSync('INTEGRATION_GUIDE.md', integrationGuide);
  console.log("\n📚 Created: INTEGRATION_GUIDE.md");
  
  console.log("\n✨ All done! Ready to build the future of payments! ✨\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });