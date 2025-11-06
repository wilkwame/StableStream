
# StableStream Integration Guide

## Contract Addresses (arcTestnet)
- StreamFactory: 0xcF9C1CbB019d279911FDb46E2B5c0FEE2986851F
- Treasury: 0x8Bc691b02669C92f0a355A95097ec3F4FAc2C759
- PlatformTreasury: 0x6E97F0b70e31521F658d2225a898f7A7660BB3f2
- USDC: 0x3600000000000000000000000000000000000000

## Quick Start for Frontend (Ethers v6)

### 1. Connect to Contracts
```javascript
import { ethers } from 'ethers';

const streamFactory = new ethers.Contract(
  "0xcF9C1CbB019d279911FDb46E2B5c0FEE2986851F",
  streamFactoryABI,
  signer
);

const treasury = new ethers.Contract(
  "0x8Bc691b02669C92f0a355A95097ec3F4FAc2C759",
  treasuryABI,
  signer
);
```

### 2. Deposit USDC
```javascript
// First approve Treasury
await usdc.approve("0x8Bc691b02669C92f0a355A95097ec3F4FAc2C759", ethers.MaxUint256);

// Then deposit
const amount = ethers.parseUnits("1000", 6); // $1000
await treasury.deposit(amount);
```

### 3. Create Stream
```javascript
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
```

### 4. Check Balance & Withdraw
```javascript
const streamAddress = await streamFactory.getStreamContract(streamId);
const stream = new ethers.Contract(streamAddress, streamABI, signer);

// Check withdrawable amount
const balance = await stream.balanceOf();
console.log("Available:", ethers.formatUnits(balance, 6), "USDC");

// Withdraw
await stream.withdraw();
```

### 5. Get Stream Details
```javascript
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
```

### 6. Bulk Create Streams (Payroll)
```javascript
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
```

## Event Listening
```javascript
// Listen for stream creation
streamFactory.on("StreamCreated", (streamId, employer, employee, streamContract) => {
  console.log(`New stream: ${streamId}`);
  console.log(`Employer: ${employer}`);
  console.log(`Employee: ${employee}`);
  console.log(`Contract: ${streamContract}`);
});

// Listen for withdrawals
stream.on("Withdrawn", (employee, amount, timestamp) => {
  console.log(`Withdrawn: $${ethers.formatUnits(amount, 6)}`);
});
```

## Common Operations

### Pause/Resume Stream
```javascript
// Pause
await stream.pause();

// Resume
await stream.unpause();
```

### Cancel Stream
```javascript
// Returns refund to employer's Treasury balance
await stream.cancel();
```

### Check if Stream is Active
```javascript
const isActive = await stream.isActive();
const progress = await stream.percentComplete();
console.log("Active:", isActive);
console.log("Progress:", progress.toString() + "%");
```

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
ABIs are exported in `abis.json` file after deployment.

## Support
For issues or questions, refer to the main documentation or contact the development team.
