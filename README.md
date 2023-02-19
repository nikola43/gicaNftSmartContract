# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

# Install Node
Install Node Version Manager 
Linux | MacOS -> https://github.com/nvm-sh/nvm
Windows -> https://github.com/coreybutler/nvm-windows

```
nvm install 16
```
```
nvm use 16
```

# Install dependences
```
npm install -g yarn
```

```
yarn install
```

# Deploy on Eth Goerli testnet
## 1 Add private key on .env file
## 2 Run deploy script all in one
```
npx hardhat run test/TestZoeToken.test.ts --network localhost
```

# Deploy With Remix
Should use flatenned version
```
npx hardhat flatten contracts/PoorPleb.sol > flattPoorPleb.sol
```
```
npx hardhat flatten contracts/MerkleAirdrop.sol > flattMerkleAirdrop.sol
```

# Testing
## Run local node
```
npx hardhat node --fork https://goerli.infura.io/v3/d8200853cc4c4001956d0c1a2d0de540
npx hardhat test test/TestAll.test.ts --network localhost
```

nodemon --watch test/TestZoeToken.test.ts --exec 'npx hardhat test test/TestZoeToken.test.ts --network localhost'

root1 6729923340d535ba4641b7802e487e76b9d278dfd9e0ee1a8d8817a2b4dcd73a
root2 377301edd9ca8cbf23adc76898ea14efadcafdc59ddb3e09b81c4dc27e31de79

{
  IterableMapping: '0x468407885E639063D7F85921B752AB4CDe1948Bf',
  KittieNft1: '0xbDdd7097B50813b46604E291Ef57473c4B661f94',
  KittieNft2: '0x3702D35FC086CC0d521003d8Be0b4E7d66a469Fd',
  KittieNft3: '0x151FeE83C6EBbd4a8a655D10afcc7268599A33f4',
  NftManager: '0x4689a2701c78183Cb63c864Aca155dcc1d598937'
}

