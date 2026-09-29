const STATUS = ["Active", "Under review", "Resolved", "Cancelled"];

const state = {
  config: null,
  provider: null,
  signer: null,
  account: null,
  contract: null,
  bounties: [],
  selectedId: null,
  pendingHash: "",
};

const $ = (id) => document.getElementById(id);

function toast(message, type = "info") {
  const host = $("toastHost");
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  host.prepend(node);
  setTimeout(() => node.remove(), 4200);
}

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function setView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  $(`view-${name}`).classList.add("active");
  $("hero").style.display = name === "market" ? "" : "none";
}

document.querySelectorAll(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

document.querySelectorAll("[data-view-jump]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.viewJump));
});

async function loadConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Application config unavailable. Deploy the contract first.");
  }
  state.config = await res.json();
}

async function ensureChain() {
  const { chainId, chainName, rpcUrl, currency } = state.config;
  const hexId = "0x" + Number(chainId).toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName,
            rpcUrls: [rpcUrl],
            nativeCurrency: currency,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

function showConnected() {
  $("walletMeta").hidden = false;
  $("networkLabel").textContent = state.config.chainName;
  $("addressLabel").textContent = shortAddr(state.account);
  $("connectBtn").textContent = "Connected";
  $("heroConnectBtn").textContent = "Wallet connected";
}

async function connectMetaMask() {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed. Install the MetaMask extension and try again.");
    }
    if (!state.config) {
      await loadConfig();
    }

    await ensureChain();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    state.provider = new ethers.BrowserProvider(window.ethereum);
    state.signer = await state.provider.getSigner();
    state.account = accounts[0];
    state.contract = new ethers.Contract(
      state.config.contractAddress,
      state.config.abi,
      state.signer
    );

    showConnected();
    await refreshBalance();
    await loadBounties();
    toast("MetaMask connected", "success");
  } catch (err) {
    toast(err.message || "Could not connect MetaMask", "error");
  }
}

async function refreshBalance() {
  if (!state.provider || !state.account) return;
  const bal = await state.provider.getBalance(state.account);
  $("balanceLabel").textContent = `${Number(ethers.formatEther(bal)).toFixed(4)} ETH`;
}

function mapBounty(raw) {
  return {
    id: Number(raw.id),
    maintainer: raw.maintainer,
    title: raw.title,
    description: raw.description,
    amount: raw.amount,
    deadline: Number(raw.deadline),
    status: Number(raw.status),
    researcher: raw.researcher,
    reportHash: raw.reportHash,
    submissionTimestamp: Number(raw.submissionTimestamp),
  };
}

async function loadBounties() {
  if (!state.contract) return;
  const count = Number(await state.contract.bountyCounter());
  if (count === 0) {
    state.bounties = [];
    renderMarket();
    return;
  }
  const list = await state.contract.getBounties(1, count);
  state.bounties = list.map(mapBounty).reverse();
  renderMarket();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

function renderMarket() {
  const grid = $("bountyGrid");
  const filter = $("statusFilter").value;

  if (!state.contract) {
    grid.innerHTML =
      '<div class="empty-state">Connect MetaMask to load on-chain bounty programs.</div>';
    return;
  }

  const items = state.bounties.filter((b) =>
    filter === "all" ? true : String(b.status) === filter
  );

  if (items.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">No programs yet. Open Create to publish the first bounty.</div>';
    return;
  }

  grid.innerHTML = "";
  for (const bounty of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bounty-card";
    btn.innerHTML = `
      <div class="meta">
        <span class="badge status-${bounty.status}">${STATUS[bounty.status]}</span>
        <span>#${bounty.id}</span>
      </div>
      <h3>${escapeHtml(bounty.title)}</h3>
      <p>${escapeHtml(bounty.description || "No description provided.")}</p>
      <div class="foot">
        <span class="reward">${ethers.formatEther(bounty.amount)} ETH</span>
        <span>Ends ${formatDate(bounty.deadline)}</span>
      </div>
    `;
    btn.addEventListener("click", () => openBounty(bounty.id));
    grid.appendChild(btn);
  }
}

function openBounty(id) {
  const bounty = state.bounties.find((b) => b.id === id);
  if (!bounty) return;

  state.selectedId = id;
  $("claimBountyId").value = id;
  $("reviewBountyId").value = id;
  if (bounty.reportHash && bounty.reportHash !== ethers.ZeroHash) {
    $("reviewHash").value = bounty.reportHash;
  }

  $("detailPlaceholder").hidden = true;
  const content = $("detailContent");
  content.hidden = false;
  content.innerHTML = `
    <span class="badge status-${bounty.status}">${STATUS[bounty.status]}</span>
    <h3 style="margin:0.65rem 0 0.25rem;font-family:var(--display)">${escapeHtml(bounty.title)}</h3>
    <p class="muted">${escapeHtml(bounty.description || "")}</p>
    <ul class="detail-list">
      <li><strong>Reward</strong><span>${ethers.formatEther(bounty.amount)} ETH</span></li>
      <li><strong>Deadline</strong><span>${formatDate(bounty.deadline)}</span></li>
      <li><strong>Maintainer</strong><code>${bounty.maintainer}</code></li>
      <li><strong>Researcher</strong><code>${
        bounty.researcher === ethers.ZeroAddress ? "—" : bounty.researcher
      }</code></li>
      <li><strong>Report hash</strong><code>${
        bounty.reportHash === ethers.ZeroHash ? "—" : bounty.reportHash
      }</code></li>
      <li><strong>Submitted</strong><span>${
        bounty.submissionTimestamp ? formatDate(bounty.submissionTimestamp) : "—"
      }</span></li>
    </ul>
  `;
  setView("workspace");
}

function buildReportObject() {
  return {
    title: $("reportTitle").value.trim(),
    severity: $("reportSeverity").value,
    details: $("reportDetails").value.trim(),
    poc: $("reportPoc").value.trim(),
  };
}

async function computeCommitment() {
  const report = buildReportObject();
  if (!report.title || !report.details) {
    throw new Error("Add a finding title and technical details before hashing.");
  }
  const res = await fetch("/api/hash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Hash failed");
  state.pendingHash = body.hash;
  $("claimHashPreview").textContent = body.hash;
  $("reviewHash").value = body.hash;
  return body.hash;
}

function requireWallet() {
  if (!state.contract || !state.signer) {
    throw new Error("Connect MetaMask first.");
  }
}

$("connectBtn").addEventListener("click", connectMetaMask);
$("heroConnectBtn").addEventListener("click", connectMetaMask);

$("refreshBtn").addEventListener("click", async () => {
  try {
    requireWallet();
    await loadBounties();
    await refreshBalance();
    toast("Market refreshed");
  } catch (err) {
    toast(err.message, "error");
  }
});

$("statusFilter").addEventListener("change", renderMarket);

$("createForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    requireWallet();
    const title = $("createTitle").value.trim();
    const description = $("createDescription").value.trim();
    const days = Number($("createDays").value);
    const amount = $("createAmount").value.trim();

    $("createSubmit").disabled = true;
    const tx = await state.contract.createBounty(title, description, days, {
      value: ethers.parseEther(amount),
    });
    toast("Confirm the transaction in MetaMask…");
    await tx.wait();
    toast("Bounty published", "success");
    $("createForm").reset();
    $("createDays").value = "30";
    $("createAmount").value = "1.0";
    await loadBounties();
    await refreshBalance();
    setView("market");
  } catch (err) {
    toast(err.reason || err.message || "Create failed", "error");
  } finally {
    $("createSubmit").disabled = false;
  }
});

$("computeHashBtn").addEventListener("click", async () => {
  try {
    await computeCommitment();
    toast("Commitment hash ready", "success");
  } catch (err) {
    toast(err.message, "error");
  }
});

$("submitClaimBtn").addEventListener("click", async () => {
  try {
    requireWallet();
    const bountyId = Number($("claimBountyId").value);
    if (!bountyId) throw new Error("Enter a bounty ID.");
    const hash = state.pendingHash || (await computeCommitment());
    const tx = await state.contract.submitReportHash(bountyId, hash);
    toast("Confirm claim in MetaMask…");
    await tx.wait();
    toast("Claim committed on-chain", "success");
    await loadBounties();
    openBounty(bountyId);
    await refreshBalance();
  } catch (err) {
    toast(err.reason || err.message || "Claim failed", "error");
  }
});

$("releaseBtn").addEventListener("click", async () => {
  try {
    requireWallet();
    const bountyId = Number($("reviewBountyId").value);
    const hash = $("reviewHash").value.trim();
    if (!bountyId || !hash) throw new Error("Bounty ID and confirmed hash are required.");
    const tx = await state.contract.releasePayout(bountyId, hash);
    toast("Confirm payout in MetaMask…");
    await tx.wait();
    toast("Payout released", "success");
    await loadBounties();
    openBounty(bountyId);
    await refreshBalance();
  } catch (err) {
    toast(err.reason || err.message || "Release failed", "error");
  }
});

$("cancelBtn").addEventListener("click", async () => {
  try {
    requireWallet();
    const bountyId = Number($("reviewBountyId").value);
    if (!bountyId) throw new Error("Enter a bounty ID.");
    const tx = await state.contract.cancelBounty(bountyId);
    toast("Confirm cancel in MetaMask…");
    await tx.wait();
    toast("Bounty cancelled and refunded", "success");
    await loadBounties();
    openBounty(bountyId);
    await refreshBalance();
  } catch (err) {
    toast(err.reason || err.message || "Cancel failed", "error");
  }
});

async function syncFromProvider() {
  if (!window.ethereum || !state.config) return;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (!accounts.length) {
    state.account = null;
    state.signer = null;
    state.contract = null;
    $("walletMeta").hidden = true;
    $("connectBtn").textContent = "Connect MetaMask";
    $("heroConnectBtn").textContent = "Connect MetaMask";
    renderMarket();
    return;
  }
  state.provider = new ethers.BrowserProvider(window.ethereum);
  state.signer = await state.provider.getSigner();
  state.account = accounts[0];
  state.contract = new ethers.Contract(
    state.config.contractAddress,
    state.config.abi,
    state.signer
  );
  showConnected();
  await refreshBalance();
  await loadBounties();
}

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => {
    syncFromProvider().catch((err) => toast(err.message, "error"));
  });
  window.ethereum.on("chainChanged", () => window.location.reload());
}

(async function boot() {
  try {
    await loadConfig();
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        await syncFromProvider();
      }
    }
  } catch (err) {
    toast(err.message, "error");
  }
})();
