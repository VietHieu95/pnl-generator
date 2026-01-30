declare module 'dom-to-image-more' {
  interface Options {
    width?: number;
    height?: number;
    quality?: number;
    style?: Record<string, string>;
    filter?: (node: Node) => boolean;
    bgcolor?: string;
    cacheBust?: boolean;
    imagePlaceholder?: string;
  }

  function toPng(node: Node, options?: Options): Promise<string>;
  function toJpeg(node: Node, options?: Options): Promise<string>;
  function toBlob(node: Node, options?: Options): Promise<Blob>;
  function toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
  function toSvg(node: Node, options?: Options): Promise<string>;

  export default {
    toPng,
    toJpeg,
    toBlob,
    toPixelData,
    toSvg,
  };
}
