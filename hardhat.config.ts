import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import '@openzeppelin/hardhat-upgrades'
import * as dotenv from 'dotenv'

dotenv.config()
const mnemonic = process.env.DEPLOYER_PKY_KEY;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      forking: {
        url: 'https://rpc.ankr.com/bsc_testnet_chapel',
      },
    },
    mainnet: {
      url: `https://rpc.ankr.com/eth`,
      accounts: [`${mnemonic}`],
      chainId: 1
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${mnemonic}`],
      chainId: 3,
      gasPrice: 5000000000,
      gasMultiplier: 2
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${mnemonic}`],
      chainId: 4,
      gasPrice: 5000000000,
      gasMultiplier: 2
    },
    goerli: {
      url: `https://endpoints.omniatech.io/v1/eth/goerli/public`,
      accounts: [`${mnemonic}`],
      chainId: 5,
      gasMultiplier: 2
    },
    sepolia: {
      url: `https://rpc2.sepolia.org`,
      accounts: [`${mnemonic}`],
      chainId: 11155111,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${mnemonic}`],
      chainId: 42,
      gasPrice: 20000000000,
      gasMultiplier: 2
    },
    moonbase: {
      url: 'https://rpc.testnet.moonbeam.network',
      accounts: [`${mnemonic}`],
      chainId: 1287,
      gas: 5198000,
      gasMultiplier: 2
    },
    arbitrum: {
      url: 'https://kovan3.arbitrum.io/rpc',
      accounts: [`${mnemonic}`],
      chainId: 79377087078960,
      gasMultiplier: 2
    },
    opera: {
      url: 'https://rpcapi.fantom.network',
      accounts: [`${mnemonic}`],
      chainId: 250
    },
    ftmTestnet: {
      url: 'https://rpc.testnet.fantom.network',
      accounts: [`${mnemonic}`],
      chainId: 4002,
      gasMultiplier: 2
    },
    polygon: {
      url: 'https://rpc.ankr.com/polygon',
      accounts: [`${mnemonic}`],
      chainId: 137,
    },
    mumbai: {
      url: 'https://rpc.ankr.com/polygon_mumbai',
      accounts: [`${mnemonic}`],
      chainId: 80001,
      gasMultiplier: 2
    },
    xdai: {
      url: 'https://rpc.xdaichain.com',
      accounts: [`${mnemonic}`],
      chainId: 100,
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org',
      accounts: [`${mnemonic}`],
      chainId: 56,
    },
    bscTestnet: {
      url: 'https://rpc.ankr.com/bsc_testnet_chapel',
      accounts: [
        `${mnemonic}`,
      ],
      chainId: 97,
      gasMultiplier: 2
    },
    heco: {
      url: 'https://http-mainnet.hecochain.com',
      accounts: [`${mnemonic}`],
      chainId: 128,
    },
    'heco-testnet': {
      url: 'https://http-testnet.hecochain.com',
      accounts: [`${mnemonic}`],
      chainId: 256,
      gasMultiplier: 2
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts: [`${mnemonic}`],
      chainId: 43114
    },
    avaxfuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts: [`${mnemonic}`],
      chainId: 43113,
      gasMultiplier: 2
    },
    harmony: {
      url: 'https://api.s0.t.hmny.io',
      accounts: [`${mnemonic}`],
      chainId: 1666600000,
    },
    'harmony-testnet': {
      url: 'https://api.s0.b.hmny.io',
      accounts: [`${mnemonic}`],
      chainId: 1666700000,
      gasMultiplier: 2
    }
  },
  etherscan: {

    apiKey: {
      avalancheFujiTestnet: 'ZGR21YGDGQSIVXI5B2NR5K73MFCDI4QPH8', // avax
      avalanche: 'ZGR21YGDGQSIVXI5B2NR5K73MFCDI4QPH8', // avax

      bsc: "V28HJCGUP2XCHSV5IXXG6IK9W14HHXKDCY", // bsc
      bscTestnet: "V28HJCGUP2XCHSV5IXXG6IK9W14HHXKDCY", // bsc

      opera: "IJ7P45C1D6CWVVQZ3FAYMFMR433IYEJ3EW", // ftm
      ftmTestnet: "IJ7P45C1D6CWVVQZ3FAYMFMR433IYEJ3EW", // ftm


      polygon: "YEIG77M4C7ICS4TMDQAJPWJGJWF5CFY4Y3", // polygon
      polygonMumbai: "YEIG77M4C7ICS4TMDQAJPWJGJWF5CFY4Y3", // polygon


      goerli: "UVGM9GGPHXP755SK9DKI3BED9EBA5RC16P", // eth
      mainnet: "UVGM9GGPHXP755SK9DKI3BED9EBA5RC16P", // eth
      sepolia: "UVGM9GGPHXP755SK9DKI3BED9EBA5RC16P", // eth

      //optimism: "R5W7SC6B9MY4999NQYX9S4SU9DE86F15KB", // optimism
      //optimismTestnet: "R5W7SC6B9MY4999NQYX9S4SU9DE86F15KB", // optimism



    }
  },
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.6.12', // Pancake Router
        settings: {
          optimizer: {
            enabled: true
          }
        }
      },
      {
        version: '0.6.6', // Pangolin Router
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      {
        version: '0.8.2' // Pancake Pair
      },
      {
        version: '0.5.17' // WAVAX
      },
      {
        version: '0.5.16' // Pancake / Pangolin -> Pair / Factory
      },
      {
        version: '0.5.0' // Pancake Pair
      },
      {
        version: '0.4.24' // WBTC
      },
      {
        version: '0.4.18' // WBNB
      }
    ]
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 6000000
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5'
  },
  gasReporter: {
    token: "BNB",
    currency: 'USD',
    gasPrice: 10,
    enabled: false,
    coinmarketcap: '0caa3779-3cb2-4665-a7d3-652823b53908'
  }
};

export default config;
