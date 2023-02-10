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
import { WETH9 } from '../typechain'


//available functions
describe("Token contract", async () => {
    let deployer: SignerWithAddress;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let kittieNft: KittieNft;
    let WETH: WETH9;
    let proofs: any[] = []
    let root: any;
    let addresses: string[];

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

        const KittieNftFactory = await ethers.getContractFactory("KittieNft");
        kittieNft = await KittieNftFactory.deploy(
            1,
            20,
            "https://api.kitties.com/kitties/", // _newBaseURI
            parseEther("0.1"), // _cost
            100, // _maxSupply
            "KittieNft", // _name
            "KTNFT", // _symbol
            "https://api.kitties.com/kitties/", // _initBaseURI
            "https://api.kitties.com/kitties/" // _initNotRevealedUri
        ) as KittieNft;
        await kittieNft.deployed();

        console.log(`${colors.cyan('KittieNft Address')}: ${colors.yellow(kittieNft.address)}`)
    });

    it("3. Create Merkle Tree", async () => {


        addresses = new Array(10)
            .fill(0)
            .map(() => new Wallet(randomBytes(32).toString('hex')).address)

        const merkleTree = new MerkleTree(
            addresses,
            keccak256,
            { hashLeaves: true, sortPairs: true }
        )

        for (let i = 0; i < addresses.length; i++) {
            const currentAddress = addresses[i];
            const proof = merkleTree.getHexProof(keccak256(currentAddress!));
            proofs.push({
                address: currentAddress,
                proof
            });
            console.log(`${colors.cyan('Address')}: ${colors.yellow(currentAddress)}`)
        }

        root = merkleTree.getHexRoot()
        await kittieNft.setMerkleRootL1(root);
        await kittieNft.setMerkleRootL2(root);
    });


    it("4. Calculate minting cost", async () => {
        const mintAmount = 1;
        const merkleProofL1 = proofs[0].proof;
        const merkleProofL2 = proofs[1].proof;

        const cost = await kittieNft.calculateMintingCost(mintAmount, merkleProofL1, merkleProofL2);
        console.log(`${colors.cyan('Minting Cost')}: ${colors.yellow(formatEther(cost))}`)
        expect(cost).to.equal(parseEther("0.1"));
    });

    it("5. Mint KittieNft From deployer", async () => {
        const mintAmount = 1;
        const merkleProofL1 = proofs[0].proof;
        const merkleProofL2 = proofs[1].proof;

        const cost = await kittieNft.calculateMintingCost(mintAmount, merkleProofL1, merkleProofL2);

        await kittieNft.mint(mintAmount, merkleProofL1, merkleProofL2, { value: cost });

        // print minters count
        const mintersCount = await kittieNft.mintersCounter();
        console.log(`${colors.cyan('Minters Count')}: ${colors.yellow(mintersCount)}`)
        expect(mintersCount).to.equal(1);
    });

    it("6. Mint KittieNft From bob", async () => {
        const mintAmount = 1;
        const merkleProofL1 = proofs[0].proof;
        const merkleProofL2 = proofs[1].proof;

        const cost = await kittieNft.calculateMintingCost(mintAmount, merkleProofL1, merkleProofL2);

        await kittieNft.connect(bob).mint(mintAmount, merkleProofL1, merkleProofL2, { value: cost });

        // print minters count
        const mintersCount = await kittieNft.mintersCounter();
        console.log(`${colors.cyan('Minters Count')}: ${colors.yellow(mintersCount)}`)
        expect(mintersCount).to.equal(2);
    });


    it("7. Transfer eth to contract (simulate sell)", async () => {

        await WETH.deposit({ value: parseEther("1") });
        await WETH.transfer(kittieNft.address, parseEther("1"));

        /*
        const balanceBefore = await ethers.provider.getBalance(kittieNft.address);
        console.log(`${colors.cyan('Contract balance Before Sell')}: ${colors.yellow(formatEther(balanceBefore))}`)

        console.log(`${colors.cyan('Transfering 1 eth to contract')}`)
        await transferEth(deployer, kittieNft.address, "1");

        const balanceAfter = await ethers.provider.getBalance(kittieNft.address);
        console.log(`${colors.cyan('Contract balance After Sell')}: ${colors.yellow(formatEther(balanceAfter))}`)
        expect(balanceAfter).to.equal(parseEther("1"));
        */
    });

    it("8. Transfer from", async () => {
        const balanceBefore = await kittieNft.balanceOf(deployer.address);
        console.log(`${colors.cyan('Deployer Balance Before Transfer')}: ${colors.yellow(balanceBefore)}`)

        await kittieNft.transferFrom(deployer.address, bob.address, 1);

        const balanceAfter = await kittieNft.balanceOf(deployer.address);
        console.log(`${colors.cyan('Deployer Balance After Transfer')}: ${colors.yellow(balanceAfter)}`)
        expect(balanceAfter).to.equal(0);
    });

    it("8. Get Claim Amount", async () => {
        const balanceBefore = await ethers.provider.getBalance(deployer.address);
        const claimableAmountBefore = await kittieNft.claimableAmount(deployer.address);
        console.log(`${colors.cyan('Balance Before Claim')}: ${colors.yellow(formatEther(balanceBefore))}`)
        console.log(`${colors.cyan('Claimable Amount Before Claim')}: ${colors.yellow(formatEther(claimableAmountBefore))}`)

    });


    /*
    it("8. Claim", async () => {
        const balanceBefore = await ethers.provider.getBalance(deployer.address);
        const claimableAmountBefore = await kittieNft.claimableAmount(deployer.address);
        console.log(`${colors.cyan('Balance Before Claim')}: ${colors.yellow(formatEther(balanceBefore))}`)
        console.log(`${colors.cyan('Claimable Amount Before Claim')}: ${colors.yellow(formatEther(claimableAmountBefore))}`)

        await kittieNft.claimRewards();

        const balanceAfter = await ethers.provider.getBalance(deployer.address);
        const claimableAmount = await kittieNft.claimableAmount(deployer.address);
        console.log(`${colors.cyan('Balance After Claim')}: ${colors.yellow(formatEther(balanceAfter))}`)
        console.log(`${colors.cyan('Claimable Amount After Claim')}: ${colors.yellow(formatEther(claimableAmount))}`)
    });
    */


});

