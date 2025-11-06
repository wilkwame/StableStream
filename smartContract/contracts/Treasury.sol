// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Treasury
 * @dev Central vault for all USDC deposits and stream funding
 * Implements multi-signature support for enterprise accounts
 */
contract Treasury is ReentrancyGuard, AccessControl, Pausable {
    
    bytes32 public constant STREAM_MANAGER_ROLE = keccak256("STREAM_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    IERC20 public immutable usdcToken;
    
    // User balances (available for creating streams)
    mapping(address => uint256) public userBalances;
    
    // Locked balances (allocated to active streams)
    mapping(address => uint256) public lockedBalances;
    
    // Stream allocations (streamId => amount locked)
    mapping(uint256 => uint256) public streamAllocations;
    
    // Stream owners (streamId => owner address)
    mapping(uint256 => address) public streamOwners;

    mapping(uint256 => address) public streamContracts;
    
    // Multi-signature settings per user
    struct MultiSigSettings {
        bool enabled;
        uint256 requiredSignatures;
        address[] signers;
        mapping(address => bool) isSigner;
    }
    
    mapping(address => MultiSigSettings) private multiSigSettings;
    
    // Pending multi-sig withdrawals
    struct PendingWithdrawal {
        address user;
        uint256 amount;
        uint256 confirmations;
        mapping(address => bool) hasConfirmed;
        bool executed;
        uint256 timestamp;
    }
    
    mapping(uint256 => PendingWithdrawal) public pendingWithdrawals;
    uint256 public nextWithdrawalId;
    
    // Withdrawal timeout (security feature)
    uint256 public constant WITHDRAWAL_TIMEOUT = 7 days;
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event AllocatedToStream(uint256 indexed streamId, address indexed owner, uint256 amount);
    event ReleasedFromStream(uint256 indexed streamId, uint256 amount);
    event MultiSigEnabled(address indexed user, uint256 requiredSignatures);
    event WithdrawalProposed(uint256 indexed withdrawalId, address indexed user, uint256 amount);
    event WithdrawalConfirmed(uint256 indexed withdrawalId, address indexed signer);
    event WithdrawalExecuted(uint256 indexed withdrawalId);
    event WithdrawalCancelled(uint256 indexed withdrawalId);
    
    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        nextWithdrawalId = 1;
    }
    
    /**
     * @dev Deposit USDC into treasury
     * @param amount Amount of USDC to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        
        // Transfer USDC from user to treasury
        require(
            usdcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userBalances[msg.sender] += amount;
        
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @dev Withdraw USDC from treasury (handles multi-sig if enabled)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");
        
        // Check if user has multi-sig enabled
        if (multiSigSettings[msg.sender].enabled) {
            // Create pending withdrawal for multi-sig approval
            uint256 withdrawalId = nextWithdrawalId++;
            
            // Initialize the pending withdrawal properly
            PendingWithdrawal storage pending = pendingWithdrawals[withdrawalId];
            pending.user = msg.sender;
            pending.amount = amount;
            pending.timestamp = block.timestamp;
            pending.confirmations = 0;
            pending.executed = false;
            
            emit WithdrawalProposed(withdrawalId, msg.sender, amount);
            
            // Auto-confirm from initiator if they're a signer
            if (multiSigSettings[msg.sender].isSigner[msg.sender]) {
                _confirmWithdrawal(withdrawalId);
            }
        } else {
            // Direct withdrawal for non-multi-sig accounts
            _executeWithdrawal(msg.sender, amount);
        }
    }
    
    /**
     * @dev Confirm a pending multi-sig withdrawal
     * @param withdrawalId The withdrawal to confirm
     */
    function confirmWithdrawal(uint256 withdrawalId) external nonReentrant {
        _confirmWithdrawal(withdrawalId);
    }
    
    function _confirmWithdrawal(uint256 withdrawalId) internal {
        PendingWithdrawal storage pending = pendingWithdrawals[withdrawalId];
        
        require(!pending.executed, "Already executed");
        require(pending.user != address(0), "Invalid withdrawal");
        require(block.timestamp <= pending.timestamp + WITHDRAWAL_TIMEOUT, "Withdrawal expired");
        require(
            multiSigSettings[pending.user].isSigner[msg.sender],
            "Not a signer"
        );
        require(!pending.hasConfirmed[msg.sender], "Already confirmed");
        
        pending.hasConfirmed[msg.sender] = true;
        pending.confirmations++;
        
        emit WithdrawalConfirmed(withdrawalId, msg.sender);
        
        // Execute if threshold reached
        if (pending.confirmations >= multiSigSettings[pending.user].requiredSignatures) {
            pending.executed = true;
            _executeWithdrawal(pending.user, pending.amount);
            emit WithdrawalExecuted(withdrawalId);
        }
    }
    
    /**
     * @dev Cancel expired withdrawal
     * @param withdrawalId The withdrawal to cancel
     */
    function cancelExpiredWithdrawal(uint256 withdrawalId) external {
        PendingWithdrawal storage pending = pendingWithdrawals[withdrawalId];
        require(pending.user == msg.sender, "Not your withdrawal");
        require(!pending.executed, "Already executed");
        require(block.timestamp > pending.timestamp + WITHDRAWAL_TIMEOUT, "Not expired");
        
        delete pendingWithdrawals[withdrawalId];
        
        emit WithdrawalCancelled(withdrawalId);
    }
    
    function _executeWithdrawal(address user, uint256 amount) internal {
        userBalances[user] -= amount;
        
        require(usdcToken.transfer(user, amount), "Transfer failed");
        
        emit Withdrawn(user, amount);
    }
    
    /**
     * @dev Allocate funds from user balance to a stream
     * @param streamId The stream ID
     * @param owner The stream owner
     * @param amount Amount to lock
     */
    function allocateToStream(
        uint256 streamId,
        address owner,
        uint256 amount
    ) external onlyRole(STREAM_MANAGER_ROLE) nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(userBalances[owner] >= amount, "Insufficient balance");
        require(streamAllocations[streamId] == 0, "Stream already allocated");
        
        userBalances[owner] -= amount;
        lockedBalances[owner] += amount;
        streamAllocations[streamId] = amount;
        streamOwners[streamId] = owner;
        streamContracts[streamId] = msg.sender;
        
        emit AllocatedToStream(streamId, owner, amount);
    }
    
    /**
     * @dev Release funds from a stream (for withdrawal to employee)
     * @param streamId The stream ID
     * @param recipient Who receives the funds
     * @param amount Amount to release
     */
    function releaseFromStream(
        uint256 streamId,
        address recipient,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        // Allow StreamManager OR the PaymentStream contract itself
        require(
            hasRole(STREAM_MANAGER_ROLE, msg.sender) || 
            _isValidStreamCall(streamId),
            "Unauthorized"
        );
        require(amount > 0, "Amount must be positive");
        require(streamAllocations[streamId] >= amount, "Insufficient allocation");
        
        address owner = streamOwners[streamId];
        
        streamAllocations[streamId] -= amount;
        lockedBalances[owner] -= amount;
        
        require(usdcToken.transfer(recipient, amount), "Transfer failed");
        
        emit ReleasedFromStream(streamId, amount);
    }
    
    /**
     * @dev Return unspent funds from cancelled stream back to owner
     * @param streamId The stream ID
     * @param amount Amount to return
     */
    function returnFromStream(
        uint256 streamId,
        uint256 amount
    ) external nonReentrant {
        // Allow StreamManager OR the PaymentStream contract itself
        require(
            hasRole(STREAM_MANAGER_ROLE, msg.sender) || 
            _isValidStreamCall(streamId),
            "Unauthorized"
        );
        require(streamAllocations[streamId] >= amount, "Insufficient allocation");
        
        address owner = streamOwners[streamId];
        
        streamAllocations[streamId] -= amount;
        lockedBalances[owner] -= amount;
        userBalances[owner] += amount;
        
        emit ReleasedFromStream(streamId, amount);
    }
    
    /**
     * @dev Check if the caller is a valid PaymentStream contract
     */
    function _isValidStreamCall(uint256 streamId) internal view returns (bool) {
        // In a real implementation, you might want to verify the caller is a deployed PaymentStream
        // For now, we'll allow any caller that provides a valid streamId with allocated funds
        //return streamAllocations[streamId] > 0;
        return streamContracts[streamId] == msg.sender && streamAllocations[streamId] > 0;
    }
    
    /**
     * @dev Grant stream manager role to multiple PaymentStream contracts
     * @param streamAddresses Array of PaymentStream contract addresses
     */
    function grantStreamManagerToStreams(address[] calldata streamAddresses) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < streamAddresses.length; i++) {
            grantRole(STREAM_MANAGER_ROLE, streamAddresses[i]);
        }
    }
    
    /**
     * @dev Set up multi-signature for account
     * @param requiredSignatures Number of signatures needed
     * @param signers Array of authorized signer addresses
     */
    function enableMultiSig(
        uint256 requiredSignatures,
        address[] calldata signers
    ) external {
        require(requiredSignatures > 0, "Must require at least 1 signature");
        require(signers.length >= requiredSignatures, "Not enough signers");
        require(signers.length <= 10, "Too many signers");
        require(!multiSigSettings[msg.sender].enabled, "Already enabled");
        
        // Check for duplicates and valid addresses
        for (uint256 i = 0; i < signers.length; i++) {
            require(signers[i] != address(0), "Invalid signer");
            for (uint256 j = i + 1; j < signers.length; j++) {
                require(signers[i] != signers[j], "Duplicate signer");
            }
        }
        
        MultiSigSettings storage settings = multiSigSettings[msg.sender];
        settings.enabled = true;
        settings.requiredSignatures = requiredSignatures;
        settings.signers = signers;
        
        for (uint256 i = 0; i < signers.length; i++) {
            settings.isSigner[signers[i]] = true;
        }
        
        emit MultiSigEnabled(msg.sender, requiredSignatures);
    }
    
    /**
     * @dev Get available balance (not locked in streams)
     * @param user The user to check
     */
    function availableBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    /**
     * @dev Get total balance (available + locked)
     * @param user The user to check
     */
    function totalBalance(address user) external view returns (uint256) {
        return userBalances[user] + lockedBalances[user];
    }
    
    /**
     * @dev Check if multi-sig is enabled for user
     * @param user The user to check
     */
    function isMultiSigEnabled(address user) external view returns (bool) {
        return multiSigSettings[user].enabled;
    }
    
    /**
     * @dev Get multi-sig settings for user
     * @param user The user to check
     */
    function getMultiSigSettings(address user) external view returns (
        bool enabled,
        uint256 requiredSignatures,
        address[] memory signers
    ) {
        MultiSigSettings storage settings = multiSigSettings[user];
        enabled = settings.enabled;
        requiredSignatures = settings.requiredSignatures;
        
        // Create new array to return (can't return storage array)
        signers = new address[](settings.signers.length);
        for (uint256 i = 0; i < settings.signers.length; i++) {
            signers[i] = settings.signers[i];
        }
    }
    
    /**
     * @dev Get pending withdrawal details
     * @param withdrawalId The withdrawal ID
     */
    function getPendingWithdrawal(uint256 withdrawalId) external view returns (
        address user,
        uint256 amount,
        uint256 confirmations,
        uint256 timestamp,
        bool executed
    ) {
        PendingWithdrawal storage pending = pendingWithdrawals[withdrawalId];
        return (
            pending.user,
            pending.amount,
            pending.confirmations,
            pending.timestamp,
            pending.executed
        );
    }
    
    /**
     * @dev Emergency recovery of tokens (admin only)
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecoverToken(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(usdcToken), "Cannot recover USDC");
        IERC20(token).transfer(msg.sender, amount);
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Grant stream manager role to StreamFactory
     * @param streamManager Address of StreamFactory contract
     */
    function grantStreamManagerRole(address streamManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(STREAM_MANAGER_ROLE, streamManager);
    }
}