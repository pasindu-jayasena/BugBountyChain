# BugBountyChain — Full Demo Guide (MetaMask)

**Current system:** MetaMask-only web app + Hardhat local chain + `BugBountyEscrow` smart contract.

This guide matches the latest UI:

- Header: **Market** · **Create** · **Workspace** · **Connect MetaMask**
- Hero: brand, Connect MetaMask, Create a program
- No local-key connect (MetaMask only)

Use this for live demos and your **3-minute video**.

---

## 0. Quick start (if already set up)

```powershell
# Terminal 1
cd E:\CyberProject
npx hardhat node

# Terminal 2
cd E:\CyberProject
npx hardhat run scripts/deploy.js --network localhost
npm run ui
```

Then open [http://localhost:3000](http://localhost:3000), connect MetaMask on **Hardhat Local** (`31337`), and run the walkthrough in Section 5.

---

## 1. What the system does

| Role | What they do in the app |
|---|---|
| **Maintainer** | Connect MetaMask → **Create** bounty → lock ETH → later **Release payout** in Workspace |
| **Researcher** | Connect MetaMask → open bounty → **Compute hash** → **Submit claim** |
| **Contract** | Holds ETH, stores report hash, pays researcher when maintainer confirms the hash |

Statuses you will see on bounty cards:

1. **Active** — funded, waiting for a claim  
2. **Under review** — researcher hash submitted  
3. **Resolved** — payout released  
4. **Cancelled** — expired unused bounty refunded  

Important: vulnerability details are **not** stored on-chain. Only the SHA-256 commitment hash is.

---

## 2. Project files you care about for demo

```text
E:\CyberProject\
  contracts\BugBountyEscrow.sol
  scripts\deploy.js
  ui\server.js
  ui\public\index.html      ← Market / Create / Workspace
  ui\contract-address.json  ← written by deploy
  DEMO_GUIDE.md             ← this file
  README.md
```

---

## 3. One-time setup

### 3.1 Requirements

- Node.js 18+
- MetaMask browser extension
- Project at `E:\CyberProject`

### 3.2 Install and verify

```powershell
cd E:\CyberProject
npm install
npx hardhat compile
npx hardhat test
```

Expect all tests to pass (currently 7 tests).

---

## 4. Every demo session — start stack + MetaMask

### 4.1 Terminal 1 — Hardhat node

```powershell
cd E:\CyberProject
npx hardhat node
```

Leave this running.

| Setting | Value |
|---|---|
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Network name | Hardhat Local |

Hardhat accounts for MetaMask import (**localhost only — never use on mainnet**):

| Role | Account | Address | Private key |
|---|---|---|---|
| Maintainer | #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| Researcher | #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |

### 4.2 Terminal 2 — deploy + UI

```powershell
cd E:\CyberProject
npx hardhat run scripts/deploy.js --network localhost
npm run ui
```

You should see something like:

```text
BugBountyEscrow deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
BugBountyChain running at http://localhost:3000
```

Open: [http://localhost:3000](http://localhost:3000)

Hard-refresh after UI changes: `Ctrl + F5`

### 4.3 Configure MetaMask (once)

1. Open MetaMask → **Settings → Networks → Add network manually**
2. Enter:

| Field | Value |
|---|---|
| Network name | `Hardhat Local` |
| New RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

3. Switch MetaMask network to **Hardhat Local**
4. Import Maintainer key (#0), then Researcher key (#1)
5. Confirm both show large ETH balances on Hardhat Local

### 4.4 After every Hardhat node restart

Restarting `npx hardhat node` wipes chain state.

1. Redeploy: `npx hardhat run scripts/deploy.js --network localhost`
2. Keep / restart UI: `npm run ui`
3. If MetaMask txs fail with nonce errors: MetaMask → account → Advanced → clear activity / reset account for this network
4. Refresh the browser

---

## 5. Full live walkthrough (exact UI clicks)

Practice this once before recording the video.

### Step 1 — Connect as Maintainer

1. In MetaMask, select **Maintainer (#0)**
2. Confirm network is **Hardhat Local**
3. Open [http://localhost:3000](http://localhost:3000)
4. Click **Connect MetaMask** (header or hero button)
5. Approve connection / network switch in MetaMask
6. Top-right wallet chip should show:
   - network name
   - shortened address
   - ETH balance

### Step 2 — Create a bounty (Maintainer)

1. Click **Create** in the top nav  
   (or hero button **Create a program**)
2. Fill the form:

| Field | Demo value |
|---|---|
| Program title | `Login API security program` |
| Scope and rules | `In-scope: /api/login. Looking for SQLi or auth bypass.` |
| Duration (days) | `30` |
| Reward (ETH) | `1.0` |

3. Click **Publish & lock funds**
4. Confirm the transaction in MetaMask
5. Wait for success toast: **Bounty published**
6. App returns to **Market**
7. Confirm the card shows:
   - badge **Active**
   - reward **1.0 ETH**

### Step 3 — Submit claim (Researcher)

1. Open MetaMask → switch account to **Researcher (#1)**
2. In the app, click **Connect MetaMask** again if the address chip did not update
3. On **Market**, click the bounty card  
   → Workspace opens with program detail on the left
4. In **Submit claim**, use:

| Field | Demo value |
|---|---|
| Bounty ID | `1` (or the ID on the card) |
| Finding title | `SQL injection on /api/login` |
| Severity | `high` |
| Technical details | `username is concatenated into the SQL query` |
| Proof of concept | `admin' OR '1'='1` |

5. Click **Compute hash**  
   → Commitment hash appears (starts with `0x…`)
6. Click **Submit claim**
7. Confirm in MetaMask
8. Toast: **Claim committed on-chain**
9. Status badge becomes **Under review**
10. Detail pane shows researcher address + report hash

### Step 4 — Release payout (Maintainer)

1. MetaMask → switch back to **Maintainer (#0)**
2. App → **Connect MetaMask** again if needed
3. Open the same bounty (Market card or Workspace)
4. In **Review & settle**:
   - Bounty ID filled
   - Confirmed report hash filled (same as claim hash)
5. Click **Release payout**
6. Confirm in MetaMask
7. Toast: **Payout released**
8. Status becomes **Resolved**
9. Switch MetaMask to Researcher — balance increased by about **1 ETH**

### Step 5 — Optional cancel demo

- **Cancel expired** only works if status is still **Active** and deadline has passed
- Clicking it too early should fail (good to mention in Q&A)
- Skip this in the 3-minute video if time is tight

---

## 6. UI map (what each screen is for)

| Screen | Purpose |
|---|---|
| **Hero / Market** | Overview + list of on-chain bounties |
| **Create** | Maintainer publishes program and locks ETH |
| **Workspace** | Claim form (researcher) + Review & settle (maintainer) |
| **Wallet chip** | Shows connected MetaMask account + balance |
| **Toasts** | Transaction progress / success / errors |

---

## 7. Three-minute video plan (~180 seconds)

### Recording setup

- Browser: http://localhost:3000 (zoom 110–125%)
- MetaMask popups visible when confirming
- Hardhat node + deployed contract + UI already running
- MetaMask on Hardhat Local, Maintainer selected before record
- Target length: **2:50 – 3:00**

### Timeline

| Time | On screen | Say |
|---|---|---|
| 0:00–0:25 | Hero (BugBountyChain) | Block 1 |
| 0:25–0:50 | Connect MetaMask | Block 2 |
| 0:50–1:30 | Create → Publish → Market Active | Block 3 |
| 1:30–2:15 | Switch Researcher → Compute hash → Submit claim | Block 4 |
| 2:15–2:50 | Switch Maintainer → Release payout → Resolved | Block 5 |
| 2:50–3:00 | Final Resolved / balances | Block 6 |

---

## 8. Full speech script (read aloud)

### Block 1 — Intro (0:00–0:25)

“Hello. For our Blockchain and Cyber Security project, we present **BugBountyChain** — a decentralized escrow platform for vulnerability disclosure. In normal bug bounty programs, researchers often have no guarantee they will be paid after reporting a serious issue. If they publish too early, attackers can exploit the bug before a patch exists.”

### Block 2 — Solution + connect (0:25–0:50)

“BugBountyChain solves this with an Ethereum smart contract and MetaMask. The maintainer locks bounty funds first. The researcher commits only a cryptographic hash of the report on-chain, so the vulnerability details stay private. I’m connecting MetaMask to our Hardhat local network with the maintainer account.”

*(Click **Connect MetaMask**, approve.)*

### Block 3 — Create bounty (0:50–1:30)

“Now the maintainer opens Create and publishes a bounty program. We set the title, scope, duration, and a reward of one ETH. When I click Publish and lock funds, MetaMask asks for confirmation, and the ETH is locked inside the escrow contract — not held by a trusted middleman.”

*(Fill Create form → **Publish & lock funds** → confirm → show Market card **Active**.)*

### Block 4 — Researcher claim (1:30–2:15)

“I switch MetaMask to the researcher account and reconnect. From the Market I open the bounty workspace, enter the finding details, and compute a SHA-256 commitment hash. Only this hash is submitted on-chain. That proves when the discovery was registered, without leaking the exploit.”

*(**Compute hash** → **Submit claim** → confirm → show **Under review**.)*

### Block 5 — Payout (2:15–2:50)

“After reviewing the private report off-chain, the maintainer confirms the hash matches the on-chain commitment and releases the payout. The smart contract transfers the escrowed ETH directly to the researcher’s wallet.”

*(Switch Maintainer → **Release payout** → confirm → show **Resolved**.)*

### Block 6 — Close (2:50–3:00)

“In summary, BugBountyChain uses blockchain escrow and hash commitments to make bug bounty payments transparent, enforceable, and safer for both maintainers and security researchers. Thank you.”

---

## 9. Condensed speech (backup if short on time)

“This is BugBountyChain, an Ethereum escrow for bug bounties. Maintainers lock ETH when posting a program. Researchers commit a SHA-256 hash of their report without revealing the vulnerability. After verification, the contract pays the researcher. Here we connect MetaMask, publish a one-ETH bounty, submit a researcher claim hash, and release the payout. The result is transparent funding with private disclosure until payment is approved. Thank you.”

---

## 10. Recording checklist

### Before record

- [ ] `npx hardhat node` running  
- [ ] Contract deployed (`scripts/deploy.js --network localhost`)  
- [ ] `npm run ui` running on port 3000  
- [ ] http://localhost:3000 open (hard-refreshed)  
- [ ] MetaMask on **Hardhat Local** (`31337`)  
- [ ] Maintainer (#0) and Researcher (#1) imported  
- [ ] Maintainer selected in MetaMask  
- [ ] UI shows **Connect MetaMask** (no local connect button)  
- [ ] Mic ready, zoom comfortable  

### During record

- [ ] Connect MetaMask (Maintainer)  
- [ ] Create → Publish & lock funds (`1.0 ETH`)  
- [ ] Show Market card **Active**  
- [ ] Switch to Researcher + reconnect  
- [ ] Compute hash → Submit claim  
- [ ] Show **Under review**  
- [ ] Switch to Maintainer + reconnect  
- [ ] Release payout  
- [ ] Show **Resolved** + mention researcher balance increase  

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| “MetaMask is not installed” | Install MetaMask extension, reload page |
| Connect fails / wrong chain | Switch MetaMask to Hardhat Local `31337` |
| RPC / connection refused | Start `npx hardhat node` first |
| Deploy / config error in UI | Run `npx hardhat run scripts/deploy.js --network localhost` |
| Empty Market after node restart | Redeploy, then `Ctrl+F5` |
| Address chip not updating after account switch | Click **Connect MetaMask** again |
| Tx nonce / stuck transaction | Reset account activity in MetaMask for Hardhat Local |
| Maintainer cannot submit claim | Expected — switch to Researcher |
| Release fails | Must be Maintainer, status Under review, exact matching hash |
| Old UI still showing “Connect local” | Hard refresh `Ctrl+F5` or restart `npm run ui` |

---

## 12. Finalize checklist

- [ ] MetaMask-only UI confirmed  
- [ ] `npx hardhat test` passing  
- [ ] Full Create → Claim → Payout path works in MetaMask  
- [ ] Practice run fits in ~3 minutes  
- [ ] Speech blocks rehearsed once  

### Publish to GitHub (you run these — do not leave secrets in commits)

```powershell
cd E:\CyberProject
git init
git branch -M main
git remote add origin https://github.com/pasindu-jayasena/BugBountyChain.git
git add .
git status
git commit -m "Finalize BugBountyChain MetaMask escrow platform"
git push -u origin main
```
