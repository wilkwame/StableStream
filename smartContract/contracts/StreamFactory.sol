// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PaymentStream.sol";
import "./Treasury.sol";
import "./PlatformTreasury.sol";

/**
 * @title StreamFactory
 * @dev Main entry point for creating and managing payment streams
 * Handles bulk operations, templates, and platform fee collection
 */
contract StreamFactory is AccessControl, Pausable, ReentrancyGuard {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    Treasury public immutable treasury;
    PlatformTreasury public immutable platformTreasury;
   
    
    // Platform fee (in basis points: 50 = 0.5%)
    uint256 public platformFeeBps = 50; // 0.5%
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Stream registry
    mapping(uint256 => address) public streams; // streamId => PaymentStream contract
    mapping(address => uint256[]) public employerStreams; // employer => streamIds
    mapping(address => uint256[]) public employeeStreams; // employee => streamIds
    
    uint256 public nextStreamId = 1;
    
    // Stream templates for common patterns
    struct StreamTemplate {
        string name;
        string description;
        uint256 amountPerSecond;
        uint256 defaultDuration;
        bool active;
        address creator;
        uint256 version;
        uint256 createdAt;
    }
    
    mapping(uint256 => StreamTemplate) public templates;
    uint256 public nextTemplateId = 1;
    
    // Bulk operation limits
    uint256 public maxBulkSize = 100; // Max streams per batch
    uint256 public maxStreamsPerEmployer = 1000;
    
    // Events
    event StreamCreated(
        uint256 indexed streamId,
        address indexed employer,
        address indexed employee,
        address streamContract,
        uint256 amountPerSecond,
        uint256 deposit,
        uint256 fee
    );
    
    event BulkStreamsCreated(
        address indexed employer,
        uint256[] streamIds,
        uint256 totalDeposit,
        uint256 totalFee
    );
    
    event TemplateCreated(
        uint256 indexed templateId,
        string name,
        address indexed creator
    );
    
    event StreamFromTemplate(
        uint256 indexed streamId,
        uint256 indexed templateId
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    event AllStreamsPaused(address indexed employer);
    event AllStreamsResumed(address indexed employer);
    
    constructor(
        address _treasury,
        address _platformTreasury
        
    ) {
        require(_treasury != address(0), "Invalid treasury");
        require(_platformTreasury != address(0), "Invalid platform treasury");
        
        
        treasury = Treasury(_treasury);
        platformTreasury = PlatformTreasury(_platformTreasury);
        
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    
    /**
     * @dev Create a single payment stream
     * @param employee Recipient address
     * @param amountPerSecond Payment rate
     * @param depositAmount Total USDC to deposit
     * @param duration Stream duration (0 for indefinite)
     */
    function createStream(
        address employee,
        uint256 amountPerSecond,
        uint256 depositAmount,
        uint256 duration
    ) external nonReentrant whenNotPaused returns (uint256) {
    uint256 fee = (depositAmount * platformFeeBps) / BPS_DENOMINATOR;
    uint256 totalCost = depositAmount + fee;
    require(treasury.availableBalance(msg.sender) >= totalCost, "Insufficient treasury balance");
        _checkStreamLimit(msg.sender);
        return _createIndividualStream(employee, amountPerSecond, depositAmount, duration);
    }

     /**
     * @dev Grant Treasury permissions to a new stream
     * @param streamAddress The new PaymentStream address
     */
    function _grantStreamPermissions(address streamAddress) internal {
      // Grant the stream contract STREAM_MANAGER_ROLE in Treasury
      address[] memory streamContracts = new address[](1);
      streamContracts[0] = streamAddress;
      treasury.grantStreamManagerToStreams(streamContracts);
    }
    
    /**
     * @dev Internal function to create a single stream
     */
    function _createIndividualStream(
        address employee,
        uint256 amountPerSecond,
        uint256 depositAmount,
        uint256 duration
    ) internal returns (uint256) {
        require(employee != address(0), "Invalid employee");
        require(employee != msg.sender, "Cannot stream to self");
        require(amountPerSecond > 0, "Invalid amount");
        require(depositAmount > 0, "Invalid deposit");
        require(
    treasury.availableBalance(msg.sender) >= depositAmount,
    "Insufficient balance"
);
        
        // Calculate platform fee
        uint256 fee = (depositAmount * platformFeeBps) / BPS_DENOMINATOR;
        uint256 totalCost = depositAmount + fee;
        
        // Check user has sufficient balance in treasury
        require(
            treasury.availableBalance(msg.sender) >= totalCost,
            "Insufficient treasury balance"
        );
        
        // Create stream ID
        uint256 streamId = nextStreamId++;
        
        // Deploy new PaymentStream contract
        PaymentStream newStream = new PaymentStream(
            address(treasury),
            msg.sender,
            employee,
            amountPerSecond,
            depositAmount,
            duration
        );

        _grantStreamPermissions(address(newStream));
        
        // Set stream ID in the PaymentStream contract
        newStream.setStreamId(streamId);
        
        // Register stream
        streams[streamId] = address(newStream);
        employerStreams[msg.sender].push(streamId);
        employeeStreams[employee].push(streamId);
        
        // Allocate funds in treasury (deposit + fee)
        treasury.allocateToStream(streamId, msg.sender, depositAmount);
        
        // Collect platform fee
        if (fee > 0) {
            _collectPlatformFee(streamId, fee, msg.sender);
        }
        
        emit StreamCreated(
            streamId,
            msg.sender,
            employee,
            address(newStream),
            amountPerSecond,
            depositAmount,
            fee
        );
        
        return streamId;
    }
    
    /**
     * @dev Collect platform fee for a stream
     */
   function _collectPlatformFee(uint256 streamId, uint256 fee, address payer) internal {
    if (fee == 0) return;
    uint256 feeStreamId = streamId + 1000000;
    treasury.allocateToStream(feeStreamId, payer, fee);
    treasury.releaseFromStream(feeStreamId, address(platformTreasury), fee);
    platformTreasury.collectFee(streamId, fee);
}
    
    /**
     * @dev Create multiple streams at once (payroll use case)
     * @param employees Array of recipient addresses
     * @param amountsPerSecond Array of payment rates
     * @param depositAmounts Array of deposit amounts
     * @param durations Array of durations
     */
    function createBulkStreams(
    address[] calldata employees,
    uint256[] calldata amountsPerSecond,
    uint256[] calldata depositAmounts,
    uint256[] calldata durations
) external nonReentrant whenNotPaused returns (uint256[] memory) {
    uint256 count = employees.length;
    require(count > 0, "Empty array");
    require(count <= maxBulkSize, "Exceeds max bulk size");
    require(
        count == amountsPerSecond.length &&
        count == depositAmounts.length &&
        count == durations.length,
        "Array length mismatch"
    );

    _checkStreamLimit(msg.sender);

    // Calculate total cost
    (uint256 totalDeposit, uint256 totalFee) = _calculateBulkCost(
        employees,
        amountsPerSecond,
        depositAmounts
    );

    // ONE BALANCE CHECK FOR TOTAL
    require(
    treasury.availableBalance(msg.sender) >= totalDeposit + totalFee,
    "Insufficient treasury balance"
);

    // Deploy all streams
    uint256[] memory streamIds = new uint256[](count);
    uint256 startStreamId = nextStreamId;

    for (uint256 i = 0; i < count; i++) {
        streamIds[i] = startStreamId + i;
        _deployStream(
            streamIds[i],
            employees[i],
            amountsPerSecond[i],
            depositAmounts[i],
            durations[i]
        );
    }

    // Allocate funds and collect fees
    for (uint256 i = 0; i < count; i++) {
        treasury.allocateToStream(streamIds[i], msg.sender, depositAmounts[i]);

        uint256 fee = (depositAmounts[i] * platformFeeBps) / BPS_DENOMINATOR;
        if (fee > 0) {
            _collectPlatformFee(streamIds[i], fee, msg.sender);
        }
    }

    nextStreamId += count;

    emit BulkStreamsCreated(msg.sender, streamIds, totalDeposit, totalFee);

    return streamIds;
}
    
    /**
     * @dev Deploy a stream contract without allocating funds
     */
    function _deployStream(
        uint256 streamId,
        address employee,
        uint256 amountPerSecond,
        uint256 depositAmount,
        uint256 duration
    ) internal {
        PaymentStream newStream = new PaymentStream(
            address(treasury),
            msg.sender,
            employee,
            amountPerSecond,
            depositAmount,
            duration
        );
        
        // Set stream ID immediately
        newStream.setStreamId(streamId);
        
        _grantStreamPermissions(address(newStream));
        streams[streamId] = address(newStream);
        employerStreams[msg.sender].push(streamId);
        employeeStreams[employee].push(streamId);
        
        
        emit StreamCreated(
            streamId,
            msg.sender,
            employee,
            address(newStream),
            amountPerSecond,
            depositAmount,
            (depositAmount * platformFeeBps) / BPS_DENOMINATOR
        );
    }
    
    /**
     * @dev Calculate total cost for bulk stream creation
     */
    function _calculateBulkCost(
        address[] calldata employees,
        uint256[] calldata amountsPerSecond,
        uint256[] calldata depositAmounts
    ) internal view returns (uint256 totalDeposit, uint256 totalFee) {
        uint256 count = employees.length;
        totalDeposit = 0;
        totalFee = 0;
        
        for (uint256 i = 0; i < count; i++) {
            require(employees[i] != address(0), "Invalid employee");
            require(employees[i] != msg.sender, "Cannot stream to self");
            require(amountsPerSecond[i] > 0, "Invalid amount");
            require(depositAmounts[i] > 0, "Invalid deposit");
            
            totalDeposit += depositAmounts[i];
            totalFee += (depositAmounts[i] * platformFeeBps) / BPS_DENOMINATOR;
        }
    }
    
    /**
     * @dev Check if employer has reached stream limit
     */
    function _checkStreamLimit(address employer) internal view {
        require(
            employerStreams[employer].length < maxStreamsPerEmployer,
            "Stream limit reached"
        );
    }
    
    /**
     * @dev Create a stream template for reuse
     * @param name Template name
     * @param description Template description
     * @param amountPerSecond Default payment rate
     * @param defaultDuration Default duration
     */
    function createTemplate(
        string calldata name,
        string calldata description,
        uint256 amountPerSecond,
        uint256 defaultDuration
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(name).length <= 100, "Name too long");
        require(bytes(description).length <= 500, "Description too long");
        require(amountPerSecond > 0, "Invalid amount");
        require(defaultDuration <= 365 days, "Duration too long");
        
        uint256 templateId = nextTemplateId++;
        
        templates[templateId] = StreamTemplate({
            name: name,
            description: description,
            amountPerSecond: amountPerSecond,
            defaultDuration: defaultDuration,
            active: true,
            creator: msg.sender,
            version: 1,
            createdAt: block.timestamp
        });
        
        emit TemplateCreated(templateId, name, msg.sender);
        
        return templateId;
    }
    
    /**
     * @dev Update existing template
     */
    function updateTemplate(
        uint256 templateId,
        uint256 newAmountPerSecond,
        uint256 newDefaultDuration
    ) external {
        StreamTemplate storage template = templates[templateId];
        require(template.creator == msg.sender, "Not template owner");
        require(newAmountPerSecond > 0, "Invalid amount");
        require(newDefaultDuration <= 365 days, "Duration too long");
        
        template.amountPerSecond = newAmountPerSecond;
        template.defaultDuration = newDefaultDuration;
        template.version++;
    }
    
    /**
     * @dev Create stream from template
     * @param templateId Template to use
     * @param employee Recipient
     * @param depositAmount Deposit amount
     */
    function createStreamFromTemplate(
        uint256 templateId,
        address employee,
        uint256 depositAmount
    ) external nonReentrant whenNotPaused returns (uint256) {
        StreamTemplate memory template = templates[templateId];
        require(template.active, "Template not active");
        
        _checkStreamLimit(msg.sender);
        
        uint256 streamId = _createIndividualStream(
            employee,
            template.amountPerSecond,
            depositAmount,
            template.defaultDuration
        );
        
        emit StreamFromTemplate(streamId, templateId);
        
        return streamId;
    }
    
    /**
 * @dev Emergency pause all streams for an employer
 * @param employer The employer whose streams to pause
 */
function pauseAllEmployerStreams(address employer) external {
    require(
        msg.sender == employer || hasRole(ADMIN_ROLE, msg.sender),
        "Not authorized"
    );
    
    uint256[] memory streamIds = employerStreams[employer];
    
    for (uint256 i = 0; i < streamIds.length; i++) {
        address streamAddr = streams[streamIds[i]];
        if (streamAddr != address(0)) {
            // Instead of calling pause() directly (which requires employer),
            // we mark the stream as cancelled or use emergency pause
            PaymentStream stream = PaymentStream(streamAddr);
            if (hasRole(ADMIN_ROLE, msg.sender)) {
                // Admin can use emergency cancel
                stream.emergencyCancel();
            } else {
                // Employer can use regular pause
                stream.pause();
            }
        }
    }
    
    emit AllStreamsPaused(employer);
}
    
    /**
     * @dev Resume all paused streams for an employer
     * @param employer The employer whose streams to resume
     */
    function resumeAllEmployerStreams(address employer) external {
        require(
            msg.sender == employer || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        uint256[] memory streamIds = employerStreams[employer];
        
        for (uint256 i = 0; i < streamIds.length; i++) {
            address streamAddr = streams[streamIds[i]];
            if (streamAddr != address(0)) {
                PaymentStream(streamAddr).unpause();
            }
        }
        
        emit AllStreamsResumed(employer);
    }
    
    /**
     * @dev Emergency cancel a stream (admin only)
     */
    function emergencyCancelStream(uint256 streamId) external onlyRole(ADMIN_ROLE) {
        address streamAddr = streams[streamId];
        require(streamAddr != address(0), "Stream not found");
        
        PaymentStream stream = PaymentStream(streamAddr);
        stream.emergencyCancel();
    }
    
    /**
     * @dev Get all streams for an employer
     */
    function getEmployerStreams(address employer) external view returns (uint256[] memory) {
        return employerStreams[employer];
    }
    
    /**
     * @dev Get all streams for an employee
     */
    function getEmployeeStreams(address employee) external view returns (uint256[] memory) {
        return employeeStreams[employee];
    }
    
    /**
     * @dev Get stream contract address
     */
    function getStreamContract(uint256 streamId) external view returns (address) {
        return streams[streamId];
    }
    
    /**
     * @dev Get stream count for employer
     */
    function getEmployerStreamCount(address employer) external view returns (uint256) {
        return employerStreams[employer].length;
    }
    
    /**
     * @dev Update platform fee (admin only)
     * @param newFeeBps New fee in basis points
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyRole(ADMIN_ROLE) {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @dev Update max bulk size (admin only)
     */
    function updateMaxBulkSize(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax > 0 && newMax <= 1000, "Invalid max size");
        maxBulkSize = newMax;
    }
    
    /**
     * @dev Update max streams per employer (admin only)
     */
    function updateMaxStreamsPerEmployer(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        require(newMax > 0 && newMax <= 10000, "Invalid max streams");
        maxStreamsPerEmployer = newMax;
    }
    
    /**
     * @dev Deactivate template
     */
    function deactivateTemplate(uint256 templateId) external {
        StreamTemplate storage template = templates[templateId];
        require(
            msg.sender == template.creator || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        template.active = false;
    }
    
    /**
     * @dev Emergency pause all operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Initialize treasury roles after deployment
     */
    function initializeTreasuryRoles() external onlyRole(ADMIN_ROLE) {
        treasury.grantStreamManagerRole(address(this));
    }

   
}