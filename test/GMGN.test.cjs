const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GMGN", function () {
  async function deploy() {
    const [owner, other] = await ethers.getSigners();
    const GMGN = await ethers.getContractFactory("GMGN");
    const contract = await GMGN.deploy();
    await contract.waitForDeployment();
    return { contract, owner, other };
  }

  it("records a GM greeting and increments the sender and global counters", async function () {
    const { contract, owner } = await deploy();
    await expect(contract.sayGM()).to.emit(contract, "GM");
    expect(await contract.totalGM()).to.equal(1n);
    expect(await contract.gmCount(owner.address)).to.equal(1n);
    expect(await contract.totalGN()).to.equal(0n);
  });

  it("records GN greetings independently", async function () {
    const { contract, owner } = await deploy();
    await expect(contract.sayGN()).to.emit(contract, "GN");
    expect(await contract.totalGN()).to.equal(1n);
    expect(await contract.gnCount(owner.address)).to.equal(1n);
    expect(await contract.totalGM()).to.equal(0n);
  });

  it("allows any wallet to greet repeatedly", async function () {
    const { contract, other } = await deploy();
    await contract.connect(other).sayGM();
    await contract.connect(other).sayGM();
    await contract.connect(other).sayGN();
    expect(await contract.gmCount(other.address)).to.equal(2n);
    expect(await contract.gnCount(other.address)).to.equal(1n);
    expect(await contract.totalGM()).to.equal(2n);
    expect(await contract.totalGN()).to.equal(1n);
  });
});
