import { getDatabase } from '../../src/services/database/sqlite.mjs';
import { MerkleTree } from '../crypto/merkle.js';
import { getWriteProof } from './write-proof.js';
import { secureLog } from '../../src/services/api/config.mjs';
import crypto from 'crypto';

export class POEService {
    constructor() {
        this.writeProof = getWriteProof();
    }

    async addOrderToBatch(chargeId) {
        try {
            const db = getDatabase();
            let batch = db.prepare("SELECT id FROM poe_batches WHERE anchored_at IS NULL ORDER BY created_at DESC LIMIT 1").get();

            if (!batch) {
                const result = db.prepare("INSERT INTO poe_batches (merkle_root, batch_size) VALUES (?, ?)").run('pending', 0);
                batch = { id: result.lastInsertRowid };
            }

            db.prepare("UPDATE orders SET poe_batch_id = ? WHERE charge_id = ?").run(batch.id, chargeId);
            db.prepare("UPDATE poe_batches SET batch_size = (SELECT COUNT(*) FROM orders WHERE poe_batch_id = ?) WHERE id = ?")
                .run(batch.id, batch.id);

            secureLog('info', 'Order added to PoE batch', { chargeId, batchId: batch.id });
        } catch (error) {
            secureLog('error', 'Error adding order to PoE batch', { error: error.message, chargeId });
            throw error;
        }
    }

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

            const hashes = orders.map(o => o.tx_hash);
            const tree = new MerkleTree(hashes);
            const root = tree.getRoot();

            const checkpoint = crypto.createHash('sha256')
                .update(`${root}-${Date.now()}-${batch.id}`)
                .digest('hex');

            secureLog('info', 'Anchoring PoE batch on Base L2', { batchId: batch.id, root, checkpoint });

            const proofResult = await this.writeProof.writeProof({
                pixChargeId: `poe_batch_${batch.id}`,
                txHash: `0x${checkpoint}`,
                recipientWallet: process.env.BLOCKCHAIN_WRITER_ADDRESS || '0x0000000000000000000000000000000000000000',
                metadata: {
                    type: 'poe_batch_anchor',
                    batchId: batch.id,
                    merkleRoot: root,
                    batchSize: orders.length,
                    checkpoint
                }
            });

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
export function getPOEService() {
    if (!poeInstance) {
        poeInstance = new POEService();
    }
    return poeInstance;
}
