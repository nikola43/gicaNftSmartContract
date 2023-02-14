// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// import ERC20
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

//Ownable is needed to setup sales royalties on Open Sea
//if you are the owner of the contract you can configure sales Royalties in the Open Sea website
import "@openzeppelin/contracts/access/Ownable.sol";

//the rarible dependency files are needed to setup sales royalties on Rarible
import "./rarible/royalties/impl/RoyaltiesV2Impl.sol";
import "./rarible/royalties/contracts/LibPart.sol";
import "./rarible/royalties/contracts/LibRoyaltiesV2.sol";

//MerkleProof is needed to verify the merkle tree
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// import console.log for debugging
import "hardhat/console.sol";

// import IterableMapping for store holders addresses
import "./IterableMapping.sol";

/*
1.) Type#1 - 10k pieces – 100% - 0,03 ETH 
2.) Type#2 - 20k pieces – 60% - 0,015 ETH 
3.) Type#3 - 30k pieces – 30% - 0,005 ETH
*/

// interface for weth
interface IWETH {
    function deposit() external payable;

    function transfer(address to, uint256 value) external returns (bool);

    function withdraw(uint256) external;

    function transferFrom(
        address src,
        address dst,
        uint256 wad
    ) external returns (bool);
}

contract KittieNft is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Burnable,
    Ownable,
    RoyaltiesV2Impl
{
    using Strings for uint256;
    using IterableMapping for IterableMapping.Map;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    IWETH public weth;
    uint8 public nftType;
    uint8 public discountPercentage;

    string public baseURI;

    //set the cost to mint each NFT
    uint256 public cost;

    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    // mapping for store holders addresses and claimable amount
    IterableMapping.Map private tokenHoldersMap;

    // merkle root for the list 1
    bytes32 public merkleRootL1;
    uint256 public merkleRootL1Time;

    // merkle root for the list 2
    bytes32 public merkleRootL2;
    uint256 public merkleRootL2Time;

    // deployed timestamp
    uint256 public deployedTimestamp;

    uint256 public currentWethBalance;

    uint256 public maxSupply;

    constructor(
        uint8 _nftType,
        uint8 _discountPercentage,
        uint256 _cost,
        uint256 _maxSupply,
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI
    ) ERC721(_name, _symbol) {
        //weth = IWETH(0x5B67676a984807a212b1c59eBFc9B3568a474F0a); // mumbai
        //configuration
        weth = IWETH(0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6);
        nftType = _nftType;
        discountPercentage = _discountPercentage;

        //set the cost to mint each NFT
        cost = _cost;

        deployedTimestamp = block.timestamp;

        merkleRootL1Time = 6 * 30 days;
        merkleRootL2Time = 6 * 30 days;

        currentWethBalance = 0;

        maxSupply = _maxSupply;

        setBaseURI(_initBaseURI);
    }

    receive() external payable {}

    // GETTERS
    function getClaimableAmount(address _account)
        public
        view
        returns (uint256)
    {
        return tokenHoldersMap.get(_account);
    }

    // function for get eth balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // function for get weth balance
    function getWethBalance() public view returns (uint256) {
        return IERC20(address(weth)).balanceOf(address(this));
    }

    function isAccountOnList(
        address account,
        bytes32[] calldata merkleProof,
        bytes32 merkleRoot
    ) public pure returns (bool) {
        return
            MerkleProof.verify(
                merkleProof,
                merkleRoot,
                keccak256(abi.encodePacked(account))
            );
    }

    // SETTERS
    // function for set merkle root L1
    function setMerkleRootL1(bytes32 _merkleRootL1) public onlyOwner {
        merkleRootL1 = _merkleRootL1;
    }

    // function for set merkle root L2
    function setMerkleRootL2(bytes32 _merkleRootL2) public onlyOwner {
        merkleRootL2 = _merkleRootL2;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function getNumberOfTokenHolders() external view returns (uint256) {
        return tokenHoldersMap.keys.length;
    }

    // function for get elapsed time between two timestamps
    function getElapsedTime(uint256 _startTime, uint256 _endTime)
        public
        view
        returns (uint256)
    {
        console.log("Start time: %s", _startTime);
        console.log("End time: %s", _endTime);
        console.log("Elapsed time: %s", _endTime - _startTime);
        return _endTime - _startTime;
    }

    //internal function for base uri
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    //function allows you to mint an NFT token
    function mint(
        uint256 _mintAmount,
        bytes32[] calldata merkleProofL1,
        bytes32[] calldata merkleProofL2
    ) public payable {
        require(_mintAmount > 0, "Can't mint 0 tokens");

        uint256 requiredEthAmount = calculateMintingCost(
            msg.sender,
            _mintAmount,
            merkleProofL1,
            merkleProofL2
        );

        if (requiredEthAmount > 0) {
            require(
                msg.value >= requiredEthAmount,
                "Ether value sent is not correct"
            );
            sendToOwner(msg.value);
        }

        for (uint256 i = 0; i < _mintAmount; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(msg.sender, tokenId);
            string memory uri = string(
                abi.encodePacked(baseURI, tokenId.toString(), ".json")
            );
            _setTokenURI(tokenId, uri);
            setRoyalties(tokenId, payable(address(this)), 1000);
        }
    }

    function calculateMintingCost(
        address account,
        uint256 _mintAmount,
        bytes32[] calldata merkleProofL1,
        bytes32[] calldata merkleProofL2
    ) public view returns (uint256) {
        //  We need to make sure that for the first Wallet list, minting is free for the first 6 months, after which they will have to pay for it.
        if (
            isAccountOnList(account, merkleProofL1, merkleRootL1) &&
            getElapsedTime(deployedTimestamp, block.timestamp) <=
            merkleRootL1Time
        ) {
            return 0;
        }

        // The second list of wallets will have to wait 6 months, after which they too will be able to mint for free for 6 months
        if (
            isAccountOnList(account, merkleProofL2, merkleRootL2) &&
            getElapsedTime(deployedTimestamp, block.timestamp) >=
            merkleRootL2Time &&
            getElapsedTime(deployedTimestamp, block.timestamp) <=
            merkleRootL2Time * 2
        ) {
            return 0;
        }

        return cost * _mintAmount;
    }

    //function returns the owner
    function walletOfOwner(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    //set the cost of an NFT
    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }

    //set the base URI on IPFS
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function sendToOwner(uint256 _value) internal {
        (bool success, ) = payable(msg.sender).call{value: _value}("");
        require(success, "Transfer failed.");
    }

    //configure royalties for Rariable
    function setRoyalties(
        uint256 _tokenId,
        address payable _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) internal {
        LibPart.Part[] memory _royalties = new LibPart.Part[](1);
        _royalties[0].value = _percentageBasisPoints;
        _royalties[0].account = _royaltiesRecipientAddress;
        _saveRoyalties(_tokenId, _royalties);
    }

    //configure royalties for Mintable using the ERC2981 standard
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        //use the same royalties that were saved for Rariable
        LibPart.Part[] memory _royalties = royalties[_tokenId];
        if (_royalties.length > 0) {
            return (
                _royalties[0].account,
                (_salePrice * _royalties[0].value) / 10000
            );
        }
        return (address(0), 0);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._afterTokenTransfer(from, to, firstTokenId, batchSize);

        // check if from address have zero balance, if so, decrease number of holders
        if (from != address(0) && balanceOf(from) == 0) {
            tokenHoldersMap.remove(from);
        }

        // check if to address have zero balance, if so, increase number of holders
        if (balanceOf(to) == 1) {
            tokenHoldersMap.set(to, 0);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        if (interfaceId == LibRoyaltiesV2._INTERFACE_ID_ROYALTIES) {
            return true;
        }

        if (interfaceId == _INTERFACE_ID_ERC2981) {
            return true;
        }

        return super.supportsInterface(interfaceId);
    }

    function updateRewards() public {
        // get the current balance of the contract
        uint256 wethBalance = IERC20(address(weth)).balanceOf(address(this));

        // check if the contract has any eth, if so, update currentWethContractBalance
        if (
            wethBalance > 0 && // check if the contract has any eth
            wethBalance != currentWethBalance && // check if the contract balance has changed
            wethBalance > currentWethBalance // check if the contract balance has increased
        ) {
            uint256 ethDiff = wethBalance - currentWethBalance;
            console.log("wethContractBalance: %s", wethBalance);
            console.log("currentWethBalance: %s", currentWethBalance);
            console.log("ethDiff: %s", ethDiff);

            // if the difference is greater than 0, send split the difference between the holders
            if (ethDiff > 0) {
                uint256 ethPerHolder = ethDiff / tokenHoldersMap.keys.length;
                console.log("ethPerHolder: %s", ethPerHolder);

                // loop through the holders and send them their share
                for (uint256 i = 0; i < tokenHoldersMap.keys.length; i++) {
                    address holder = tokenHoldersMap.getKeyAtIndex(i);
                    uint256 holderEth = tokenHoldersMap.get(holder);
                    tokenHoldersMap.set(holder, ethPerHolder + holderEth);

                    console.log("holder: %s", holder);
                    console.log(
                        "claimableAmount: %s",
                        tokenHoldersMap.get(holder)
                    );
                }
            }
        }
    }

    // function for claim the rewards
    function claimRewards() public {
        updateRewards();

        require(
            tokenHoldersMap.getIndexOfKey(msg.sender) != -1,
            "You are not a holder"
        );

        // get claimable amount for the sender
        uint256 claimable = tokenHoldersMap.get(msg.sender);
        require(claimable > 0, "You have no rewards to claim");

        // reset the claimable amount for the sender
        tokenHoldersMap.set(msg.sender, 0);

        // update the current balance of the contract
        currentWethBalance =
            IERC20(address(weth)).balanceOf(address(this)) -
            claimable;

        // send the claimable amount to the sender
        IERC20(address(weth)).transfer(msg.sender, claimable);
    }

    // function for withdraw weth from contract
    function withdrawWeth() public onlyOwner {
        IERC20(address(weth)).transfer(
            msg.sender,
            IERC20(address(weth)).balanceOf(address(this))
        );
    }

    // function for withdraw eth from contract
    function withdrawEth() public onlyOwner {
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(success, "Transfer failed.");
    }

    // function for unwrap weth
    function unwrapWeth(uint256 _amount) public onlyOwner {
        weth.withdraw(_amount);
    }
}
