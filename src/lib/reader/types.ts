export type ReaderEngineMountState = 'idle' | 'loading' | 'ready' | 'error';

export type ReaderMountBoundary = {
  hostRole: string;
  statusAttr: string;
  state: ReaderEngineMountState;
};

export type ReaderPreviewState = {
  title: string;
  author: string;
  chapterLabel: string;
  progressLabel: string;
  locationLabel: string;
};
