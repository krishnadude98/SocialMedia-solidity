# Social Media Application

This project creates and deploy social media application on gorelli/polygon mumbai network

## 🚀 About Me

I'm a Blockchain developer with ability to develop smartcontracts in diffrent chians such as Etherium,Tezos,Cardano

## Installation

Install SocialMedia-solidity with npm

```bash
  git clone https://github.com/krishnadude98/SocialMedia-solidity.git
  cd SocialMedia-solidity
```

Setup

```bash
    yarn install

```

Create .env file and put your keys here

```bash
GORELLI_RPC_URL=""
PRIVATE_KEY=
ETHERSCAN_API_KEY=""
COIN_MARKET_CAP_API_KEY="2dd4233c-e892-44e6-8e89-e499d39bf4bd"
POLYGON_API_KEY=""
```

## Running Tests

To run tests, run the following command

```bash
  yarn hardhat test --network hardhat
```

To run stagging test

```bash
  yarn hardhat test --network goreli

```

## Features

-   Create Post
-   Delete Post
-   View Post

## Deployment

To deploy this project run

For Goreli

```bash
  yarn hardhat deploy --network goreli
```

For Local

```bash

  yarn hardhat deploy --network hardhat

```

## Author

-   Hari Krishna
