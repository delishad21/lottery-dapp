// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

contract Lottery is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
    // Events
    event LotteryEntered(address indexed player);
    event WinnerRequested(uint256 indexed requestId);
    event WinnerDeclared(address indexed winner, uint256 amountWon);

    // Lottery state
    address[] public players;
    address public lastWinner;
    uint256 public lastPrize;

    // Ownership and automation
    address public automationRegistry = 0xCHANGETHIS; // Change this to your own automation registry address

    // Chainlink VRF
    uint256 public s_subscriptionId;
    bytes32 public keyHash =
        0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae; // keyhash for Sepolia testnet gas lane (Visit chainlink to find hash for your network)
    uint32 public callbackGasLimit = 200_000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    mapping(uint256 => bool) public requestFulfilled;

    constructor(uint256 subscriptionId)
        VRFConsumerBaseV2Plus(0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B)
    {
        s_subscriptionId = subscriptionId; // Subscription ID for VRF
    }

    /// @notice Modifier to restrict access to Chainlink Automation or owner
    modifier onlyAuthorized() {
        require(
            msg.sender == automationRegistry || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    /// @notice Enter the lottery by paying 0.01 ETH
    function enterLottery() external payable {
        require(msg.value == 0.01 ether, "Must send exactly 0.01 ETH");
        players.push(msg.sender);
        emit LotteryEntered(msg.sender);
    }

    /// @notice Chainlink Automation checkUpkeep logic
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = players.length > 0 && address(this).balance > 0;
        performData = "";
        return (upkeepNeeded, performData);
    }

    /// @notice Chainlink Automation or owner triggers winner selection
    function performUpkeep(bytes calldata) external override onlyAuthorized {
        require(players.length > 0, "No players");
        require(address(this).balance > 0, "No funds");

        _requestRandomWinner();
    }

    /// @notice Internal function to request random winner
    function _requestRandomWinner() internal {
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
                )
            })
        );

        emit WinnerRequested(requestId);
    }

    /// @notice Chainlink VRF callback
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        require(players.length > 0, "No players");

        uint256 winnerIndex = randomWords[0] % players.length;
        address winner = players[winnerIndex];
        uint256 prize = address(this).balance;

        lastWinner = winner;
        lastPrize = prize;

        requestFulfilled[requestId] = true;
        players = new address[](0) ; // reset

        (bool sent, ) = winner.call{value: prize}("");
        require(sent, "Failed to send prize");

        emit WinnerDeclared(winner, prize);
    }

    /// @notice Returns current players
    function getPlayers() external view returns (address[] memory) {
        return players;
    }
}
