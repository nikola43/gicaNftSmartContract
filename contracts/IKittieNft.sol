// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IKittieNft {
    function mint(
        address account,
        uint256 _mintAmount,
        bytes32[] calldata merkleProofL1,
        bytes32[] calldata merkleProofL2
    ) external payable;

    function claimRewards(address account) external;

    function calculateMintingCost(
        address account,
        uint256 _mintAmount,
        bytes32[] calldata merkleProofL1,
        bytes32[] calldata merkleProofL2
    ) external view returns (uint256);

    function getClaimableAmount(address _account)
        external
        view
        returns (uint256);
}
