// Boundary: this module is the frontend-facing seam to remote snapshot sync.
// Keep request typing and desktop-runtime gating here, and leave remote auth,
// conflict resolution, and transport to the desktop layer.

import {
  type Br1RemoteSyncRequest,
  type Br1RemoteSyncResult
} from '$lib/sync';
import { invokeTauri, isTauriDesktop } from './platform';

const requireTauriRemoteSyncRuntime = (action: string) => {
  // Refactor risk: this facade should stay narrow so remote trust-boundary
  // reviews only need to inspect one renderer-to-desktop handoff.
  if (!isTauriDesktop()) {
    throw new Error(`${action} requires the Tauri desktop runtime`);
  }
};

export const runRemoteSync = async (
  request: Br1RemoteSyncRequest
): Promise<Br1RemoteSyncResult> => {
  requireTauriRemoteSyncRuntime('runRemoteSync');
  return invokeTauri<Br1RemoteSyncResult>('run_remote_sync', {
    request
  });
};
