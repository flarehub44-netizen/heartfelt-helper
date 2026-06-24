import { ImgHTMLAttributes, VideoHTMLAttributes } from "react";
import { useSignedMediaUrl, SignedMediaTransform } from "@/hooks/useSignedMediaUrl";

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  transform?: SignedMediaTransform;
};

export function SignedImage({ src, alt = "", transform, ...rest }: ImgProps) {
  const resolved = useSignedMediaUrl(src, transform);
  if (!resolved) return null;
  return <img src={resolved} alt={alt} loading="lazy" {...rest} />;
}

type VideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string | null | undefined;
};

export function SignedVideo({ src, ...rest }: VideoProps) {
  const resolved = useSignedMediaUrl(src);
  if (!resolved) return null;
  return <video src={resolved} {...rest} />;
}
