const { getDatabase } = require('../../src/services/database/sqlite.mjs');
const { MerkleTree } = require('../crypto/merkle');
const { getWriteProof } = require('./write-proof');
const { secureLog } = require('../../src/services/api/config.mjs');
const crypto = require('crypto');

class POEService {
    constructor() {
        this.writeProof = getWriteProof();
    }

    /**
     * Adds an order to the current (or a new) PoE batch
     * @param {string} chargeId
     */
    async addOrderToBatch(chargeId) {
        try {
            const db = getDatabase();

            // In a more complex system, we might have multiple open batches.
            // For FlowPay, we'll keep it simple: link to the latest unanchored batch or create one.
            let batch = db.prepare("SELECT id FROM poe_batches WHERE anchored_at IS NULL ORDER BY created_at DESC LIMIT 1").get();

            if (!batch) {
                // Create a temporary batch to receive orders
                const result = db.prepare("INSERT INTO poe_batches (merkle_root, batch_size) VALUES (?, ?)").run('pending', 0);
                batch = { id: result.lastInsertRowid };
            }

            db.prepare("UPDATE orders SET poe_batch_id = ? WHERE charge_id = ?").run(batch.id, chargeId);

            // Update batch size
            db.prepare("UPDATE poe_batches SET batch_size = (SELECT COUNT(*) FROM orders WHERE poe_batch_id = ?) WHERE id = ?")
                .run(batch.id, batch.id);

            secureLog('info', 'Order added to PoE batch', { chargeId, batchId: batch.id });
        } catch (error) {
            secureLog('error', 'Error adding order to PoE batch', { error: error.message, chargeId });
            throw error;
        }
    }

    /**
     * Closes the current active batch, generates Merkle root and anchors it on Base L2
     */
    async anchorActiveBatch() {
        try {
            const db = getDatabase();
            const batch = db.prepare("SELECT * FROM poe_batches WHERE anchored_at IS NULL AND batch_size > 0 ORDER BY created_at DESC LIMIT 1").get();

            if (!batch) {
                secureLog('info', 'No active batch to anchor');
                return null;
            }

            const orders = db.prepare("SELECT tx_hash FROM orders WHERE poe_batch_id = ? AND tx_hash IS NOT NULL").all(batch.id);

            if (orders.length === 0) {
                secureLog('warn', 'Active batch has no transaction hashes, cannot anchor', { batchId: batch.id });
                return null;
            }

            // 1. Build Merkle Tree
            const hashes = orders.map(o => o.tx_hash);
            const tree = new MerkleTree(hashes);
            const root = tree.getRoot();

            // 2. Generate State Checkpoint (SHA-256 of the root + timestamp + batchId)
            const checkpoint = crypto.createHash('sha256')
                .update(`${root}-${Date.now()}-${batch.id}`)
                .digest('hex');

            // 3. Anchor on Base L2 via WriteProof
            secureLog('info', 'Anchoring PoE batch on Base L2', { batchId: batch.id, root, checkpoint });

            const proofResult = await this.writeProof.writeProof({
                pixChargeId: `poe_batch_${batch.id}`,
                txHash: `0x${checkpoint}`, // Using checkpoint as a "virtual" txHash for the proof entry
                recipientWallet: process.env.SERVICE_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
                metadata: {
                    type: 'poe_batch_anchor',
                    batchId: batch.id,
                    merkleRoot: root,
                    batchSize: orders.length,
                    checkpoint
                }
            });

            // 4. Update batch in DB
            db.prepare(`
        UPDATE poe_batches 
        SET merkle_root = ?, 
            anchor_tx_hash = ?, 
            checkpoint_hash = ?, 
            anchored_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(root, proofResult.proof.txHash, checkpoint, batch.id);

            secureLog('info', 'PoE batch anchored successfully', {
                batchId: batch.id,
                root,
                anchorTx: proofResult.proof.txHash
            });

            return {
                batchId: batch.id,
                merkleRoot: root,
                anchorTxHash: proofResult.proof.txHash,
                checkpoint
            };

        } catch (error) {
            secureLog('error', 'Error anchoring PoE batch', { error: error.message });
            throw error;
        }
    }
}

let poeInstance = null;
function getPOEService() {
    if (!poeInstance) {
        poeInstance = new POEService();
    }
    return poeInstance;
}

module.exports = { getPOEService };
