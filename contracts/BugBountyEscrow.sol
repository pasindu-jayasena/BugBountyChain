// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BugBountyEscrow
 * @notice Escrow for funded vulnerability bounties with on-chain report commitments.
 * @dev Maintainers lock ETH. Researchers commit SHA-256(report) without revealing details.
 *      Maintainers release funds after off-chain verification of the matching report.
 */
contract BugBountyEscrow {
    enum BountyStatus {
        Active,
        ClaimSubmitted,
        Resolved,
        Cancelled
    }

    struct Bounty {
        uint256 id;
        address payable maintainer;
        string title;
        string description;
        uint256 amount;
        uint256 deadline;
        BountyStatus status;
        address payable researcher;
        bytes32 reportHash;
        uint256 submissionTimestamp;
    }

    uint256 public bountyCounter;
    mapping(uint256 => Bounty) public bounties;

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed maintainer,
        string title,
        uint256 amount,
        uint256 deadline
    );
    event ReportSubmitted(
        uint256 indexed bountyId,
        address indexed researcher,
        bytes32 reportHash,
        uint256 timestamp
    );
    event PayoutReleased(
        uint256 indexed bountyId,
        address indexed researcher,
        uint256 amount
    );
    event BountyCancelled(
        uint256 indexed bountyId,
        address indexed maintainer,
        uint256 amountRefunded
    );

    modifier onlyMaintainer(uint256 _bountyId) {
        require(
            msg.sender == bounties[_bountyId].maintainer,
            "Only bounty maintainer"
        );
        _;
    }

    function createBounty(
        string calldata _title,
        string calldata _description,
        uint256 _durationInDays
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must deposit ETH");
        require(_durationInDays > 0, "Duration must be at least 1 day");
        require(bytes(_title).length > 0, "Title required");

        uint256 bountyId = ++bountyCounter;
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);

        bounties[bountyId] = Bounty({
            id: bountyId,
            maintainer: payable(msg.sender),
            title: _title,
            description: _description,
            amount: msg.value,
            deadline: deadline,
            status: BountyStatus.Active,
            researcher: payable(address(0)),
            reportHash: bytes32(0),
            submissionTimestamp: 0
        });

        emit BountyCreated(bountyId, msg.sender, _title, msg.value, deadline);
        return bountyId;
    }

    function submitReportHash(
        uint256 _bountyId,
        bytes32 _reportHash
    ) external {
        Bounty storage bounty = bounties[_bountyId];
        require(bounty.id != 0, "Bounty does not exist");
        require(bounty.status == BountyStatus.Active, "Bounty not active");
        require(block.timestamp <= bounty.deadline, "Deadline passed");
        require(_reportHash != bytes32(0), "Invalid report hash");
        require(
            msg.sender != bounty.maintainer,
            "Maintainer cannot submit own bounty"
        );

        bounty.status = BountyStatus.ClaimSubmitted;
        bounty.researcher = payable(msg.sender);
        bounty.reportHash = _reportHash;
        bounty.submissionTimestamp = block.timestamp;

        emit ReportSubmitted(
            _bountyId,
            msg.sender,
            _reportHash,
            block.timestamp
        );
    }

    function releasePayout(
        uint256 _bountyId,
        bytes32 _confirmedHash
    ) external onlyMaintainer(_bountyId) {
        Bounty storage bounty = bounties[_bountyId];
        require(
            bounty.status == BountyStatus.ClaimSubmitted,
            "No claim to review"
        );
        require(
            bounty.reportHash == _confirmedHash,
            "Hash does not match claim"
        );

        uint256 payoutAmount = bounty.amount;
        address payable recipient = bounty.researcher;

        bounty.status = BountyStatus.Resolved;
        bounty.amount = 0;

        (bool success, ) = recipient.call{value: payoutAmount}("");
        require(success, "Payout transfer failed");

        emit PayoutReleased(_bountyId, recipient, payoutAmount);
    }

    function cancelBounty(
        uint256 _bountyId
    ) external onlyMaintainer(_bountyId) {
        Bounty storage bounty = bounties[_bountyId];
        require(bounty.status == BountyStatus.Active, "Not an active bounty");
        require(block.timestamp > bounty.deadline, "Deadline not reached");

        uint256 refundAmount = bounty.amount;

        bounty.status = BountyStatus.Cancelled;
        bounty.amount = 0;

        (bool success, ) = bounty.maintainer.call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit BountyCancelled(_bountyId, bounty.maintainer, refundAmount);
    }

    function getBounty(
        uint256 _bountyId
    ) external view returns (Bounty memory) {
        return bounties[_bountyId];
    }

    function getBounties(
        uint256 _fromId,
        uint256 _toId
    ) external view returns (Bounty[] memory list) {
        require(_fromId >= 1, "Invalid from id");
        require(_toId >= _fromId, "Invalid range");
        require(_toId <= bountyCounter, "toId exceeds counter");

        uint256 len = _toId - _fromId + 1;
        list = new Bounty[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = bounties[_fromId + i];
        }
    }
}
