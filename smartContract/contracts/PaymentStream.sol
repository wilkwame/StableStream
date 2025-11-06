// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Treasury.sol";

/**
 * @title PaymentStream
 * @dev Individual payment stream contract (deployed by StreamFactory)
 * Manages continuous USDC streaming from employer to employee
 * Integrates with Treasury for fund management
 */
contract PaymentStream is ReentrancyGuard, Pausable {
    
    Treasury public immutable treasury;
    address public immutable factory;
    address public immutable employer;
    address public immutable employee;
    uint256 public immutable amountPerSecond;
    uint256 public immutable startTime;
    uint256 public immutable stopTime; // 0 = indefinite
    
    uint256 public depositAmount;
    uint256 public lastWithdrawnTime;
    uint256 public totalWithdrawn;
    bool public cancelled;
    
    // Stream ID in the factory (set after deployment)
    uint256 public streamId;
    
    // Events
    event Withdrawn(address indexed employee, uint256 amount, uint256 timestamp);
    event StreamPaused(uint256 timestamp);
    event StreamResumed(uint256 timestamp);
    event StreamCancelled(uint256 refundAmount, uint256 timestamp);
    event DepositAdded(uint256 amount, uint256 timestamp);
    event EmergencyCancelled(uint256 timestamp);
    
    modifier onlyEmployer() {
        require(msg.sender == employer, "Only employer");
        _;
    }
    
    modifier onlyEmployee() {
        require(msg.sender == employee, "Only employee");
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyEmployerOrFactory() {
    require(msg.sender == employer || msg.sender == factory, "Only employer or factory");
    _;
    }
    
    modifier whenActive() {
        require(!cancelled, "Stream cancelled");
        require(isActive(), "Stream not active");
        _;
    }
    
    constructor(
        address _treasury,
        address _employer,
        address _employee,
        uint256 _amountPerSecond,
        uint256 _depositAmount,
        uint256 _duration
    ) {
        require(_treasury != address(0), "Invalid treasury");
        require(_employer != address(0), "Invalid employer");
        require(_employee != address(0), "Invalid employee");
        require(_amountPerSecond > 0, "Invalid amount");
        require(_depositAmount > 0, "Invalid deposit");
        //require(_duration <= 10 * 365 days, "Duration too long"); Max 10 years
        
        treasury = Treasury(_treasury);
        factory = msg.sender; // Set deployer as factory
        employer = _employer;
        employee = _employee;
        amountPerSecond = _amountPerSecond;
        depositAmount = _depositAmount;
        startTime = block.timestamp;
        stopTime = _duration > 0 ? block.timestamp + _duration : 0;
        lastWithdrawnTime = block.timestamp;
    }
    
    /**
     * @dev Set stream ID (called by factory after deployment)
     */
    function setStreamId(uint256 _streamId) external onlyFactory {
        require(streamId == 0, "Already set");
        streamId = _streamId;
    }
    
    /**
     * @dev Calculate withdrawable balance for employee
     */
    function balanceOf() public view returns (uint256) {
        if (cancelled || paused()) {
            return 0;
        }
        
        uint256 currentTime = block.timestamp;
        
        // Safety check for time going backwards (shouldn't happen but protects against edge cases)
        if (currentTime < lastWithdrawnTime) {
            return 0;
        }
        
        // Check if stream has ended by time
        if (stopTime > 0 && currentTime > stopTime) {
            currentTime = stopTime;
        }
        
        // Check if stream has ended by deposit exhaustion
        if (totalWithdrawn >= depositAmount) {
            return 0;
        }
        
        // Calculate time elapsed since last withdrawal
        uint256 elapsed = currentTime - lastWithdrawnTime;
        uint256 earned = elapsed * amountPerSecond;
        
        // Calculate remaining deposit
        uint256 remaining = depositAmount - totalWithdrawn;
        
        // Return minimum of earned and remaining
        return earned > remaining ? remaining : earned;
    }
    
    /**
     * @dev Employee withdraws available funds
     */
    function withdraw() external onlyEmployee nonReentrant whenNotPaused whenActive {
        uint256 amount = balanceOf();
        require(amount > 0, "Nothing to withdraw");
        
        // Update state before external call (Checks-Effects-Interactions pattern)
        lastWithdrawnTime = block.timestamp;
        totalWithdrawn += amount;
        
        // Release funds from treasury to employee
        treasury.releaseFromStream(streamId, employee, amount);
        
        emit Withdrawn(employee, amount, block.timestamp);
        
        // Auto-mark as cancelled if stream is completed
        if (isCompleted()) {
            
        }
    }
    
    /**
     * @dev Employer adds more funds to stream
     * @param amount Additional USDC to add
     */
    function addDeposit(uint256 amount) external onlyEmployer nonReentrant whenNotPaused {
        require(!cancelled, "Stream cancelled");
        require(amount > 0, "Amount must be positive");
        require(amount <= 1e9 * 1e6, "Amount too large"); // Max 1 billion USDC
        
        // Check employer has sufficient balance in treasury
        require(
            treasury.availableBalance(employer) >= amount,
            "Insufficient treasury balance"
        );
        
        // Allocate additional funds to this stream
        treasury.allocateToStream(streamId, employer, amount);
        depositAmount += amount;
        
        emit DepositAdded(amount, block.timestamp);
    }
    
    /**
 * @dev Employer cancels stream and returns remaining funds
 */
function cancel() external onlyEmployer nonReentrant {
    require(!cancelled, "Already cancelled");
    
    cancelled = true;
    
    // Calculate what employee has earned but not withdrawn
    uint256 employeeOwed = balanceOf();
    
    // Pay employee what they're owed
    if (employeeOwed > 0) {
        treasury.releaseFromStream(streamId, employee, employeeOwed);
        totalWithdrawn += employeeOwed;
    }
    
    // Calculate refund for employer
    uint256 refund = depositAmount > totalWithdrawn 
        ? depositAmount - totalWithdrawn 
        : 0;
    
    // Return unused funds to employer's treasury balance
    if (refund > 0) {
        treasury.returnFromStream(streamId, refund);
    }
    
    emit StreamCancelled(refund, block.timestamp);
}
    
    /**
     * @dev Emergency cancel by factory (for security incidents)
     */
    function emergencyCancel() external onlyFactory nonReentrant {
        require(!cancelled, "Already cancelled");
        
        cancelled = true;
        
        // Return all remaining funds to employer (no payment to employee)
        uint256 remaining = depositAmount - totalWithdrawn;
        if (remaining > 0) {
            treasury.returnFromStream(streamId, remaining);
        }
        
        emit EmergencyCancelled(block.timestamp);
        emit StreamCancelled(remaining, block.timestamp);
    }
    
    /**
     * @dev Pause stream (employer only)
     */
    function pause() external onlyEmployerOrFactory {
        _pause();
        emit StreamPaused(block.timestamp);
    }
    
    /**
     * @dev Resume stream (employer only)
     */
    function unpause() external onlyEmployerOrFactory {
        _unpause();
        
        // Update last withdrawn time to prevent retroactive earning during pause
        lastWithdrawnTime = block.timestamp;
        
        emit StreamResumed(block.timestamp);
    }
    
    /**
     * @dev Check if stream is fully paid out or expired
     */
    function isCompleted() public view returns (bool) {
        return totalWithdrawn >= depositAmount || 
               (stopTime > 0 && block.timestamp >= stopTime);
    }
    
    /**
     * @dev Check if stream is active
     */
    function isActive() public view returns (bool) {
        if (cancelled || paused()) {
            return false;
        }
        
        if (isCompleted()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get complete stream details
     */
    function getStreamInfo() external view returns (
        address _employer,
        address _employee,
        uint256 _amountPerSecond,
        uint256 _startTime,
        uint256 _stopTime,
        uint256 _depositAmount,
        uint256 _totalWithdrawn,
        uint256 _withdrawable,
        bool _cancelled,
        bool _paused,
        bool _active,
        bool _completed
    ) {
        return (
            employer,
            employee,
            amountPerSecond,
            startTime,
            stopTime,
            depositAmount,
            totalWithdrawn,
            balanceOf(),
            cancelled,
            paused(),
            isActive(),
            isCompleted()
        );
    }
    
    /**
     * @dev Get detailed stream timeline information
     */
    function getStreamTimeline() external view returns (
        uint256 elapsed,
        uint256 remaining,
        uint256 totalEarned,
        uint256 withdrawable,
        uint256 streamDuration
    ) {
        uint256 currentTime = block.timestamp;
        uint256 endTime = stopTime > 0 ? stopTime : type(uint256).max;
        
        elapsed = currentTime > startTime ? currentTime - startTime : 0;
        remaining = endTime > currentTime ? endTime - currentTime : 0;
        
        // Calculate total earned since start (capped at deposit)
        uint256 totalPossibleEarned = elapsed * amountPerSecond;
        totalEarned = totalPossibleEarned > depositAmount ? depositAmount : totalPossibleEarned;
        
        withdrawable = balanceOf();
        streamDuration = stopTime > 0 ? stopTime - startTime : 0;
        
        return (elapsed, remaining, totalEarned, withdrawable, streamDuration);
    }
    
    /**
     * @dev Get remaining balance in stream
     */
    function remainingBalance() external view returns (uint256) {
        if (depositAmount > totalWithdrawn) {
            return depositAmount - totalWithdrawn;
        }
        return 0;
    }
    
    /**
     * @dev Calculate total duration (0 for indefinite)
     */
    function duration() external view returns (uint256) {
        if (stopTime == 0) {
            return 0; // Indefinite
        }
        return stopTime - startTime;
    }
    
    /**
     * @dev Calculate percentage of stream completed
     */
    function percentComplete() external view returns (uint256) {
        if (depositAmount == 0) {
            return 0;
        }
        
        // Cap at 100%
        uint256 percentage = (totalWithdrawn * 100) / depositAmount;
        return percentage > 100 ? 100 : percentage;
    }
    
    /**
     * @dev Calculate time until next payment is available
     */
    function timeUntilNextPayment() external view returns (uint256) {
        if (!isActive()) {
            return 0;
        }
        
        uint256 currentTime = block.timestamp;
        //uint256 timeSinceLastWithdrawal = currentTime - lastWithdrawnTime;
        
        // If we already have some balance available, next payment is immediate
        if (balanceOf() > 0) {
            return 0;
        }
        
        // Calculate when next payment will be available
        uint256 timeForNextPayment = (1 ether / amountPerSecond); // Time for 1 USDC in seconds
        
        // If stream is time-limited, check if we'll reach the end first
        if (stopTime > 0) {
            uint256 timeUntilEnd = stopTime > currentTime ? stopTime - currentTime : 0;
            return timeForNextPayment < timeUntilEnd ? timeForNextPayment : timeUntilEnd;
        }
        
        return timeForNextPayment;
    }
    
    /**
     * @dev Estimate completion time based on current rate
     */
    function estimatedCompletionTime() external view returns (uint256) {
        if (isCompleted()) {
            return block.timestamp;
        }
        
        uint256 remainingFunds = depositAmount - totalWithdrawn;
        uint256 timeToComplete = remainingFunds / amountPerSecond;
        
        uint256 estimatedTime = block.timestamp + timeToComplete;
        
        // If time-limited, return the earlier of estimated time or stop time
        if (stopTime > 0 && stopTime < estimatedTime) {
            return stopTime;
        }
        
        return estimatedTime;
    }
}