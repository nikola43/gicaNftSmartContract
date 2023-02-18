import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { formatEther, parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
const colors = require('colors');
import keccak256 from 'keccak256'
import { MerkleTree } from 'merkletreejs'
import { randomBytes } from 'crypto'
import { Wallet } from 'ethers'
import { transferEth } from '../scripts/util'

import { KittieNft } from '../typechain'
import { NftManager } from '../typechain'
import { WETH9 } from '../typechain'
const { time } = require('@openzeppelin/test-helpers');

//available functions
describe("Token contract", async () => {
    let deployer: SignerWithAddress;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let WETH: WETH9;
    let proofs1: any[] = []
    let proofs2: any[] = []
    let root1: any;
    let root2: any;
    let addresses1: string[];
    let addresses2: string[];
    let kittieNft1: KittieNft;
    let kittieNft2: KittieNft;
    let kittieNft3: KittieNft;
    let nftManager: NftManager;

    it("1. Get Signer", async () => {
        const signers = await ethers.getSigners();
        if (signers[0] !== undefined) {
            deployer = signers[0];
            console.log(`${colors.cyan('Deployer Address')}: ${colors.yellow(deployer?.address)}`)
        }
        if (signers[1] !== undefined) {
            bob = signers[1];
            console.log(`${colors.cyan('Bob Address')}: ${colors.yellow(bob?.address)}`)
        }
        if (signers[2] !== undefined) {
            alice = signers[2];
            console.log(`${colors.cyan('Alice Address')}: ${colors.yellow(alice?.address)}`)
        }
    });

    it("2. Deploy KittieNft Contract", async () => {

        WETH = await ethers.getContractAt("WETH9", "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6")


        // deploy IterableMapping
        const iterableMappingFactory = await ethers.getContractFactory("IterableMapping")
        const IterableMappingDeployed = await iterableMappingFactory.deploy()
        await IterableMappingDeployed.deployed()
        console.log({
            IterableMappingDeployed: IterableMappingDeployed.address
        })


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

        // deploy NftManager
        contractName = "NftManager"
        contractFactory = await ethers.getContractFactory(contractName);
        nftManager = (await contractFactory.deploy(kittieNft1.address, kittieNft2.address, kittieNft3.address,)) as NftManager;
        console.log(colors.cyan('Contract Address: ') + colors.yellow(nftManager.address));
        console.log(colors.yellow('verifying...'));

    });

    it("3. Create Merkle Tree", async () => {

        addresses1 = new Array(5)
            .fill(0)
            .map(() => new Wallet(randomBytes(32).toString('hex')).address)
        console.log(addresses1)

        addresses2 = new Array(5)
            .fill(0)
            .map(() => new Wallet(randomBytes(32).toString('hex')).address)
        console.log(addresses2)

        const merkleTree1 = new MerkleTree(
            addresses1,
            keccak256,
            { hashLeaves: true, sortPairs: true }
        )
        console.log(merkleTree1.getHexRoot())

        const merkleTree2 = new MerkleTree(
            addresses2,
            keccak256,
            { hashLeaves: true, sortPairs: true }
        )
        console.log(merkleTree2.getHexRoot())


        for (let i = 0; i < addresses1.length; i++) {
            const currentAddress = addresses1[i];
            const proof = merkleTree1.getHexProof(keccak256(currentAddress!));
            proofs1.push({
                address: currentAddress,
                proof
            });
        }

        for (let i = 0; i < addresses2.length; i++) {
            const currentAddress = addresses2[i];
            const proof = merkleTree2.getHexProof(keccak256(currentAddress!));
            proofs2.push({
                address: currentAddress,
                proof
            });
        }

        root1 = merkleTree1.getHexRoot()
        root2 = merkleTree2.getHexRoot()


        console.log(`${colors.cyan('Merkle Root L1')}: ${colors.yellow(root1)}`)
        console.log(`${colors.cyan('Merkle Root L2')}: ${colors.yellow(root2)}`)
    });






    it("5. Mint KittieNft", async () => {
        const mintAmount = 1;
        const merkleProofL1 = proofs1[0].proof;
        const merkleProofL2 = proofs2[1].proof;

        const cost = await nftManager.calculateMintingCost(1, deployer.address, mintAmount, merkleProofL1, merkleProofL2);

        // mint to owner and check number of holders
        await nftManager.mint(mintAmount, merkleProofL1, merkleProofL2, { value: cost });



    });




});

