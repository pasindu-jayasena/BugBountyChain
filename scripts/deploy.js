const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Escrow = await hre.ethers.getContractFactory("BugBountyEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("BugBountyEscrow deployed to:", address);

  const outPath = path.join(__dirname, "..", "ui", "contract-address.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        address,
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log("Saved address to ui/contract-address.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
