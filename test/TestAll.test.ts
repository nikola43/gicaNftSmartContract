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
const { time } = require('@openzeppelin/test-helpers');

//available functions
describe("Token contract", async () => {
    let deployer: SignerWithAddress;
    let bob: SignerWithAddress;
    let alice: SignerWithAddress;
    let kittieNft: KittieNft;
    let WETH: WETH9;
    let proofs1: any[] = []
    let proofs2: any[] = []
    let root1: any;
    let root2: any;
    let addresses1: string[];
    let addresses2: string[];

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




        let contractName = "KittieNft"
        console.log(colors.yellow('Deploying ') + colors.cyan(contractName) + colors.yellow('...'));

        const KittieNftFactory = await ethers.getContractFactory(contractName);

        kittieNft = await KittieNftFactory.deploy(
            1,
            20,
            parseEther("0.1"), // _cost
            100, // _maxSupply
            "KittieNft", // _name
            "KTNFT", // _symbol
            "https://api.kitties.com/kitties/", // _initBaseURI
        ) as KittieNft;
        await kittieNft.deployed();

        console.log(`${colors.cyan('KittieNft Address')}: ${colors.yellow(kittieNft.address)}`)
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
        await kittieNft.setMerkleRootL1(root1);
        await kittieNft.setMerkleRootL2(root2);

        console.log(`${colors.cyan('Merkle Root L1')}: ${colors.yellow(root1)}`)
        console.log(`${colors.cyan('Merkle Root L2')}: ${colors.yellow(root2)}`)
    });


    it("4. check if account is on list", async () => {
        const merkleProofL1 = proofs1[0].proof;
        const merkleProofL2 = proofs2[0].proof;

        const isOnList1 = await kittieNft.isAccountOnList(addresses1[0], merkleProofL1, root1);
        console.log(`${colors.cyan('isOnList1')}: ${colors.yellow(isOnList1)}`)

        const isOnList2 = await kittieNft.isAccountOnList(addresses2[0], merkleProofL2, root2);
        console.log(`${colors.cyan('isOnList2')}: ${colors.yellow(isOnList2)}`)
        //expect(cost).to.equal(parseEther("0.1"));
    });


    it("4. Calculate minting cost", async () => {
        const mintAmount = 1;
        let merkleProofL1 = proofs1[0].proof;
        let merkleProofL2 = proofs2[0].proof;

        const cost1 = await kittieNft.calculateMintingCost(addresses1[0], mintAmount, merkleProofL1, merkleProofL2);
        console.log(`${colors.cyan('Minting Cost Proof1')}: ${colors.yellow(formatEther(cost1))}`)

        const cost2 = await kittieNft.calculateMintingCost(addresses2[0], mintAmount, merkleProofL1, merkleProofL2);
        console.log(`${colors.cyan('Minting Cost Proof2')}: ${colors.yellow(formatEther(cost2))}`)
        //expect(cost).to.equal(parseEther("0.1"));
    });

    it("4. Calculate minting cost after 6 months", async () => {


        const months = 7;
        const seconds = months * 30 * 24 * 60 * 60;
        await time.increase(seconds);


        const mintAmount = 1;
        let merkleProofL1 = proofs1[0].proof;
        let merkleProofL2 = proofs2[0].proof;

        const cost1 = await kittieNft.calculateMintingCost(addresses1[0], mintAmount, merkleProofL1, merkleProofL2);
        console.log(`${colors.cyan('Minting Cost Proof1')}: ${colors.yellow(formatEther(cost1))}`)

        const cost2 = await kittieNft.calculateMintingCost(addresses2[0], mintAmount, merkleProofL1, merkleProofL2);
        console.log(`${colors.cyan('Minting Cost Proof2')}: ${colors.yellow(formatEther(cost2))}`)

        await time.increase(seconds);

        const cost3 = await kittieNft.calculateMintingCost(addresses2[0], mintAmount, merkleProofL1, merkleProofL2);
        console.log(`${colors.cyan('Minting Cost Proof2 After 14 months')}: ${colors.yellow(formatEther(cost3))}`)
    });



    it("5. Mint KittieNft", async () => {
        const mintAmount = 1;
        const merkleProofL1 = proofs1[0].proof;
        const merkleProofL2 = proofs2[1].proof;

        const cost = await kittieNft.calculateMintingCost(deployer.address, mintAmount, merkleProofL1, merkleProofL2);

        // mint to owner and check number of holders
        await kittieNft.mint(mintAmount, merkleProofL1, merkleProofL2, { value: cost });
        expect(await kittieNft.balanceOf(deployer.address)).to.equal(mintAmount);

        let mintersCount = await kittieNft.getNumberOfTokenHolders();
        console.log(`${colors.cyan('getNumberOfTokenHolders')}: ${colors.yellow(mintersCount)}`)
        expect(mintersCount).to.equal(1);

        await kittieNft.connect(bob).mint(mintAmount, merkleProofL1, merkleProofL2, { value: cost });
        expect(await kittieNft.balanceOf(bob.address)).to.equal(mintAmount);

        mintersCount = await kittieNft.getNumberOfTokenHolders();
        console.log(`${colors.cyan('getNumberOfTokenHolders')}: ${colors.yellow(mintersCount)}`)
        expect(mintersCount).to.equal(2);

        await kittieNft.connect(alice).mint(mintAmount, merkleProofL1, merkleProofL2, { value: cost });
        expect(await kittieNft.balanceOf(alice.address)).to.equal(mintAmount);
        mintersCount = await kittieNft.getNumberOfTokenHolders();
        console.log(`${colors.cyan('getNumberOfTokenHolders')}: ${colors.yellow(mintersCount)}`)
        expect(mintersCount).to.equal(3);
    });

    it("7. Transfer eth to contract (simulate sell)", async () => {

        await WETH.deposit({ value: parseEther("1") });
        await WETH.transfer(kittieNft.address, parseEther("1"));

        // check contract balance
        const balance = await WETH.balanceOf(kittieNft.address);
        expect(balance).to.equal(parseEther("1"));
    });

    /*
    it("8. Update claims", async () => {
        // get WETH balance
        const balanceBefore = await WETH.balanceOf(bob.address);
        console.log(`${colors.cyan('Balance Before Claim')}: ${colors.yellow(formatEther(balanceBefore))}`)
        //expect(balanceBefore).to.equal(parseEther("0"));

        // get claimable amount
        const claimableAmountBefore = await kittieNft.getClaimableAmount(bob.address);
        console.log(`${colors.cyan('Claimable Amount Before Claim')}: ${colors.yellow(formatEther(claimableAmountBefore))}`)
        //expect(claimableAmountBefore).to.equal(parseEther("0"));

        // update claims
        await kittieNft.updateRewards();

        // get claimable amount
        const balanceBefore = await WETH.balanceOf(bob.address);
        const claimableAmountBefore = await kittieNft.getClaimableAmount(bob.address);
        console.log(`${colors.cyan('Balance Before Claim')}: ${colors.yellow(formatEther(balanceBefore))}`)
        console.log(`${colors.cyan('Claimable Amount Before Claim')}: ${colors.yellow(formatEther(claimableAmountBefore))}`)
    });
    */


    it("8. Claim", async () => {
        // get WETH balance
        const deployerBalanceBefore = await WETH.balanceOf(deployer.address);
        const bobBalanceBefore = await WETH.balanceOf(bob.address);
        const aliceBalanceBefore = await WETH.balanceOf(alice.address);
        console.log(`${colors.cyan('Deployer Balance Before Claim')}: ${colors.yellow(formatEther(deployerBalanceBefore))}`)
        console.log(`${colors.cyan('Bob Balance Before Claim')}: ${colors.yellow(formatEther(bobBalanceBefore))}`)
        console.log(`${colors.cyan('Alice Balance Before Claim')}: ${colors.yellow(formatEther(aliceBalanceBefore))}`)
        //expect(deployerBalanceBefore).to.equal(parseEther("0"));
        //expect(bobBalanceBefore).to.equal(parseEther("0"));
        //expect(aliceBalanceBefore).to.equal(parseEther("0"));

        // get claimable amount
        const deployerClaimableAmountBefore = await kittieNft.getClaimableAmount(deployer.address);
        const bobClaimableAmountBefore = await kittieNft.getClaimableAmount(bob.address);
        const aliceClaimableAmountBefore = await kittieNft.getClaimableAmount(alice.address);
        console.log(`${colors.cyan('Deployer Claimable Amount Before Claim')}: ${colors.yellow(formatEther(deployerClaimableAmountBefore))}`)
        console.log(`${colors.cyan('Bob Claimable Amount Before Claim')}: ${colors.yellow(formatEther(bobClaimableAmountBefore))}`)
        console.log(`${colors.cyan('Alice Claimable Amount Before Claim')}: ${colors.yellow(formatEther(aliceClaimableAmountBefore))}`)

        // claim from bob
        await kittieNft.connect(bob).claimRewards();

        // get claimable amount after claim
        const deployerClaimableAmountAfter = await kittieNft.getClaimableAmount(deployer.address);
        const bobClaimableAmountAfter = await kittieNft.getClaimableAmount(bob.address);
        const aliceClaimableAmountAfter = await kittieNft.getClaimableAmount(alice.address);
        console.log(`${colors.cyan('Deployer Claimable Amount After Claim')}: ${colors.yellow(formatEther(deployerClaimableAmountAfter))}`)
        console.log(`${colors.cyan('Bob Claimable Amount After Claim')}: ${colors.yellow(formatEther(bobClaimableAmountAfter))}`)
        console.log(`${colors.cyan('Alice Claimable Amount After Claim')}: ${colors.yellow(formatEther(aliceClaimableAmountAfter))}`)

    });

    it("9. Transfer eth to contract (simulate sell)", async () => {

        await WETH.deposit({ value: parseEther("1") });
        await WETH.transfer(kittieNft.address, parseEther("1"));

        // check contract balance
        const balance = await WETH.balanceOf(kittieNft.address);
        console.log(`${colors.cyan('Contract Balance')}: ${colors.yellow(formatEther(balance))}`)
        //expect(balance).to.equal(parseEther("1"));
    });

    it("8. Claim 2", async () => {
        // get WETH balance
        const deployerBalanceBefore = await WETH.balanceOf(deployer.address);
        const bobBalanceBefore = await WETH.balanceOf(bob.address);
        const aliceBalanceBefore = await WETH.balanceOf(alice.address);
        console.log(`${colors.cyan('Deployer Balance Before Claim')}: ${colors.yellow(formatEther(deployerBalanceBefore))}`)
        console.log(`${colors.cyan('Bob Balance Before Claim')}: ${colors.yellow(formatEther(bobBalanceBefore))}`)
        console.log(`${colors.cyan('Alice Balance Before Claim')}: ${colors.yellow(formatEther(aliceBalanceBefore))}`)
        //expect(deployerBalanceBefore).to.equal(parseEther("0"));
        //expect(bobBalanceBefore).to.equal(parseEther("0"));
        //expect(aliceBalanceBefore).to.equal(parseEther("0"));

        // get claimable amount
        const deployerClaimableAmountBefore = await kittieNft.getClaimableAmount(deployer.address);
        const bobClaimableAmountBefore = await kittieNft.getClaimableAmount(bob.address);
        const aliceClaimableAmountBefore = await kittieNft.getClaimableAmount(alice.address);
        console.log(`${colors.cyan('Deployer Claimable Amount Before Claim')}: ${colors.yellow(formatEther(deployerClaimableAmountBefore))}`)
        console.log(`${colors.cyan('Bob Claimable Amount Before Claim')}: ${colors.yellow(formatEther(bobClaimableAmountBefore))}`)
        console.log(`${colors.cyan('Alice Claimable Amount Before Claim')}: ${colors.yellow(formatEther(aliceClaimableAmountBefore))}`)

        // claim from bob
        await kittieNft.connect(alice).claimRewards();

        // get claimable amount after claim
        const deployerClaimableAmountAfter = await kittieNft.getClaimableAmount(deployer.address);
        const bobClaimableAmountAfter = await kittieNft.getClaimableAmount(bob.address);
        const aliceClaimableAmountAfter = await kittieNft.getClaimableAmount(alice.address);
        console.log(`${colors.cyan('Deployer Claimable Amount After Claim')}: ${colors.yellow(formatEther(deployerClaimableAmountAfter))}`)
        console.log(`${colors.cyan('Bob Claimable Amount After Claim')}: ${colors.yellow(formatEther(bobClaimableAmountAfter))}`)
        console.log(`${colors.cyan('Alice Claimable Amount After Claim')}: ${colors.yellow(formatEther(aliceClaimableAmountAfter))}`)

    });




    /*
    
       it("8. Transfer from", async () => {
            const balanceBefore = await kittieNft.balanceOf(deployer.address);
            console.log(`${colors.cyan('Deployer Balance Before Transfer')}: ${colors.yellow(balanceBefore)}`)
    
            await kittieNft.transferFrom(deployer.address, bob.address, 1);
    
            const balanceAfter = await kittieNft.balanceOf(deployer.address);
            console.log(`${colors.cyan('Deployer Balance After Transfer')}: ${colors.yellow(balanceAfter)}`)
            expect(balanceAfter).to.equal(0);
        });
        */



    /*
    it("8. Claim", async () => {
        const balanceBefore = await ethers.provider.getBalance(deployer.address);
        const claimableAmountBefore = await kittieNft.getClaimableAmount(deployer.address);
        console.log(`${colors.cyan('Balance Before Claim')}: ${colors.yellow(formatEther(balanceBefore))}`)
        console.log(`${colors.cyan('Claimable Amount Before Claim')}: ${colors.yellow(formatEther(claimableAmountBefore))}`)

        await kittieNft.claimRewards();

        const balanceAfter = await ethers.provider.getBalance(deployer.address);
        const claimableAmount = await kittieNft.getClaimableAmount(deployer.address);
        console.log(`${colors.cyan('Balance After Claim')}: ${colors.yellow(formatEther(balanceAfter))}`)
        console.log(`${colors.cyan('Claimable Amount After Claim')}: ${colors.yellow(formatEther(claimableAmount))}`)
    });
    */


});

