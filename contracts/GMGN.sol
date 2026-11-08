// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GM-GN
/// @notice On-chain GM / GN greetings. No tokens are transferred.
contract GMGN {
    event GM(address indexed sender, uint256 timestamp);
    event GN(address indexed sender, uint256 timestamp);

    uint256 public totalGM;
    uint256 public totalGN;
    mapping(address => uint256) public gmCount;
    mapping(address => uint256) public gnCount;

    function sayGM() external {
        unchecked {
            totalGM++;
            gmCount[msg.sender]++;
        }
        emit GM(msg.sender, block.timestamp);
    }

    function sayGN() external {
        unchecked {
            totalGN++;
            gnCount[msg.sender]++;
        }
        emit GN(msg.sender, block.timestamp);
    }
}
