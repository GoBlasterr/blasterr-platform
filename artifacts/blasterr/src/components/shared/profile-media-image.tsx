import { type ImgHTMLAttributes, type ReactNode, useEffect, useState } from "react";

type ProfileMediaImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: ReactNode;
};

export function ProfileMediaImage({ src, fallback = null, onError, ...props }: ProfileMediaImageProps) {
  const [failedSource, setFailedSource] = useState<string>();

  useEffect(() => {
    if (src !== failedSource) setFailedSource(undefined);
  }, [failedSource, src]);

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