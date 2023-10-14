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

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", async () => {
      let raffle, raffleEnteranceFee, deployer;

      // This is the first to be executed
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        console.log(deployer);
        raffle = await ethers.getContractAt(
          "Raffle",
          "0x7190C3e8Cc4d55F10eFD271339F53ecFd16BAD8a"
        );
        raffleEnteranceFee = await raffle.getEntranceFee();
      });
      
      describe("fulfillRandomWords", () => {
        it("Works with live Chainlink keepers and Chainlink VRF, We get a random Winner", async function () {
          const startingTimeStamp = await raffle.getLatestTimeStamp();
          const accounts = await ethers.getSigners();

          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async function () {
              console.log("Winner Pick event Fired!!!");
              try {
                // asserts
                const raffleState = await raffle.getRaffleState();
                const recentWinner = await raffle.getRecentWinner();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLatestTimeStamp();

                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(raffleEnteranceFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);

                resolve();
              } catch (error) {
                console.log(error);
                reject(e);
              }
            });
            await raffle.enterRaffle({ value: raffleEnteranceFee });
            const winnerStartingBalance = await ethers.provider.getBalance(accounts[0].address);
          });

          // SetUp eventListner before we enter the raffle
          // Just in case the blockChain moves really fast

          //   await raffle.enterRaffle({ value: raffleEnteranceFee });
        });
      });
    });
