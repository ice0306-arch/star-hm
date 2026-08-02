declare module "@dada78641/bwmapimage" {
  export class BwMapImage {
    constructor(file: string | Buffer, options?: Record<string, unknown>);
    getMapMetadata(): Promise<Record<string, unknown>>;
    renderMapImage(): Promise<[Buffer, Record<string, unknown>]>;
  }
}
