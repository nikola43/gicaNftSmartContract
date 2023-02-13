// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

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
/*
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
*/

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint256 wad) external;
}

contract KittieNft is ERC721, ERC721Enumerable, Ownable, RoyaltiesV2Impl {
    using Strings for uint256;
    using IterableMapping for IterableMapping.Map;
    IWETH public weth;
    uint8 public nftType;
    uint8 public discountPercentage;

    string public baseURI;
    string public baseExtension;

    //set the cost to mint each NFT
    uint256 public cost;

    //set the max supply of NFT's
    uint256 public maxSupply;

    //is the contract paused from minting an NFT
    bool public paused;

    //are the NFT's revealed (viewable)? If true users can see the NFTs.
    //if false everyone sees a reveal picture
    bool public revealed;

    //the uri of the not revealed picture
    string public notRevealedUri;

    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    // mapping for store holders addresses
    IterableMapping.Map private tokenHoldersMap;

    // mapping for store claimable amount
    mapping(address => uint256) public claimableAmount;

    // merkle root for the list 1
    bytes32 public merkleRootL1;
    uint256 public merkleRootL1Time;

    // merkle root for the list 2
    bytes32 public merkleRootL2;
    uint256 public merkleRootL2Time;

    // deployed timestamp
    uint256 public deployedTimestamp;

    uint256 public currentWethContractBalance;

    constructor(
        uint8 _nftType,
        uint8 _discountPercentage,
        string memory _newBaseURI,
        uint256 _cost,
        uint256 _maxSupply,
        string memory _name,
        string memory _symbol,
        string memory _initBaseURI,
        string memory _initNotRevealedUri
    ) ERC721(_name, _symbol) {
        //weth = IWETH(0x5B67676a984807a212b1c59eBFc9B3568a474F0a); // mumbai
        //configuration
        weth = IWETH(0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6);
        nftType = _nftType;
        discountPercentage = _discountPercentage;
        baseURI = _newBaseURI;
        baseExtension = ".json";

        //set the cost to mint each NFT
        cost = _cost;

        //set the max supply of NFT's
        maxSupply = _maxSupply;

        //is the contract paused from minting an NFT
        paused = false;

        //are the NFT's revealed (viewable)? If true users can see the NFTs.
        //if false everyone sees a reveal picture
        revealed = true;

        //the uri of the not revealed picture
        notRevealedUri = "";

        deployedTimestamp = block.timestamp;

        merkleRootL1Time = 6 * 30 days;
        merkleRootL2Time = 6 * 30 days;

        currentWethContractBalance = 0;

        setBaseURI(_initBaseURI);
        setNotRevealedURI(_initNotRevealedUri);
    }

    receive() external payable {
        /*
        console.log("Received Ether: %s", msg.value);
        // loop through the minters and add them to the claimable amount
        for (uint256 i = 1; i <= mintersCounter; i++) {
            address minter = minters[i];
            claimableAmount[minter] += msg.value / mintersCounter;
        }
        */
    }

    // function for set merkle root L1
    function setMerkleRootL1(bytes32 _merkleRootL1) public onlyOwner {
        merkleRootL1 = _merkleRootL1;
    }

    // function for set merkle root L2
    function setMerkleRootL2(bytes32 _merkleRootL2) public onlyOwner {
        merkleRootL2 = _merkleRootL2;
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
        uint256 supply = totalSupply();
        require(!paused, "Sale paused");
        require(_mintAmount > 0, "Can't mint 0 tokens");
        require(
            supply + _mintAmount <= maxSupply,
            "Purchase would exceed max supply"
        );

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

        for (uint256 i = 1; i <= _mintAmount; i++) {
            uint256 tokenId = supply + i;
            _safeMint(msg.sender, tokenId);
            // set the royalties for the NFT
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

    //input a NFT token ID and get the IPFS URI
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "ERC721Metadata: URI nonexistent");

        if (revealed == false) {
            return notRevealedUri;
        }

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        tokenId.toString(),
                        baseExtension
                    )
                )
                : "";
    }

    //only owner
    function reveal() public onlyOwner {
        revealed = true;
    }

    //set the cost of an NFT
    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }

    //set the not revealed URI on IPFS
    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    //set the base URI on IPFS
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension)
        public
        onlyOwner
    {
        baseExtension = _newBaseExtension;
    }

    //pause the contract and do not allow any more minting
    function pause(bool _state) public onlyOwner {
        paused = _state;
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);

        currentWethContractBalance = IERC20(address(weth)).balanceOf(
            address(this)
        );
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._afterTokenTransfer(from, to, firstTokenId, batchSize);
        console.log("After token transfer");

        // check if from address have zero balance, if so, decrease number of holders
        if (from != address(0) && balanceOf(from) == 0) {
            tokenHoldersMap.remove(from);
        }
        console.log("holdersCounter: %s", tokenHoldersMap.keys.length);

        // check if to address have zero balance, if so, increase number of holders
        if (balanceOf(to) == 1) {
            tokenHoldersMap.set(to, 0);
        }
        console.log("holdersCounter: %s", tokenHoldersMap.keys.length);

        // get the current balance of the contract
        uint256 wethContractBalance = IERC20(address(weth)).balanceOf(
            address(this)
        );

        // calculate the difference between the current balance and the previous balance
        uint256 ethDiff = wethContractBalance - currentWethContractBalance;

        // if the difference is greater than 0, send split the difference between the holders
        if (ethDiff > 0) {
            uint256 ethPerHolder = ethDiff / tokenHoldersMap.keys.length;
            console.log("ethPerHolder: %s", ethPerHolder);

            // loop through the holders and send them their share
            for (uint256 i = 0; i < tokenHoldersMap.keys.length; i++) {
                address holder = tokenHoldersMap.getKeyAtIndex(i);
                console.log("holder: %s", holder);
                claimableAmount[holder] += ethPerHolder;
                console.log("claimableAmount: %s", claimableAmount[holder]);
            }
        }

        console.log("ethDiff: %s", ethDiff);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721, IERC721) {
        super.safeTransferFrom(from, to, tokenId);
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

    // function for claim the rewards
    function claimRewards() public {
        require(
            tokenHoldersMap.getIndexOfKey(msg.sender) != -1,
            "You are not a holder"
        );
        require(
            claimableAmount[msg.sender] > 0,
            "You have no rewards to claim"
        );
        claimableAmount[msg.sender] = 0;
        IERC20(address(weth)).transfer(msg.sender, claimableAmount[msg.sender]);
    }

    // function for get eth balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // function for get weth balance
    function getWethBalance() public view returns (uint256) {
        return IERC20(address(weth)).balanceOf(address(this));
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
