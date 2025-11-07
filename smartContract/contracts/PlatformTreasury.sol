// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PlatformTreasury
 * @dev Collects and manages platform fees from stream operations
 * Implements revenue tracking and withdrawal mechanisms
 */
contract PlatformTreasury is AccessControl, ReentrancyGuard {
    
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    
    IERC20 public immutable usdcToken;
    
    // Fee tracking
    uint256 public totalFeesCollected;
    uint256 public totalFeesWithdrawn;
    
    // Fee records per stream
    mapping(uint256 => uint256) public streamFees;
    
    // Revenue sharing (for future partnership splits)
    struct RevenueShare {
        address recipient;
        uint256 shareBps; // Basis points (100 = 1%)
        bool active;
    }
    
    mapping(uint256 => RevenueShare) public revenueShares;
    uint256 public nextShareId = 1;
    uint256 public totalShareBps = 0;
    uint256 public constant MAX_TOTAL_SHARE_BPS = 5000; // 50% max to partners
    uint256 public constant MAX_REVENUE_SHARES = 20; // Prevent gas exhaustion
    
    // Withdrawal limits for security
    uint256 public dailyWithdrawLimit;
    uint256 public lastWithdrawDay;
    uint256 public todayWithdrawn;
    
    // Withdrawal receipt tracking
    struct WithdrawalReceipt {
        address withdrawer;
        uint256 amount;
        uint256 timestamp;
        uint256 partnersAmount;
        uint256 adminAmount;
    }
    
    mapping(uint256 => WithdrawalReceipt) public withdrawalReceipts;
    uint256 public nextReceiptId = 1;
    
    // Events
    event FeeCollected(uint256 indexed streamId, uint256 amount, uint256 timestamp);
    event FeeWithdrawn(address indexed recipient, uint256 amount);
    event RevenueShareAdded(uint256 indexed shareId, address recipient, uint256 shareBps);
    event RevenueShareUpdated(uint256 indexed shareId, uint256 newShareBps);
    event RevenueShareRemoved(uint256 indexed shareId);
    event DailyLimitUpdated(uint256 newLimit);
    event WithdrawalRecorded(uint256 indexed receiptId, address withdrawer, uint256 amount);
    
    constructor(address _usdcToken, uint256 _dailyWithdrawLimit) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_dailyWithdrawLimit > 0, "Invalid daily limit");
        
        usdcToken = IERC20(_usdcToken);
        dailyWithdrawLimit = _dailyWithdrawLimit;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(WITHDRAWER_ROLE, msg.sender);
    }
    
    /**
     * @dev Collect fee from a stream (called by StreamFactory)
     * @param streamId The stream that generated the fee
     * @param amount Fee amount in USDC
     */
    function collectFee(
        uint256 streamId,
        uint256 amount
    ) external onlyRole(FEE_COLLECTOR_ROLE) nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient USDC balance");
        
        // Note: USDC should already be transferred to this contract by Treasury before this call
        
        streamFees[streamId] += amount;
        totalFeesCollected += amount;
        
        emit FeeCollected(streamId, amount, block.timestamp);
    }
    
    /**
     * @dev Withdraw collected fees (with daily limit)
     * @param amount Amount to withdraw
     */
    function withdrawFees(uint256 amount) external onlyRole(WITHDRAWER_ROLE) nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(availableBalance() >= amount, "Insufficient collected balance");
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        // Check daily limit
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastWithdrawDay) {
            // New day, reset counter
            lastWithdrawDay = currentDay;
            todayWithdrawn = 0;
        }
        
        require(
            todayWithdrawn + amount <= dailyWithdrawLimit,
            "Exceeds daily withdraw limit"
        );
        
        todayWithdrawn += amount;
        totalFeesWithdrawn += amount;
        
        // Distribute to revenue share partners first
        uint256 toPartners = _distributeRevenueShares(amount);
        uint256 toAdmin = amount - toPartners;
        
        // Transfer remaining to admin (withdrawer)
        if (toAdmin > 0) {
            require(
                usdcToken.transfer(msg.sender, toAdmin),
                "Transfer failed"
            );
        }
        
        // Record withdrawal receipt
        uint256 receiptId = nextReceiptId++;
        withdrawalReceipts[receiptId] = WithdrawalReceipt({
            withdrawer: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            partnersAmount: toPartners,
            adminAmount: toAdmin
        });
        
        emit FeeWithdrawn(msg.sender, amount);
        emit WithdrawalRecorded(receiptId, msg.sender, amount);
    }
    
    /**
     * @dev Distribute revenue shares to partners
     * @param totalAmount Total amount being withdrawn
     * @return Amount distributed to partners
     */
    function _distributeRevenueShares(uint256 totalAmount) internal returns (uint256) {
        if (totalShareBps == 0) {
            return 0;
        }
        
        uint256 totalDistributed = 0;
        
        for (uint256 i = 1; i < nextShareId; i++) {
            RevenueShare memory share = revenueShares[i];
            
            if (share.active && share.shareBps > 0) {
                uint256 shareAmount = (totalAmount * share.shareBps) / 10000;
                
                if (shareAmount > 0 && usdcToken.balanceOf(address(this)) >= shareAmount) {
                    require(
                        usdcToken.transfer(share.recipient, shareAmount),
                        "Share transfer failed"
                    );
                    totalDistributed += shareAmount;
                }
            }
        }
        
        return totalDistributed;
    }
    
    /**
     * @dev Add revenue sharing partner
     * @param recipient Address to receive share
     * @param shareBps Share percentage in basis points
     */
    function addRevenueShare(
        address recipient,
        uint256 shareBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(shareBps > 0, "Share must be positive");
        require(shareBps <= 5000, "Share too high"); // Max 50% per partner
        require(
            totalShareBps + shareBps <= MAX_TOTAL_SHARE_BPS,
            "Total share too high"
        );
        require(nextShareId - 1 < MAX_REVENUE_SHARES, "Too many revenue shares");
        
        // Check for duplicates
        for (uint256 i = 1; i < nextShareId; i++) {
            if (revenueShares[i].recipient == recipient && revenueShares[i].active) {
                revert("Recipient already has active share");
            }
        }
        
        uint256 shareId = nextShareId++;
        
        revenueShares[shareId] = RevenueShare({
            recipient: recipient,
            shareBps: shareBps,
            active: true
        });
        
        totalShareBps += shareBps;
        
        emit RevenueShareAdded(shareId, recipient, shareBps);
        
        return shareId;
    }
    
    /**
     * @dev Update existing revenue share
     * @param shareId Share to update
     * @param newShareBps New share percentage
     */
    function updateRevenueShare(
        uint256 shareId, 
        uint256 newShareBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RevenueShare storage share = revenueShares[shareId];
        require(share.active, "Share not active");
        require(newShareBps > 0, "Share must be positive");
        require(newShareBps <= 5000, "Share too high");
        
        uint256 oldShareBps = share.shareBps;
        require(
            totalShareBps - oldShareBps + newShareBps <= MAX_TOTAL_SHARE_BPS,
            "Total share too high"
        );
        
        totalShareBps = totalShareBps - oldShareBps + newShareBps;
        share.shareBps = newShareBps;
        
        emit RevenueShareUpdated(shareId, newShareBps);
    }
    
    /**
     * @dev Remove revenue share
     * @param shareId Share to remove
     */
    function removeRevenueShare(uint256 shareId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RevenueShare storage share = revenueShares[shareId];
        require(share.active, "Share not active");
        
        totalShareBps -= share.shareBps;
        share.active = false;
        
        emit RevenueShareRemoved(shareId);
    }
    
    /**
 * @dev Add multiple revenue shares at once
 */
function addRevenueSharesBatch(
    address[] calldata recipients,
    uint256[] calldata sharesBps
) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(recipients.length == sharesBps.length, "Array length mismatch");
    require(recipients.length <= 10, "Too many shares in batch");
    require(nextShareId - 1 + recipients.length <= MAX_REVENUE_SHARES, "Too many revenue shares");
    
    uint256 totalNewShares = 0;
    
    // Validate all shares first
    for (uint256 i = 0; i < recipients.length; i++) {
        require(recipients[i] != address(0), "Invalid recipient");
        require(sharesBps[i] > 0, "Share must be positive");
        require(sharesBps[i] <= 5000, "Share too high");
        totalNewShares += sharesBps[i];
        
        // Check for duplicates in the batch
        for (uint256 j = i + 1; j < recipients.length; j++) {
            require(recipients[i] != recipients[j], "Duplicate recipient in batch");
        }
        
        // Check against existing active shares
        for (uint256 k = 1; k < nextShareId; k++) {
            if (revenueShares[k].recipient == recipients[i] && revenueShares[k].active) {
                revert("Recipient already has active share");
            }
        }
    }
    
    require(
        totalShareBps + totalNewShares <= MAX_TOTAL_SHARE_BPS,
        "Total share too high"
    );
    
    // Add all shares directly
    for (uint256 i = 0; i < recipients.length; i++) {
        uint256 shareId = nextShareId++;
        
        revenueShares[shareId] = RevenueShare({
            recipient: recipients[i],
            shareBps: sharesBps[i],
            active: true
        });
        
        totalShareBps += sharesBps[i];
        
        emit RevenueShareAdded(shareId, recipients[i], sharesBps[i]);
    }
}
    
    /**
     * @dev Update daily withdrawal limit
     * @param newLimit New limit in USDC
     */
    function updateDailyLimit(uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newLimit > 0, "Limit must be positive");
        dailyWithdrawLimit = newLimit;
        
        emit DailyLimitUpdated(newLimit);
    }
    
    /**
     * @dev Grant fee collector role to StreamFactory
     */
    function grantFeeCollectorRole(address feeCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(FEE_COLLECTOR_ROLE, feeCollector);
    }
    
    /**
     * @dev Get available balance (collected but not withdrawn)
     */
    function availableBalance() public view returns (uint256) {
        return totalFeesCollected - totalFeesWithdrawn;
    }
    
    /**
     * @dev Get current USDC balance in contract
     */
    function contractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
    
    /**
     * @dev Get fee collected for specific stream
     */
    function getStreamFee(uint256 streamId) external view returns (uint256) {
        return streamFees[streamId];
    }
    
    /**
     * @dev Get remaining daily withdraw limit
     */
    function remainingDailyLimit() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        
        if (currentDay > lastWithdrawDay) {
            return dailyWithdrawLimit;
        }
        
        if (todayWithdrawn >= dailyWithdrawLimit) {
            return 0;
        }
        
        return dailyWithdrawLimit - todayWithdrawn;
    }
    
    /**
     * @dev Get all revenue sharing info
     */
    function getRevenueShareInfo() external view returns (
        uint256 totalShares,
        uint256 activeShareCount
    ) {
        uint256 activeCount = 0;
        
        for (uint256 i = 1; i < nextShareId; i++) {
            if (revenueShares[i].active) {
                activeCount++;
            }
        }
        
        return (totalShareBps, activeCount);
    }
    
    /**
     * @dev Get detailed revenue share information
     */
    function getRevenueShareDetails() external view returns (
        address[] memory recipients,
        uint256[] memory sharesBps,
        bool[] memory activeStatus,
        uint256[] memory shareIds
    ) {
        uint256 activeCount = 0;
        
        // First count active shares
        for (uint256 i = 1; i < nextShareId; i++) {
            if (revenueShares[i].active) {
                activeCount++;
            }
        }
        
        // Initialize arrays
        recipients = new address[](activeCount);
        sharesBps = new uint256[](activeCount);
        activeStatus = new bool[](activeCount);
        shareIds = new uint256[](activeCount);
        
        // Populate arrays
        uint256 index = 0;
        for (uint256 i = 1; i < nextShareId; i++) {
            RevenueShare memory share = revenueShares[i];
            if (share.active) {
                recipients[index] = share.recipient;
                sharesBps[index] = share.shareBps;
                activeStatus[index] = share.active;
                shareIds[index] = i;
                index++;
            }
        }
        
        return (recipients, sharesBps, activeStatus, shareIds);
    }
    
    /**
     * @dev Get withdrawal receipt details
     */
    function getWithdrawalReceipt(uint256 receiptId) external view returns (
        address withdrawer,
        uint256 amount,
        uint256 timestamp,
        uint256 partnersAmount,
        uint256 adminAmount
    ) {
        WithdrawalReceipt memory receipt = withdrawalReceipts[receiptId];
        return (
            receipt.withdrawer,
            receipt.amount,
            receipt.timestamp,
            receipt.partnersAmount,
            receipt.adminAmount
        );
    }
    
    /**
     * @dev Emergency withdrawal (admin only, bypasses daily limit)
     * Use only in case of security issues
     */
    function emergencyWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(availableBalance() >= amount, "Insufficient balance");
        require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        totalFeesWithdrawn += amount;
        
        require(
            usdcToken.transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit FeeWithdrawn(msg.sender, amount);
    }
}