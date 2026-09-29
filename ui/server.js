const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { generateReportHash, verifyReportHash } = require("../services/hashService");

const app = express();
const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CHAIN_ID = Number(process.env.CHAIN_ID || 31337);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readContractMeta() {
  const file = path.join(__dirname, "contract-address.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readAbi() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "BugBountyEscrow.sol",
    "BugBountyEscrow.json"
  );
  if (!fs.existsSync(artifactPath)) return null;
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "BugBountyChain", time: new Date().toISOString() });
});

app.get("/api/config", (_req, res) => {
  const meta = readContractMeta();
  const abi = readAbi();

  if (!meta || !abi) {
    return res.status(503).json({
      error:
        "Application is not ready. Compile the contract and deploy to your local network first.",
      steps: [
        "npx hardhat compile",
        "npx hardhat node",
        "npx hardhat run scripts/deploy.js --network localhost",
      ],
    });
  }

  res.json({
    name: "BugBountyChain",
    rpcUrl: RPC_URL,
    chainId: CHAIN_ID,
    chainName: "Hardhat Local",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    contractAddress: meta.address,
    deployedAt: meta.deployedAt,
    abi,
  });
});

app.post("/api/hash", (req, res) => {
  try {
    const { report } = req.body || {};
    if (report === undefined || report === null || report === "") {
      return res.status(400).json({ error: "Provide a report string or object." });
    }
    const hash = generateReportHash(report);
    res.json({ hash, algorithm: "sha256" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hash/verify", (req, res) => {
  try {
    const { report, hash } = req.body || {};
    if (!report || !hash) {
      return res.status(400).json({ error: "Provide report and hash." });
    }
    res.json({ valid: verifyReportHash(report, hash) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`BugBountyChain running at http://localhost:${PORT}`);
});
