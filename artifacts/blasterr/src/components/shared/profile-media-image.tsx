import { type ImgHTMLAttributes, type ReactNode, useEffect, useState } from "react";

type ProfileMediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: ReactNode;
};

const profileMediaPreloads = new Map<string, HTMLImageElement>();

export function preloadProfileMedia(src?: string) {
  if (!src || typeof window === "undefined" || profileMediaPreloads.has(src)) return;
  const image = new window.Image();
  image.decoding = "async";
  image.fetchPriority = "high";
  image.src = src;
  profileMediaPreloads.set(src, image);
}

export function ProfileMediaImage({ src, fallback = null, onError, ...props }: ProfileMediaImageProps) {
  const [failedSource, setFailedSource] = useState<string>();

  useEffect(() => {
    if (src !== failedSource) setFailedSource(undefined);
  }, [failedSource, src]);

  useEffect(() => {
    preloadProfileMedia(typeof src === "string" ? src : undefined);
  }, [src]);

  if (!src || failedSource === src) return <>{fallback}</>;

  return (
    <img
      {...props}
      src={src}
      onError={(event) => {
        setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}