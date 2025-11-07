# StableStream - Real-Time USDC Payment Streaming

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.20.1-yellow)](https://hardhat.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> Revolutionary payment infrastructure enabling real-time USDC streaming on Arc blockchain. Pay by the second, withdraw anytime, zero delays.

## 🌟 Overview

StableStream transforms how businesses pay employees and contractors by enabling continuous, per-second payment streaming. Built on Arc blockchain's USDC-native infrastructure, it reduces transaction costs by 10x while providing instant payment access.

### Key Features

- ⚡ **Real-Time Streaming** - Payments flow per second, not per month
- 💰 **Ultra-Low Fees** - $0.01-0.05 per transaction vs. $25-50 traditional
- 🌍 **Global Reach** - Instant cross-border payments
- 🔒 **Enterprise Security** - Multi-signature support, role-based access
- 📊 **Bulk Operations** - Create 100+ streams in one transaction
- 🎯 **Template System** - Reusable payment patterns
- 🛡️ **Battle-Tested** - Comprehensive test coverage (23+ tests)

---

## 🏗️ Architecture

### Smart Contract System

```
┌─────────────────────────────────────────────────────────────┐
│                      StreamFactory.sol                       │
│              (Main Entry Point - User Interface)             │
│   • Create single/bulk streams                               │
│   • Manage templates                                         │
│   • Emergency controls                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──► Treasury.sol
                 │    • Central USDC vault
                 │    • Multi-sig support
                 │    • Fund allocation
                 │
                 ├──► PlatformTreasury.sol
                 │    • Fee collection (0.5%)
                 │    • Revenue sharing
                 │    • Daily limits
                 │
                 └──► PaymentStream.sol (Created per stream)
                      • Individual stream logic
                      • Real-time calculations
                      • Withdraw, pause, cancel
```

### Contract Roles

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **StreamFactory** | Main user interface | `createStream()`, `createBulkStreams()` |
| **Treasury** | USDC custody | `deposit()`, `withdraw()`, `allocateToStream()` |
| **PaymentStream** | Stream logic | `balanceOf()`, `withdraw()`, `pause()` |
| **PlatformTreasury** | Fee management | `collectFee()`, `withdrawFees()` |

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Arc testnet account with ETH for gas
- Testnet USDC

### Installation

```bash
# Clone the repository
git clone https://github.com/wilkwame/StableStream.git
cd smartContract

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Setup

Create `.env` file:

```env
# Arc Blockchain Configuration
ARC_TESTNET_RPC_URL=https://your-arc-testnet-url.com
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000

# Your Private Key (NEVER commit this!)
PRIVATE_KEY=your_private_key_without_0x

# Block Explorer (optional)
ARC_EXPLORER_API_KEY=
ARC_EXPLORER_URL=
```

### Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 17 Solidity files successfully
```

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test
npx hardhat test --grep "Should create a payment stream"
```

### Deploy to Testnet

```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

---

## 📦 Deployed Contracts (Arc Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **Treasury** | `0x0Ff48CAed29E63B89D72283329DE81E91932E357` | USDC vault |
| **PlatformTreasury** | `0x586224ccDAFeFd8901626e812D7662D4Ec2c43b1` | Fee collection |
| **StreamFactory** | `0x2c72355ba178bf8a7Cd3557623b391104F4fBa5F` | Main entry point |
| **USDC Token** | `0x3600000000000000000000000000000000000000` | Testnet USDC |

---

## 💻 Usage Examples

### For Employers

#### 1. Deposit USDC to Treasury

```javascript
import { ethers } from 'ethers';

// Approve Treasury
await usdc.approve(treasuryAddress, ethers.MaxUint256);

// Deposit funds
const amount = ethers.parseUnits("10000", 6); // $10,000
await treasury.deposit(amount);
```

#### 2. Create a Single Stream

```javascript
const employee = "0xEmployeeAddress...";
const amountPerSecond = ethers.parseUnits("0.01", 6); // $0.01/second = $864/day
const depositAmount = ethers.parseUnits("5000", 6);   // $5,000 total
const duration = 30 * 24 * 60 * 60;                   // 30 days

const tx = await streamFactory.createStream(
  employee,
  amountPerSecond,
  depositAmount,
  duration
);

const receipt = await tx.wait();
console.log("Stream created! 🎉");
```

#### 3. Create Bulk Payroll (Multiple Streams)

```javascript
const employees = [
  "0xEmployee1...",
  "0xEmployee2...",
  "0xEmployee3..."
];

const rates = employees.map(() => ethers.parseUnits("0.01", 6));
const deposits = employees.map(() => ethers.parseUnits("5000", 6));
const durations = employees.map(() => 30 * 24 * 60 * 60);

await streamFactory.createBulkStreams(
  employees,
  rates,
  deposits,
  durations
);

console.log(`Created ${employees.length} streams in one transaction!`);
```

#### 4. Pause/Resume/Cancel Stream

```javascript
const streamAddress = await streamFactory.getStreamContract(streamId);
const stream = await ethers.getContractAt("PaymentStream", streamAddress);

// Pause
await stream.pause();

// Resume
await stream.unpause();

// Cancel (refunds remaining balance)
await stream.cancel();
```

### For Employees

#### 1. Check Available Balance

```javascript
const streamAddress = await streamFactory.getStreamContract(streamId);
const stream = await ethers.getContractAt("PaymentStream", streamAddress);

const balance = await stream.balanceOf();
console.log(`You can withdraw: $${ethers.formatUnits(balance, 6)}`);
```

#### 2. Withdraw Earnings

```javascript
await stream.withdraw();
console.log("Funds transferred to your wallet! 💰");
```

#### 3. Check Stream Status

```javascript
const info = await stream.getStreamInfo();

console.log({
  employer: info._employer,
  employee: info._employee,
  rate: `$${ethers.formatUnits(info._amountPerSecond, 6)}/second`,
  totalDeposit: `$${ethers.formatUnits(info._depositAmount, 6)}`,
  withdrawn: `$${ethers.formatUnits(info._totalWithdrawn, 6)}`,
  available: `$${ethers.formatUnits(info._withdrawable, 6)}`,
  isActive: !info._cancelled && !info._paused
});
```

---

## 🔧 Advanced Features

### Template System

```javascript
// Create reusable template
await streamFactory.createTemplate(
  "Monthly Salary",
  "Standard employee salary",
  ethers.parseUnits("0.01", 6),
  30 * 24 * 60 * 60
);

// Use template
await streamFactory.createStreamFromTemplate(
  1, // templateId
  employeeAddress,
  ethers.parseUnits("5000", 6)
);
```

### Multi-Signature Treasury

```javascript
// Enable multi-sig (requires 2 of 3 signatures)
const signers = [address1, address2, address3];
await treasury.enableMultiSig(2, signers);

// Withdrawals now require multiple confirmations
await treasury.withdraw(amount); // Initiates
await treasury.confirmWithdrawal(withdrawalId); // Confirm
// Executes when threshold reached
```

### Emergency Controls

```javascript
// Pause all operations (admin only)
await streamFactory.pause();

// Pause all employer's streams
await streamFactory.pauseAllEmployerStreams(employerAddress);

// Resume
await streamFactory.unpause();
```

---

## 🧪 Testing

### Run Complete Test Suite

```bash
# All tests
npx hardhat test

# With coverage
npx hardhat coverage

# Specific test file
npx hardhat test test/StableStream.test.js
```

### Test on Live Testnet

```bash
# Complete system test
npx hardhat run scripts/test-everything.js --network arcTestnet
```

This will:
1. Check USDC balance
2. Approve Treasury
3. Deposit funds
4. Create streams
5. Test withdrawals
6. Test pause/resume
7. Test bulk operations
8. Verify fees
9. Test cancellations

---

## 📊 Gas Costs (Arc Testnet)

| Operation | Cost | Traditional Cost |
|-----------|------|------------------|
| Deploy contracts | ~$5 | - |
| Create single stream | ~$0.05 | $25-50 |
| Create 100 streams (bulk) | ~$2 | $2,500-5,000 |
| Withdraw | ~$0.02 | $5-10 |
| Cancel stream | ~$0.03 | $5-10 |

**Total savings: 90-98% reduction in costs** 🎯

---

## 🏛️ Project Structure

```
smartContract/
├── contracts/
│   ├── Treasury.sol              # Central USDC vault
│   ├── PlatformTreasury.sol      # Fee collection
│   ├── StreamFactory.sol         # Main entry point
│   ├── PaymentStream.sol         # Individual streams
│   └── mocks/
│       └── MockERC20.sol         # Test USDC token
├── scripts/
│   ├── deploy.js                 # Deployment script
│   └── test-everything.js        # Complete system test
├── test/
│   └── StableStream.test.js      # Test suite (23+ tests)
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Dependencies
├── .env.example                  # Environment template
├── deployment-info.json          # Deployed addresses
├── abis.json                     # Contract ABIs
├── INTEGRATION_GUIDE.md          # Frontend integration
└── README.md                     # This file
```

---

## 🔐 Security

### Audited Features

- ✅ ReentrancyGuard on all financial operations
- ✅ Access control with role-based permissions
- ✅ Pausable contracts for emergency stops
- ✅ Input validation on all functions
- ✅ Safe math operations (Solidity 0.8.20+)
- ✅ Multi-signature support for enterprises
- ✅ Daily withdrawal limits

### Security Best Practices

1. **Never share your private key**
2. **Always test on testnet first**
3. **Use multi-sig for large amounts**
4. **Monitor contract events**
5. **Set appropriate withdrawal limits**

### Reporting Security Issues

If you discover a security vulnerability, please email: security@stablestream.io

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow Solidity style guide
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Run gas optimization checks

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌐 Links

<!-- - **Website**: https://stablestream.io
- **Documentation**: https://docs.stablestream.io
- **Discord**: https://discord.gg/stablestream
- **Twitter**: https://twitter.com/stablestream -->

---

## 📞 Support

- **Technical Issues**: Open an issue on GitHub
- **General Questions**: Discord community
- **Business Inquiries**: contact@stablestream.io

---

## 🎯 Roadmap

### Phase 1 (Current) ✅
- [x] Core streaming contracts
- [x] Treasury management
- [x] Bulk operations
- [x] Template system
- [x] Multi-sig support
- [x] Arc testnet deployment

### Phase 2 (Q1 2025)
- [ ] Mainnet deployment
- [ ] Advanced analytics dashboard
- [ ] Mobile SDK
- [ ] Integration plugins (Stripe, Plaid)
- [ ] Governance token

### Phase 3 (Q2 2025)
- [ ] Multi-chain support
- [ ] Automated tax reporting
- [ ] Fiat on/off ramps
- [ ] Enterprise SLA features
- [ ] White-label solution

---




## 📈 Market Impact

- **Target Market**: $156B global remittances + $45B payroll software
- **Potential Users**: 100M+ gig economy workers worldwide
- **Cost Savings**: $25-50 per transaction → $0.01-0.05
- **Time Savings**: 3-7 days → Real-time

---

## 🙏 Acknowledgments

- **Arc Blockchain** - For USDC-native infrastructure
- **OpenZeppelin** - Secure smart contract libraries
- **Hardhat** - Development environment
- **Circle** - USDC stablecoin
- **Community** - Testing and feedback

---

## 📚 Additional Resources

- [Arc Blockchain Documentation](https://docs.arc.xyz)
- [USDC Developer Guide](https://developers.circle.com)
- [Solidity Documentation](https://docs.soliditylang.org)
- [Hardhat Documentation](https://hardhat.org/docs)

---

**Built with ❤️ for the future of payments**

*"Pay by the second, not by the month."*