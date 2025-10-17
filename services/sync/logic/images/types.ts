// Image manager types redefined here (previously lived in top-level images/types.ts).
export interface ImageUpsertLocalResult {
  pinId: string;
  localImages: string[];
  images: string[];
}

export interface ImageUpsertRemoteResult {
  pinId: string;
  localImages: string[];
  images: string[];
}

export interface ImageManagerInterface {
  handleUpsertsToLocal(localUpserts: any[]): Promise<ImageUpsertLocalResult[]>;
  handleUpsertsToRemote(remoteUpserts: any[]): Promise<ImageUpsertRemoteResult[]>;
}
