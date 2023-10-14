// HARDHAT WAFFLE IS NOT WORKING THATS WHY EXPECT & TOBEREVERTEDWITH ARE NOT WORKING
// MIGRATE TO HARDHAT TOOL BOX, READ DOCUMENTATION FOR MORE DETAILS
// https://hardhat.org/hardhat-runner/docs/guides/migrating-from-hardhat-waffle
// https://hardhat.org/tutorial/testing-contracts

const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const {
  networkConfig,
  developmentChains,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", async () => {
      let raffle, VRFCoordinatorV2Mock, raffleEnteranceFee, deployer, interval;
      const chainId = network.config.chainId;

      // This is the first to be executed
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]); // All the deployments scripts will execute
        // Getting the deployed scripts
        raffle = await ethers.getContract("Raffle", deployer);
        VRFCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        raffleEnteranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe("constructor", async () => {
        it("Initializes the raffle Correctly", async function () {
          // generally we make one assert per "it"
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "0"); // Raffle should start with open state

          const interval = await raffle.getInterval();
          assert.equal(interval, networkConfig[chainId]["interval"]);
        });
      });

      describe("enterRaffle", async () => {
        // it("Reverts When you don't pay Enough",async function(){
        //     await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered");
        // })
        it("records players when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEnteranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });
        // it("emits event on enter",async function(){
        //     await expect(raffle.enterRaffle({value:raffleEnteranceFee})).to.emit(raffle,"RaffleEnter");
        // })
        it("doesn't allow enterance when raffle is calculating", async function () {
          await raffle.enterRaffle({ value: raffleEnteranceFee });
          // This is hardhat method to speedUp the time
          await network.provider.send("evm_increaseTime", [31]);
          await network.provider.send("evm_mine", []); // To mine one extra block
          await raffle.performUpkeep("0x"); // this will return if checkUpkeep is true, and it will be true as we increased time and mined a block

          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "1");
        });
      });

      describe("checkUpkeep", async () => {
        it("returns false if people haven't sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [31]);
          await network.provider.send("evm_mine", []);
          const { upKeepNeeded } = await raffle.checkUpkeep("0x");
          assert(!upKeepNeeded);
        });

        it("returns false if raffle isn't open", async function () {
          await raffle.enterRaffle({ value: raffleEnteranceFee });
          await network.provider.send("evm_increaseTime", [31]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x"); // makes raffle closed
          const raffleState = await raffle.getRaffleState();
          await raffle.checkUpkeep("0x");
          const upKeepNeeded = await raffle.getUpKeep();
          assert.equal(raffleState.toString(), "1"); // raffle in closed state
          assert.equal(upKeepNeeded, false);
        });
      });

      it("returns false if enough time hasn't passed", async function () {
        await raffle.enterRaffle({ value: raffleEnteranceFee });
        await raffle.checkUpkeep("0x");
        const upKeepNeeded = await raffle.getUpKeep();

        assert.equal(upKeepNeeded, false);
      });

      it("returns true if enough time has passed, has players and eth", async function () {
        await raffle.enterRaffle({ value: raffleEnteranceFee });
        await network.provider.send("evm_increaseTime", [31]);
        await network.provider.send("evm_mine", []);

        await raffle.checkUpkeep("0x");
        const upKeepNeeded = await raffle.getUpKeep();
        assert.equal(upKeepNeeded, true);
      });

      describe("performUpkeep", () => {
        it("it can only run if checkUpKeep is true", async function () {
          await raffle.enterRaffle({ value: raffleEnteranceFee });
          await network.provider.send("evm_increaseTime", [31]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep("0x");
          assert(tx);
        });

        it("updates the raffle state, emits an event and call the vrfs coordinator function", async function () {
          await raffle.enterRaffle({ value: raffleEnteranceFee });
          await network.provider.send("evm_increaseTime", [31]);
          await network.provider.send("evm_mine", []);

          const txResponse = await raffle.performUpkeep("0x");
          const txRecipet = await txResponse.wait(1);
          const requestId = txRecipet.logs[1].args.requestId;
          assert(requestId > 0);

          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "1"); // Raffle should start in closed state
        });
      });

      // testing fullfillRandomWords
      describe("fullfillRandomWords", () => {
        // should enter atleast 1 person in lottery,
        beforeEach(async function () {
          await raffle.enterRaffle({ value: raffleEnteranceFee });
          await network.provider.send("evm_increaseTime", [31]);
          await network.provider.send("evm_mine", []);
        });

        it("Can only be called after performUpkeep, as it generates requestID", async function () {
          // Gives error as performUpkeep is not called
          // await expect(VRFCoordinatorV2Mock.fulfillRandomWords(0,raffle["runner"].address)).to.be.revertedWith(raffle,'nonexistent request');
        });

        it("Picks a winner, resets the lottery and sends the money", async function () {
          const additionalEntrants = 3;
          const startingIndex = 1; // deployer = 0
          const accounts = await ethers.getSigners();

          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrants;
            i++
          ) {
            // Connecting 3 additional users to our raffle
            const accountConnectedRaffle = raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({
              value: raffleEnteranceFee,
            });
          }
          const startingTimeStamp = await raffle.getLatestTimeStamp();

          // performUpkeep (mock being chainlink keepers)
          // fulffillRandomWords (mock doing the Chainlink VRF stuff)
          // We will have to wait for the fullfillRandomWords to be called

          await new Promise(async (resolve, reject) => {
            // Rest of the code down will be continue executing
            // Only When the WinnerPicked event is emited, this event listner fires up
            raffle.once("WinnerPicked", async () => {
              console.log("Found the event!!!");
              try {
                const recentWinner = await raffle.getRecentWinner();
                console.log(recentWinner);
                console.log(accounts[0].address);
                console.log(accounts[1].address);
                console.log(accounts[2].address);
                console.log(accounts[3].address);
                const raffleState = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimeStamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                const winnerEndingBalance = await accounts[1].getBalance();

                assert(numPlayers.toString(), "0");
                assert(raffleState.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);

                // Winner should have this balance
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(
                    raffleEnteranceFee
                      .mul(additionalEntrants)
                      .add(raffleEnteranceFee)
                      .toString()
                  )
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            const tx = await raffle.performUpkeep("0x");
            const txRecipet = await tx.wait(1);
            const winnerStartingBalance = await accounts[1].getBalance();
            await VRFCoordinatorV2Mock.fulfillRandomWords(txRecipet.logs[1].args.requestId, raffle["runner"].address);
          });
        });
      });
    });
