# BugBountyChain

Ethereum escrow platform for vulnerability bounty programs.

Maintainers lock ETH when publishing a bounty. Researchers commit a SHA-256 hash of their report on-chain, then share details privately. After verification, the maintainer releases payment from escrow.

## Features

- MetaMask wallet connection
- Funded bounty creation with scope, reward, and deadline
- On-chain report commitments (vulnerability text stays off-chain)
- Maintainer payout and post-deadline cancel
- Market, Create, and Workspace views

## Stack

- Solidity `0.8.20` · Hardhat · ethers v6
- Express API + static web app
- MetaMask (Hardhat Local `31337`)

## Quick start

```powershell
cd E:\CyberProject
npm install
npx hardhat compile
npx hardhat test
```

### Run

```powershell
# terminal 1
npx hardhat node

# terminal 2
npx hardhat run scripts/deploy.js --network localhost
npm run ui
```

Open http://localhost:3000 → **Connect MetaMask**.

Add network in MetaMask: `http://127.0.0.1:8545`, chain id `31337`.  
Import Hardhat accounts #0 (maintainer) and #1 (researcher).

Full walkthrough and 3-minute video speech: see [`DEMO_GUIDE.md`](DEMO_GUIDE.md).

## Layout

```
contracts/BugBountyEscrow.sol
services/hashService.js
scripts/deploy.js
scripts/demo_workflow.js
test/BugBountyEscrow.test.js
ui/server.js
ui/public/
DEMO_GUIDE.md
```

## Contract

| Function | Role | Purpose |
|---|---|---|
| `createBounty(title, description, durationDays)` | Maintainer | Payable; locks ETH |
| `submitReportHash(bountyId, reportHash)` | Researcher | Commits finding hash |
| `releasePayout(bountyId, confirmedHash)` | Maintainer | Pays researcher |
| `cancelBounty(bountyId)` | Maintainer | Refund after deadline if Active |
| `getBounty` / `getBounties` | Anyone | Read state |
