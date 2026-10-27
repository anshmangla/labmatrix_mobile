export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: "limit" | "fill" | "fit" | "scale" | "thumb";
  quality?: "auto" | "auto:best" | "auto:good" | "auto:eco" | "auto:low" | number;
  format?: "auto" | "webp" | "jpg" | "png";
}

/**
 * Transforms a Cloudinary image URL on-the-fly to serve optimized mobile formats.
 */
export function getOptimizedImageUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || typeof url !== "string") return "";

  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }

  const {
    width,
    height,
    crop = height ? "fill" : "limit",
    quality = "auto:good",
    format = "webp",
  } = options;

  const transforms: string[] = [];
  if (format) transforms.push(`f_${format}`);
  if (quality) transforms.push(`q_${quality}`);
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop && (width || height)) transforms.push(`c_${crop}`);

  const transformString = transforms.join(",");
  if (!transformString) return url;

  const uploadMarker = "/image/upload/";
  const markerIdx = url.indexOf(uploadMarker);
  if (markerIdx === -1) return url;

  const prefix = url.slice(0, markerIdx + uploadMarker.length);
  const suffix = url.slice(markerIdx + uploadMarker.length);

  if (suffix.startsWith(`${transformString}/`)) {
    return url;
  }

  return `${prefix}${transformString}/${suffix}`;
}

export const IMAGE_PRESETS = {
  CARD: { width: 600, quality: "auto:good", format: "webp" } as const,
  HERO: { width: 1000, quality: "auto:best", format: "webp" } as const,
  THUMBNAIL: { width: 160, height: 160, crop: "fill", quality: "auto:good", format: "webp" } as const,
};
