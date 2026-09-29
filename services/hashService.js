const crypto = require("crypto");

/**
 * Build a stable string from a report (string or plain object),
 * then return SHA-256 as 0x + 64 hex chars (fits Solidity bytes32).
 */
function generateReportHash(reportData) {
  let content;

  if (typeof reportData === "object" && reportData !== null) {
    const keys = Object.keys(reportData).sort();
    const ordered = {};
    for (const key of keys) {
      ordered[key] = reportData[key];
    }
    content = JSON.stringify(ordered);
  } else {
    content = String(reportData);
  }

  const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  return "0x" + hash;
}

function verifyReportHash(reportData, targetHash) {
  const calculated = generateReportHash(reportData);
  return calculated.toLowerCase() === String(targetHash).toLowerCase();
}

module.exports = {
  generateReportHash,
  verifyReportHash,
};
