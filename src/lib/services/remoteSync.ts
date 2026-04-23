import {
  type Br1RemoteSyncRequest,
  type Br1RemoteSyncResult
} from '$lib/sync';
import { invokeTauri, isTauriDesktop } from './platform';

const requireTauriRemoteSyncRuntime = (action: string) => {
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
