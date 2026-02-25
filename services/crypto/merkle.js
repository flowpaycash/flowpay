import crypto from 'crypto';

/**
 * Merkle Tree implementation for Proof-of-Execution (PoE)
 */
export class MerkleTree {
    /**
     * @param {string[]} leaves - Array of hex strings (hashes)
     */
    constructor(leaves) {
        if (!leaves || leaves.length === 0) {
            throw new Error('MerkleTree requires at least one leaf');
        }
        this.leaves = leaves.map(leaf => this._ensureHex(leaf)).sort();
        this.layers = [this.leaves];
        this._buildTree();
    }

    _ensureHex(value) {
        if (typeof value !== 'string') value = String(value);
        return value.startsWith('0x') ? value.slice(2) : value;
    }

    _hash(data) {
        return crypto.createHash('sha256').update(Buffer.from(data, 'hex')).digest('hex');
    }

    _hashPair(left, right) {
        if (!right) return left;
        const combined = left < right ? left + right : right + left;
        return this._hash(combined);
    }

    _buildTree() {
        let currentLayer = this.leaves;
        while (currentLayer.length > 1) {
            const nextLayer = [];
            for (let i = 0; i < currentLayer.length; i += 2) {
                nextLayer.push(this._hashPair(currentLayer[i], currentLayer[i + 1]));
            }
            this.layers.push(nextLayer);
            currentLayer = nextLayer;
        }
    }

    getRoot() {
        return `0x${this.layers[this.layers.length - 1][0]}`;
    }

    /**
     * Generates a proof for a specific leaf
     * @param {string} leaf - The leaf hash to prove
     * @returns {object[]} Proof steps
     */
    getProof(leaf) {
        let index = this.leaves.indexOf(this._ensureHex(leaf));
        if (index === -1) return null;

        const proof = [];
        for (let i = 0; i < this.layers.length - 1; i++) {
            const layer = this.layers[i];
            const isRightNode = index % 2;
            const pairIndex = isRightNode ? index - 1 : index + 1;

            if (pairIndex < layer.length) {
                proof.push({
                    position: isRightNode ? 'left' : 'right',
                    data: `0x${layer[pairIndex]}`
                });
            }
            index = Math.floor(index / 2);
        }
        return proof;
    }

    /**
     * Verifies a proof against a root
     * @param {string} leaf
     * @param {object[]} proof
     * @param {string} root
     * @returns {boolean}
     */
    static verify(leaf, proof, root) {
        let hash = leaf.startsWith('0x') ? leaf.slice(2) : leaf;
        for (const step of proof) {
            const data = step.data.startsWith('0x') ? step.data.slice(2) : step.data;
            if (step.position === 'left') {
                hash = crypto.createHash('sha256').update(Buffer.from(data + hash, 'hex')).digest('hex');
            } else {
                hash = crypto.createHash('sha256').update(Buffer.from(hash + data, 'hex')).digest('hex');
            }
        }
        return `0x${hash}` === root;
    }
}
