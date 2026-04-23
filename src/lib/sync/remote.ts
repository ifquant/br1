import type { Br1SyncSnapshot } from './types.js';

export type Br1RemoteSyncProvider = 'readestCloud';

export type Br1RemoteSyncOperation = 'push' | 'pull';

export type Br1RemoteSyncStatus =
  | 'success'
  | 'missing-config'
  | 'offline'
  | 'retryable-failure'
  | 'conflict'
  | 'empty';

export type Br1RemoteSyncRequest = {
  provider: Br1RemoteSyncProvider;
  operation: Br1RemoteSyncOperation;
  snapshot: Br1SyncSnapshot;
};

export type Br1RemoteSyncResult = {
  provider: Br1RemoteSyncProvider;
  operation: Br1RemoteSyncOperation;
  status: Br1RemoteSyncStatus;
  message: string;
  retryable: boolean;
  localFingerprint: string | null;
  remoteFingerprint: string | null;
  remoteExportedAt: number | null;
  snapshot: Br1SyncSnapshot | null;
};

export const remoteSyncResultNeedsRetry = (result: Br1RemoteSyncResult) =>
  result.status === 'offline' || result.status === 'retryable-failure' || result.retryable;

export const remoteSyncResultIsConflict = (result: Br1RemoteSyncResult) =>
  result.status === 'conflict';
