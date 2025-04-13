# Lottery DApp with a React frontend

DApp preview can be found here: lottery.delishad.com

DApp is deployed on the Sepolia testnet. Contract address is 0x5d9ab17e0e586cA2adAafAeaa3fE4b02c218d2c0

This repository contains a simple lottery DApp built with React and Solidity. The DApp allows users to enter a lottery by sending Ether, and the contract randomly selects a winner from the participants.

This DApp makes use of Chainlink VRF and Automation. The contract is deployed on the Sepolia testnet, and the frontend is built using React.

VRF is used for random number generation for the lottery winner, and Automation is used to trigger the lottery draw at regular intervals.

## Usage

If you wish to run this project, there are a few things to take note of:
1. When compiling the contract, you will need to update the automationRegistry address in the contract. The contract will only allow the owner and the automationRegistry to call the `performUpkeep` function which will trigger the lottery draw.
2. You will need to obtain a VRF subscription ID and a keyHash. You can do this by creating a new subscription on the Chainlink VRF dashboard and funding it with LINK tokens or Ether. The contract will use this subscription to request random numbers from the Chainlink VRF service. The keyHash is meant for the Sepolia testnet, You can find the keyHash and fee for other networks in the Chainlink documentation.
3. In the frontend, you will need to set your contract address as an environment variable.
