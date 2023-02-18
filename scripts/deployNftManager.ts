const colors = require('colors');
import { ethers } from 'hardhat';
const test_util = require('./util');


import { NftManager } from '../NftManager';
import { KittieNft } from '../KittieNft';
import { parseEther } from 'ethers/lib/utils';

async function main() {

    let kittieNft1: KittieNft;
    let kittieNft2: KittieNft;
    let kittieNft3: KittieNft;
    let nftManager: NftManager;

    const deployedAddress = {
        IterableMapping: "",
        KittieNft1: "",
        KittieNft2: "",
        KittieNft3: "",
        NftManager: "",
    }


    // get signer
    const [signer] = await ethers.getSigners()
    if (signer === undefined) throw new Error('Deployer is undefined.')
    console.log(colors.cyan('Deployer Address: ') + colors.yellow(signer.address));
    console.log();
    console.log(colors.yellow('Deploying...'));
    console.log();

    // deploy IterableMapping
    const iterableMappingFactory = await ethers.getContractFactory("IterableMapping")
    const IterableMappingDeployed = await iterableMappingFactory.deploy()
    await IterableMappingDeployed.deployed()
    console.log({
        IterableMappingDeployed: IterableMappingDeployed.address
    })
    await test_util.sleep(60);
    await test_util.updateABI("IterableMapping")
    await test_util.verify(IterableMappingDeployed.address, "IterableMapping")
    deployedAddress.IterableMapping = IterableMappingDeployed.address;

    // deploy KittieNft 1
    let contractName = "KittieNft"
    let contractFactory = await ethers.getContractFactory(contractName, {
        libraries: {
            IterableMapping: IterableMappingDeployed.address
        },
    });
    kittieNft1 = await contractFactory.deploy(
        1,
        100,
        parseEther("0.03"), // _cost
        10000, // _maxSupply
        "KittieNft1", // _name
        "KTNFT1", // _symbol
        "https://api.kitties.com/kitties/", // _initBaseURI
    ) as KittieNft;
    await kittieNft1.deployed()
    console.log(colors.cyan('Contract Address: ') + colors.yellow(kittieNft1.address));
    console.log(colors.yellow('verifying...'));
    await test_util.sleep(60);
    await test_util.updateABI(contractName)
    await test_util.verify(kittieNft1.address, contractName, [1, 100, parseEther("0.03"), 10000, "KittieNft1", "KTNFT1", "https://api.kitties.com/kitties/"])
    deployedAddress.KittieNft1 = kittieNft1.address;


    // deploy KittieNft 2
    contractName = "KittieNft"
    kittieNft2 = await contractFactory.deploy(
        2,
        60,
        parseEther("0.015"), // _cost
        20000, // _maxSupply
        "KittieNft2", // _name
        "KTNFT2", // _symbol
        "https://api.kitties.com/kitties/", // _initBaseURI
    ) as KittieNft;
    await kittieNft2.deployed()
    console.log(colors.cyan('Contract Address: ') + colors.yellow(kittieNft2.address));
    console.log(colors.yellow('verifying...'));
    await test_util.sleep(60);
    await test_util.updateABI(contractName)
    await test_util.verify(kittieNft2.address, contractName, [2, 60, parseEther("0.015"), 20000, "KittieNft2", "KTNFT2", "https://api.kitties.com/kitties/"])
    deployedAddress.KittieNft2 = kittieNft2.address;

    // deploy KittieNft 3
    contractName = "KittieNft"
    kittieNft3 = await contractFactory.deploy(
        3,
        60,
        parseEther("0.005"), // _cost
        20000, // _maxSupply
        "KittieNft3", // _name
        "KTNFT3", // _symbol
        "https://api.kitties.com/kitties/", // _initBaseURI
    ) as KittieNft;
    await kittieNft3.deployed()
    console.log(colors.cyan('Contract Address: ') + colors.yellow(kittieNft2.address));
    console.log(colors.yellow('verifying...'));
    await test_util.sleep(60);
    await test_util.updateABI(contractName)
    await test_util.verify(kittieNft2.address, contractName, [3, 30, parseEther("0.005"), 30000, "KittieNft3", "KTNFT3", "https://api.kitties.com/kitties/"])
    deployedAddress.KittieNft3 = kittieNft3.address;

    // deploy NftManager
    contractName = "NftManager"
    contractFactory = await ethers.getContractFactory(contractName);
    nftManager = (await contractFactory.deploy(kittieNft1.address, kittieNft2.address, kittieNft3.address,)) as NftManager;
    console.log(colors.cyan('Contract Address: ') + colors.yellow(nftManager.address));
    console.log(colors.yellow('verifying...'));
    await test_util.sleep(60);
    await test_util.updateABI(contractName)
    await test_util.verify(nftManager.address, contractName, [kittieNft1.address, kittieNft2.address, kittieNft3.address])
    deployedAddress.NftManager = nftManager.address;

    console.log(deployedAddress)
}

main()
    .then(async () => {
        console.log("Done")
    })
    .catch(error => {
        console.error(error);
        return undefined;
    })