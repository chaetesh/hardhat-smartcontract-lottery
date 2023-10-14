// Lottery
// Enter the lottery by paying some amount
// Pick a random winner (verifiably random)
// Winner to be selected every X Minutes should be completely automated
// Using ChainLink Oracle to get Randomness & Automated execution using chainLink Keepers

pragma solidity ^0.8.7;
// SPDX-License-Identifier: MIT
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance,uint256 numPlayers, uint256 raffleState);

/*
    @title A Lottery Smart Contract
    @notice This Contract is for creating untamperable decentralized smart contract
    @dev This implements Chainklink VRF v2 and Chainlink Keepers
 */

// extending the contract VRF
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {

    // Type Declarations
    enum RaffleState{
        OPEN,
        CALCULATING
    }

    // Storage variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;
    bool private s_UpkeepNeeded;

    //  Its information and values are saved as part of the transactions inside the block.
    // https://www.geeksforgeeks.org/what-are-events-in-solidity/
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner); // will store winners here

    constructor(uint256 entranceFee,address vrfCoordinatorV2, bytes32 gasLane, uint64 subscriptionId, uint32 callbackGasLimit, uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    // Enter the lottery game by paying some amount
    function enterRaffle() public payable{
        // This takes up more gas as it needs to store the error string on chain storage
        // require(msg.value > i_entranceFee, "Not Enough ETH!")
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if(s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        // Emit an event when we update a dynamic array
        emit RaffleEnter(msg.sender);
    }

    // We are using chainlink Keepers, which automatically call the smartcontract in regular time intervals
    // to return true following conditions must pass
    // our time interval should have passed
    // the lottery should have atleast 1 player and have some ETH
    // our subscription is funded with link
    // the lottery should be in "open" state (when we are in process of getting winners, it should be in closed state)
    function checkUpkeep(bytes memory /*checkData*/) public override returns(bool upKeepNeeded,bytes memory /*performData*/){
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        // current block.timestamp - previos block.timestamp > integer
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        // Checking all above conditions passed
        upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        s_UpkeepNeeded = upKeepNeeded;
        return (upKeepNeeded, "0x0");
    }

    // external is cheaper than public, we use this as we are calling other contract
    function performUpkeep(bytes calldata /*performData*/) external override{
        (bool upKeepNeeded,) = checkUpkeep("");
        if(!upKeepNeeded){
            revert Raffle__UpkeepNotNeeded(address(this).balance,s_players.length,uint256(s_raffleState));
        }

        // Request the random Number
        // Once we get it, Work with it
        // 2 transaction process
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // gasLane, stores the max gasLimit
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS // number of random words 
        );
        emit RequestedRaffleWinner(requestId);
    }

    // overriding VRF contract, function used to get the winner and and pay them
    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override{
        // Getting index of winner using modulo as random num is 265bit and we want only our participants length
        uint256 indexOfWinner = randomWords[0] % s_players.length; 
        address payable recent_winner = s_players[indexOfWinner]; //address of winner
        s_recentWinner = recent_winner;
        s_raffleState = RaffleState.OPEN;

        // Resetting the players array after selecting winner & timeStap too
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success,) = recent_winner.call{value: address(this).balance}(""); // paying to winner
        // require(success) costs more gas so using error
        if(!success){
            revert Raffle__TransferFailed(); 
        }

        emit WinnerPicked(recent_winner);
    }


    // View/Pure Functions
    function getEntranceFee() public view returns(uint256){
        return i_entranceFee;
    }
    function getPlayer(uint256 index) public view returns(address){
        return s_players[index];
    }
    function getRecentWinner() public view returns(address) {
        return s_recentWinner;
    }
    function getRaffleState() public view returns(RaffleState){
        return s_raffleState;
    }
    function getNumberOfPlayers() public view returns(uint256){
        return s_players.length;
    }
    function getLatestTimeStamp() public view returns(uint256){
        return s_lastTimeStamp;
    } 
    function getInterval() public view returns(uint256){
        return i_interval;
    } 
    function getUpKeep() public view returns(bool){
        return s_UpkeepNeeded;
    } 
    function getSubscriptionId() public view returns(uint64){
        return i_subscriptionId;
    } 
}