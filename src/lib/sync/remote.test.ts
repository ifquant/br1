// Test setup is explicit here because sync and persistence bugs usually come
// from mixing local state, remote state, and retry metadata in the wrong order.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  remoteSyncResultIsConflict,
  remoteSyncResultNeedsRetry,
  type Br1RemoteSyncResult
} from './index.js';

const baseResult = (overrides: Partial<Br1RemoteSyncResult> = {}): Br1RemoteSyncResult => ({
  provider: 'readestCloud',
  operation: 'push',
  status: 'success',
  message: 'ok',
  retryable: false,
  localFingerprint: 'local',
  remoteFingerprint: null,
  remoteExportedAt: null,
  snapshot: null,
  applyResult: null,
  readerSettingsRecord: null,
  ...overrides
});

test('remote sync retry helper only flags offline and retryable failures', () => {
  assert.equal(remoteSyncResultNeedsRetry(baseResult({ status: 'offline' })), true);
  assert.equal(remoteSyncResultNeedsRetry(baseResult({ status: 'retryable-failure' })), true);
  assert.equal(remoteSyncResultNeedsRetry(baseResult({ retryable: true })), true);
  assert.equal(remoteSyncResultNeedsRetry(baseResult({ status: 'conflict' })), false);
  assert.equal(remoteSyncResultNeedsRetry(baseResult({ status: 'missing-config' })), false);
});

test('remote sync conflict helper only flags diverged snapshots', () => {
  assert.equal(remoteSyncResultIsConflict(baseResult({ status: 'conflict' })), true);
  assert.equal(remoteSyncResultIsConflict(baseResult({ status: 'success' })), false);
  assert.equal(remoteSyncResultIsConflict(baseResult({ status: 'empty' })), false);
});
