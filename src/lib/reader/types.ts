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
  chapterHref: string;
  progressLabel: string;
  locationLabel: string;
  progressFraction: number;
};

export type ReaderTocItem = {
  label: string;
  href: string;
  level: number;
};

export type ReaderControlRequest =
  | {
      type: 'asset';
      nonce: number;
      url: string;
      label: string;
    }
  | {
      type: 'library-file';
      nonce: number;
      path: string;
      label: string;
      restoreFraction?: number;
    }
  | {
      type: 'prev' | 'next' | 'start';
      nonce: number;
    }
  | {
      type: 'fraction';
      nonce: number;
      fraction: number;
    }
  | {
      type: 'href';
      nonce: number;
      href: string;
    }
  | {
      type: 'file';
      nonce: number;
      file: File;
    };
