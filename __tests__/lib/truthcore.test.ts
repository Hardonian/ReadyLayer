import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  anchorDailyAuditMerkleRoot,
} from '@/lib/audit/truthcore';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('TruthCore Immutable Ledger Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Merkle Tree Calculations', () => {
    it('calculates deterministic Merkle root for leaves', () => {
      const leaves = [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
        '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
        '2e7d2c03a9507ae265ecf5b5356885a53393a2029d241394997265a1a25aefc6',
      ];

      const root = calculateMerkleRoot(leaves);
      expect(root).toHaveLength(64);

      // Same leaves should yield same root
      expect(calculateMerkleRoot(leaves)).toBe(root);
    });

    it('generates and verifies Merkle inclusion proofs', () => {
      const leaves = [
        'hash_a',
        'hash_b',
        'hash_c',
        'hash_d',
      ];

      const root = calculateMerkleRoot(leaves);

      // Verify proof for leaf 0
      const proof0 = generateMerkleProof(leaves, 0);
      expect(verifyMerkleProof(leaves[0], proof0, root, 0)).toBe(true);

      // Verify proof for leaf 2
      const proof2 = generateMerkleProof(leaves, 2);
      expect(verifyMerkleProof(leaves[2], proof2, root, 2)).toBe(true);

      // Incorrect leaf should fail verification
      expect(verifyMerkleProof('tampered_leaf', proof0, root, 0)).toBe(false);
    });
  });

  describe('anchorDailyAuditMerkleRoot', () => {
    it('queries daily logs and creates anchor receipt', async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        { id: 'log-1', hash: 'hash-1' },
        { id: 'log-2', hash: 'hash-2' },
      ] as any);

      const receipt = await anchorDailyAuditMerkleRoot('org-123', new Date('2026-03-15T12:00:00Z'));

      expect(receipt.organizationId).toBe('org-123');
      expect(receipt.status).toBe('anchored');
      expect(receipt.merkleRoot).toHaveLength(64);
      expect(receipt.leafCount).toBe(2);
      expect(receipt.ledgerTxId).toContain('tc_tx_');
    });
  });
});
