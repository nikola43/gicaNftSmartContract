const colors = require('colors');
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat'
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
const test_util = require('./util');
const fs = require('fs');
const lineByLine = require('n-readlines');

import { KittieNft } from '../typechain'

async function main() {
    const [signer] = await ethers.getSigners()
    if (signer === undefined) throw new Error('Deployer is undefined.')
    console.log(colors.cyan('Deployer Address: ') + colors.yellow(signer.address));
    console.log();
    console.log(colors.yellow('Deploying...'));
    console.log();

    let addresses: string[] = []
    let proofs: any[] = []
    let rowCounter = 0;

    let kittieNft: KittieNft;



    const liner = new lineByLine('addr-list.txt');

    let line;

    while (line = liner.next()) {
        addresses.push(line.toString())
        rowCounter++;
        console.log({
            rowCounter
        })
    }
    console.log({
        addresses
    })

    const merkleTree = new MerkleTree(
        addresses,
        keccak256,
        { hashLeaves: true, sortPairs: true }
    )

    for (let i = 0; i < addresses.length; i++) {
        const add = addresses[i];
        const proof = merkleTree.getHexProof(keccak256(add!));
        proofs.push({
            address: addresses[i],
            proof
        });
        console.log({
            i
        });
    }


    const root = merkleTree.getHexRoot()
    let rootData = JSON.stringify(root);
    fs.writeFileSync('root.json', rootData);


    let proofsData = JSON.stringify(proofs);
    fs.writeFileSync('proofs.json', proofsData);

    /// ---------------------------------------------


    const iterableMappingFactory = await ethers.getContractFactory("IterableMapping")
    const IterableMappingDeployed = await iterableMappingFactory.deploy()
    await IterableMappingDeployed.deployed()
    console.log({
        IterableMappingDeployed: IterableMappingDeployed.address
    })
    await test_util.sleep(60);
    await test_util.updateABI("IterableMapping")
    await test_util.verify(IterableMappingDeployed.address, "IterableMapping")

    let contractName = "KittieNft"
    console.log(colors.yellow('Deploying ') + colors.cyan(contractName) + colors.yellow('...'));

    const contractFactory = await ethers.getContractFactory(contractName, {
        libraries: {
            IterableMapping: IterableMappingDeployed.address
        },
    });
    kittieNft = await contractFactory.deploy(
        1,
        20,
        parseEther("0.03"), // _cost
        100, // _maxSupply
        "KittieNft", // _name
        "KTNFT", // _symbol
        "https://api.kitties.com/kitties/", // _initBaseURI
    ) as KittieNft;
    await kittieNft.deployed()
    console.log(colors.cyan('Contract Address: ') + colors.yellow(kittieNft.address));
    console.log(colors.yellow('verifying...'));
    await test_util.sleep(60);
    await test_util.updateABI(contractName)
    await test_util.verify(kittieNft.address, contractName, [1, 20, parseEther("0.03"), 100, "KittieNft", "KTNFT", "https://api.kitties.com/kitties/"])
}

main()
    .then(async () => {
        console.log("Done")
    })
    .catch(error => {
        console.error(error);
        return undefined;
    })