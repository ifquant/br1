// Boundary: this module defines the pure remote-sync result contract shared by
// renderer and desktop code. Keep it limited to transport-agnostic status
// semantics so feature code does not infer backend details.

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
  applyResult: {
    libraryBookCount: number;
    bookmarkBookCount: number;
    noteBookCount: number;
    highlightsWorkspaceBookCount: number;
    restoredReaderSettings: boolean;
  } | null;
  readerSettingsRecord: Br1SyncSnapshot['records'][number] | null;
};

export const remoteSyncResultNeedsRetry = (result: Br1RemoteSyncResult) =>
  result.status === 'offline' || result.status === 'retryable-failure' || result.retryable;

export const remoteSyncResultIsConflict = (result: Br1RemoteSyncResult) =>
  result.status === 'conflict';
