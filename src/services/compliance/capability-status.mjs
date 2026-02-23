const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function nonEmpty(value) {
  return typeof value === "string" && value.trim() !== "" && !value.trim().startsWith("#");
}

function isValidAddress(value) {
  return EVM_ADDRESS_REGEX.test((value || "").trim());
}

export function getCapabilityStatus(env = process.env) {
  const quicknodeBaseConfigured = nonEmpty(env.QUICKNODE_BASE_RPC);
  const writerKeyConfigured = nonEmpty(env.BLOCKCHAIN_WRITER_PRIVATE_KEY);
  const proofContractConfigured = isValidAddress(env.PROOF_CONTRACT_ADDRESS);

  let poeMode = "disabled";
  if (quicknodeBaseConfigured && writerKeyConfigured && proofContractConfigured) {
    poeMode = "onchain_contract";
  } else if (quicknodeBaseConfigured && writerKeyConfigured) {
    poeMode = "simulated_no_contract";
  }

  const nexusBridgeEnabled = env.NEXUS_BRIDGE_ENABLED !== "false";
  const nexusSecretConfigured = nonEmpty(env.NEXUS_SECRET);
  const smartFactoryEventPathActive = nexusBridgeEnabled && nexusSecretConfigured;

  return {
    proof_of_existence: {
      mode: poeMode,
      onchain_assertable: poeMode === "onchain_contract",
      quicknode_base_configured: quicknodeBaseConfigured,
      writer_key_configured: writerKeyConfigured,
      proof_contract_configured: proofContractConfigured,
    },
    tokenization: {
      event_path_active: smartFactoryEventPathActive,
      nexus_bridge_enabled: nexusBridgeEnabled,
      nexus_secret_configured: nexusSecretConfigured,
    },
    security: {
      woovi_webhook_hmac: nonEmpty(env.WOOVI_WEBHOOK_SECRET),
      nexus_webhook_hmac: nonEmpty(env.NEXUS_SECRET),
      resend_configured: nonEmpty(env.RESEND_API_KEY),
    },
  };
}
