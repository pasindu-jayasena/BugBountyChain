const hre = require("hardhat");
const { generateReportHash } = require("../services/hashService");

async function main() {
  console.log("BugBountyChain workflow\n");

  const [maintainer, researcher] = await hre.ethers.getSigners();
  console.log("Maintainer:", maintainer.address);
  console.log("Researcher:", researcher.address);

  const Escrow = await hre.ethers.getContractFactory("BugBountyEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  console.log("Contract:", await escrow.getAddress());

  const deposit = hre.ethers.parseEther("1.0");
  await (
    await escrow
      .connect(maintainer)
      .createBounty(
        "Login endpoint SQL injection bounty",
        "In-scope: /api/login and auth middleware. Out of scope: third-party CDNs.",
        14,
        { value: deposit }
      )
  ).wait();
  console.log("Bounty #1 funded with 1.0 ETH");

  const report = {
    title: "SQL injection on /api/login",
    severity: "high",
    details: "username parameter is not parameterized",
    poc: "admin' OR '1'='1",
  };
  const reportHash = generateReportHash(report);
  console.log("Report commitment:", reportHash);

  await (
    await escrow.connect(researcher).submitReportHash(1, reportHash)
  ).wait();
  console.log("Claim submitted");

  const before = await hre.ethers.provider.getBalance(researcher.address);
  await (await escrow.connect(maintainer).releasePayout(1, reportHash)).wait();
  const after = await hre.ethers.provider.getBalance(researcher.address);

  console.log(
    "Researcher received:",
    hre.ethers.formatEther(after - before),
    "ETH"
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
