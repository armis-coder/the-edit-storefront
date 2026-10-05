import type { CommerceImage } from "@/lib/commerce/types";

type ProductMediaProps = {
  image: CommerceImage;
  className?: string;
  eager?: boolean;
};

export function ProductMedia({
  image,
  className = "",
  eager = false,
}: ProductMediaProps) {
  if (image.crop) {
    return (
      <div
        className={`product-sprite ${image.crop} ${className}`.trim()}
        role="img"
        aria-label={image.altText}
      />
    );
  }

  return (
    <img
      className={className}
      src={image.url}
      alt={image.altText}
      width={image.width}
      height={image.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
