export type ReaderEngineMountState = 'idle' | 'loading' | 'ready' | 'error';

export type ReaderMountBoundary = {
  hostRole: string;
  statusAttr: string;
  state: ReaderEngineMountState;
};
