const colors = require('colors');
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat'
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
const test_util = require('./util');
const fs = require('fs');
const lineByLine = require('n-readlines');

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
    let contractName = "KittieNft"
    console.log(colors.yellow('Deploying ') + colors.cyan(contractName) + colors.yellow('...'));

    const contractFactory = await ethers.getContractFactory(contractName)
    const kittieNft = await contractFactory.deploy(
        1,
        20,
        "https://api.kitties.com/kitties/", // _newBaseURI
        parseEther("0.01"), // _cost
        100, // _maxSupply
        "KittieNft", // _name
        "KTNFT", // _symbol
        "https://api.kitties.com/kitties/", // _initBaseURI
        "https://api.kitties.com/kitties/" // _initNotRevealedUri
    );
    await kittieNft.deployed()
    await test_util.sleep(60);
    console.log(colors.cyan('Contract Address: ') + colors.yellow(kittieNft.address));
    console.log(colors.yellow('verifying...'));
    await test_util.updateABI(contractName)
    await test_util.verify(kittieNft.address, contractName, [1, 20, "https://api.kitties.com/kitties/", parseEther("0.1"), 100, "KittieNft", "KTNFT", "https://api.kitties.com/kitties/", "https://api.kitties.com/kitties/"])
}

main()
    .then(async () => {
        console.log("Done")
    })
    .catch(error => {
        console.error(error);
        return undefined;
    })