const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { generateReportHash } = require("../services/hashService");

describe("BugBountyEscrow", function () {
  let escrow;
  let maintainer;
  let researcher;
  let outsider;

  const ONE_ETH = ethers.parseEther("1.0");
  const report = {
    title: "SQL Injection in Authentication Endpoint",
    severity: "CRITICAL",
    target: "api.targetservice.io/v1/login",
    details: "Parameter username allows boolean-based blind injection",
    pocPayload: "admin' OR 1=1--",
  };

  async function createSampleBounty(signer = maintainer) {
    return escrow
      .connect(signer)
      .createBounty(
        "Auth service bounty",
        "Reward for authenticated RCE or SQLi on the login API.",
        7,
        { value: ONE_ETH }
      );
  }

  beforeEach(async function () {
    [maintainer, researcher, outsider] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("BugBountyEscrow");
    escrow = await factory.deploy();
    await escrow.waitForDeployment();
  });

  it("creates a funded bounty with title and description", async function () {
    await createSampleBounty();

    const bounty = await escrow.getBounty(1);
    expect(bounty.maintainer).to.equal(maintainer.address);
    expect(bounty.title).to.equal("Auth service bounty");
    expect(bounty.description).to.include("login API");
    expect(bounty.amount).to.equal(ONE_ETH);
    expect(bounty.status).to.equal(0);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(
      ONE_ETH
    );
  });

  it("accepts a researcher report hash commitment", async function () {
    await createSampleBounty();

    const reportHash = generateReportHash(report);
    await expect(escrow.connect(researcher).submitReportHash(1, reportHash))
      .to.emit(escrow, "ReportSubmitted")
      .withArgs(1, researcher.address, reportHash, anyValue);

    const bounty = await escrow.getBounty(1);
    expect(bounty.status).to.equal(1);
    expect(bounty.researcher).to.equal(researcher.address);
    expect(bounty.reportHash).to.equal(reportHash);
  });

  it("blocks empty hashes and maintainer self-submit", async function () {
    await createSampleBounty();
    const reportHash = generateReportHash(report);

    await expect(
      escrow.connect(maintainer).submitReportHash(1, reportHash)
    ).to.be.revertedWith("Maintainer cannot submit own bounty");

    await expect(
      escrow.connect(researcher).submitReportHash(1, ethers.ZeroHash)
    ).to.be.revertedWith("Invalid report hash");
  });

  it("releases escrowed ETH to the researcher", async function () {
    await createSampleBounty();
    const reportHash = generateReportHash(report);
    await escrow.connect(researcher).submitReportHash(1, reportHash);

    await expect(
      escrow.connect(maintainer).releasePayout(1, reportHash)
    ).to.changeEtherBalance(researcher, ONE_ETH);

    const bounty = await escrow.getBounty(1);
    expect(bounty.status).to.equal(2);
    expect(bounty.amount).to.equal(0);
  });

  it("rejects unauthorized or mismatched payouts", async function () {
    await createSampleBounty();
    const reportHash = generateReportHash(report);
    await escrow.connect(researcher).submitReportHash(1, reportHash);

    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake report"));

    await expect(
      escrow.connect(outsider).releasePayout(1, reportHash)
    ).to.be.revertedWith("Only bounty maintainer");

    await expect(
      escrow.connect(maintainer).releasePayout(1, fakeHash)
    ).to.be.revertedWith("Hash does not match claim");
  });

  it("refunds maintainer after deadline when still Active", async function () {
    await createSampleBounty();

    await expect(
      escrow.connect(maintainer).cancelBounty(1)
    ).to.be.revertedWith("Deadline not reached");

    await time.increase(8 * 24 * 60 * 60);

    await expect(
      escrow.connect(maintainer).cancelBounty(1)
    ).to.changeEtherBalance(maintainer, ONE_ETH);

    const bounty = await escrow.getBounty(1);
    expect(bounty.status).to.equal(3);
  });

  it("returns a bounty range via getBounties", async function () {
    await createSampleBounty();
    await escrow
      .connect(maintainer)
      .createBounty("Second program", "Scope: web apps", 14, {
        value: ethers.parseEther("0.5"),
      });

    const list = await escrow.getBounties(1, 2);
    expect(list.length).to.equal(2);
    expect(list[0].title).to.equal("Auth service bounty");
    expect(list[1].title).to.equal("Second program");
  });
});
