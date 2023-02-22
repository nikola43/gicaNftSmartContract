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
    mapping(address => bool) private minters;

    IWETH public weth;
    uint8 public nftType;
    uint8 public discountPercentage;

    string public baseURI;

    //set the cost to mint each NFT
    uint256 public cost;

    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    // upggrade by @shubhangdev backup
    // mapping for store holders addresses and claimable amount
    // IterableMapping.Map private tokenHoldersMap;

    // merkle root for the list 1
    bytes32 public merkleRootL1;
    uint256 public merkleRootL1Time;

    // merkle root for the list 2
    bytes32 public merkleRootL2;
    uint256 public merkleRootL2Time;

    // deployed timestamp
    uint256 public deployedTimestamp;

    uint256 public lastWethBalance;

    uint256 public maxSupply;

    // upggrade by @shubhangdev
    mapping(uint256 => uint256) private rewardsClaimed;
    mapping(uint256 => uint256) private rewardsBank;
    uint256[] private rewardsBankKeys;
    uint256 private lastRewardBalance;
    


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

        merkleRootL1Time = 12 hours; // todo change to 6 months
        merkleRootL2Time = 12 hours; // todo change to 6 months

        lastWethBalance = 0;

        maxSupply = _maxSupply;

        setBaseURI(_initBaseURI);
    }

    receive() external payable {
        weth.deposit{value: msg.value}();
    }

    // upgrade by @shubhangdev
    function getRewardsChange() internal returns(uint256 wethBalanceChange){
        uint256 wethBalance = getWethBalance();
        if (wethBalance<=lastRewardBalance){
            wethBalanceChange=0;
            lastRewardBalance = wethBalance;
        } else {
            wethBalanceChange = wethBalance - lastRewardBalance;
        }
    }

    // upgrade by @shubhangdev
    function getLastRewardsBankKey() internal view returns(uint256 lastRewardsBankKey) {
        if (rewardsBankKeys.length == 0){
            lastRewardsBankKey = 0;
        } else {
            lastRewardsBankKey = rewardsBankKeys[rewardsBankKeys.length -1];
        }
    }

    // upgrade by @shubhangdev
    function updateRewardsBank() internal {
        uint256 wethBalanceChange = getRewardsChange();
        if (wethBalanceChange>0){
            uint256 tokenId = _tokenIdCounter.current()-1;
            uint256 lastRewardsBankKey = getLastRewardsBankKey();
            // assuming _tokenIdCounter is never decremented
            if (tokenId > lastRewardsBankKey || tokenId == 0){
                rewardsBankKeys.push(tokenId);
            }
            rewardsBank[tokenId] += (wethBalanceChange / (tokenId+1));
        }
    }


    // upgrade by @shubhangdev
    // reward Calculation is dependent on tokens being minted with incrementing tokenIds and no burns are taking place
    function getTokenAccumulatedRewards(uint256 tokenId) internal view returns(uint256 accumulatedRewards) {
        for (uint256 index = rewardsBankKeys.length; index > 0; index--) {
            uint256 key = rewardsBankKeys[index-1];
            if (key >= tokenId) {
                accumulatedRewards += rewardsBank[key];
            } else {
                return accumulatedRewards;
            }
        }
    }

    // upgrade by @shubhangdev
    // this function is to be called as view on the frontend to get claimable rewards
    function getClaimableRewards(uint256 tokenId) public returns(uint256 claimableRewards) {
        updateRewardsBank();
        uint256 accumulatedRewards = getTokenAccumulatedRewards(tokenId);
        claimableRewards = accumulatedRewards - rewardsClaimed[tokenId];
        
    }

    // upgrade by @shubhangdev  
    // function can be called by anyone but rewards are dispatched to owner only
    // on the frontend fetch tokens owned by the owner and call the claim function multiple times accordingly
    function claimRewards(uint256 tokenId) public returns(uint256 claimableRewards) {
        claimableRewards = getClaimableRewards(tokenId);
        address tokenOwner = ownerOf(tokenId);
        rewardsClaimed[tokenId] += claimableRewards;
        IERC20(address(weth)).transfer(tokenOwner, claimableRewards);
        getRewardsChange();
    }



    


    // upgrade by @shubhangdev backup
    // GETTERS
    // function getClaimableAmount(address _account)
    //     external
    //     view
    //     returns (uint256)
    // {
    //     return tokenHoldersMap.get(_account);
    // }

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

    function setMerkleRootL1Time(uint256 _merkleRootL1Time) public onlyOwner {
        merkleRootL1Time = _merkleRootL1Time;
    }

    function setMerkleRootL2Time(uint256 _merkleRootL2Time) public onlyOwner {
        merkleRootL2Time = _merkleRootL2Time;
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

    // upgrade by @shubhangdev backup

    // function getNumberOfTokenHolders() external view returns (uint256) {
    //     return tokenHoldersMap.keys.length;
    // }

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
        address account,
        uint256 _mintAmount,
        bytes32[] calldata merkleProofL1,
        bytes32[] calldata merkleProofL2
    ) external payable {
        require(_mintAmount > 0, "Can't mint 0 tokens");

        uint256 requiredEthAmount = this.calculateMintingCost(
            account,
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
            _safeMint(account, tokenId);
            string memory uri = string(
                abi.encodePacked(baseURI, tokenId.toString(), ".json")
            );
            _setTokenURI(tokenId, uri);
            setRoyalties(tokenId, payable(address(this)), 1000);
            _tokenIdCounter.increment();
        }
        minters[account] = true;
    }

    function calculateMintingCost(
        address account,
        uint256 _mintAmount,
        bytes32[] calldata merkleProofL1,
        bytes32[] calldata merkleProofL2
    ) external view returns (uint256) {
        //  We need to make sure that for the first Wallet list, minting is free for the first 6 months, after which they will have to pay for it.
        if (
            !minters[account] &&
            isAccountOnList(account, merkleProofL1, merkleRootL1) &&
            getElapsedTime(deployedTimestamp, block.timestamp) <=
            merkleRootL1Time
        ) {
            return 0;
        }

        // The second list of wallets will have to wait 6 months, after which they too will be able to mint for free for 6 months
        if (
            !minters[account] &&
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
        (bool success, ) = payable(owner()).call{value: _value}("");
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

    // upgrade by @shubhangdev upgrade
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._afterTokenTransfer(from, to, firstTokenId, batchSize);
        updateRewardsBank();

        // // check if from address have zero balance, if so, decrease number of holders
        // if (from != address(0) && balanceOf(from) == 0) {
        //     tokenHoldersMap.remove(from);
        // }

        // // check if to address have zero balance, if so, increase number of holders
        // if (to != address(0) && balanceOf(to) == 1) {
        //     tokenHoldersMap.set(to, 0);
        // }
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

    // upgrade by @shubhangdev backup


    // function calculateClaimableRewards(address account)
    //     public
    //     view
    //     returns (uint256)
    // {
    //     uint256 claimable = 0;

    //     // get the current balance of the contract
    //     uint256 wethBalance = IERC20(address(weth)).balanceOf(address(this));

    //     // if the contract has more eth, split the difference between the holders
    //     if (wethBalance > 0) {
    //         uint256 ethPerHolder = wethBalance / tokenHoldersMap.keys.length;

    //         for (uint256 i = 0; i < tokenHoldersMap.keys.length; i++) {
    //             address holder = tokenHoldersMap.getKeyAtIndex(i);
    //             if (holder == account) {
    //                 uint256 holderEth = tokenHoldersMap.get(holder);
    //                 claimable = holderEth + ethPerHolder;
    //                 break;
    //             }
    //         }
    //     }

    //     return claimable;
    // }


    // upgrade by @shubhangdev backup

    // function updateRewards() public {
    //     // get the current balance of the contract
    //     uint256 wethBalance = IERC20(address(weth)).balanceOf(address(this));

    //     // check if contract have more or less eth than the last time we checked
    //     if (wethBalance != lastWethBalance) {
            
    //         // if the contract has more eth, split the difference between the holders
    //         if (wethBalance > lastWethBalance) {
    //             uint256 ethDiff = wethBalance - lastWethBalance;
    //             uint256 ethPerHolder = ethDiff / tokenHoldersMap.keys.length;

    //             // loop through the holders and send them their share
    //             for (uint256 i = 0; i < tokenHoldersMap.keys.length; i++) {
    //                 address holder = tokenHoldersMap.getKeyAtIndex(i);
    //                 uint256 holderEth = tokenHoldersMap.get(holder);
    //                 tokenHoldersMap.set(holder, ethPerHolder + holderEth);
    //                 console.log("holder: %s", holder);
    //                 console.log("holderBalance: %s", ethPerHolder + holderEth);
    //             }
    //         }

    //         // update the last balance of the contract
    //         lastWethBalance = wethBalance;
    //     }
    // }


    // upgrade by @shubhangdev backup
    // // function for claim the rewards
    // function claimRewards(address account) external {
    //     updateRewards();

    //     require(
    //         tokenHoldersMap.getIndexOfKey(account) != -1,
    //         "You are not a holder"
    //     );

    //     // get claimable amount for the sender
    //     uint256 claimable = tokenHoldersMap.get(account);
    //     require(claimable > 0, "You have no rewards to claim");

    //     // reset the claimable amount for the sender
    //     tokenHoldersMap.set(account, 0);

    //     // update the current balance of the contract
    //     lastWethBalance -= claimable;

    //     // send the claimable amount to the sender
    //     IERC20(address(weth)).transfer(account, claimable);
    // }

    // function for withdraw weth from contract
    function withdrawWeth() public onlyOwner {
        IERC20(address(weth)).transfer(
            owner(),
            IERC20(address(weth)).balanceOf(address(this))
        );
    }

    // function for withdraw eth from contract
    function withdrawEth() public onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}(
            ""
        );
        require(success, "Transfer failed.");
    }

    // function for unwrap weth
    function unwrapWeth(uint256 _amount) public onlyOwner {
        weth.withdraw(_amount);
    }

    // function for wrap eth
    function wrapEth(uint256 _amount) public onlyOwner {
        weth.deposit{value: _amount}();
    }
}
