import { useEffect, useState, type ImgHTMLAttributes } from "react";

const widths = [200, 400, 800, 1600] as const;

export function getOptimizedImageUrl(source: string, width: (typeof widths)[number]): string | null {
  try {
    const url = new URL(source, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith("/public-objects/objects/")
    ) return null;
    const objectPath = url.pathname.slice("/public-objects".length);
    const segments = objectPath.slice(1).split("/");
    if (
      segments.some((segment) => {
        if (!segment || segment === "." || segment === "..") return true;
        try {
          const decoded = decodeURIComponent(segment);
          return (
            decoded === "." ||
            decoded === ".." ||
            decoded.includes("/") ||
            decoded.includes("\\") ||
            decoded.includes("\0")
          );
        } catch {
          return true;
        }
      })
    ) return null;
    return `/optimized-images/${width}${objectPath}`;
  } catch {
    return null;
  }
}

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & { sizes?: string };

export function OptimizedImage({ src, sizes = "100vw", onError, ...props }: OptimizedImageProps) {
  const source = typeof src === "string" ? src : "";
  const [useOriginal, setUseOriginal] = useState(false);
  useEffect(() => setUseOriginal(false), [source]);
  const optimized = widths.map((width) => [width, getOptimizedImageUrl(source, width)] as const);
  const srcSet = optimized.every(([, url]) => url)
    ? optimized.map(([width, url]) => `${url} ${width}w`).join(", ")
    : undefined;
  const usingOptimizer = !!srcSet && !useOriginal;
  return (
    <img
      src={usingOptimizer ? optimized[2][1]! : source}
      srcSet={usingOptimizer ? srcSet : undefined}
      sizes={usingOptimizer ? sizes : undefined}
      onError={(event) => {
        if (usingOptimizer) setUseOriginal(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}