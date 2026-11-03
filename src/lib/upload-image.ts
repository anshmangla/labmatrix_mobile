import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Longest edge, in pixels, of photos sent to the server. The largest size the app or website
 * ever displays is 1600px (the zoom view), so photos at this size look the same everywhere
 * while being several times smaller to upload than a full-resolution phone photo.
 */
export const MAX_UPLOAD_EDGE = 2048;

export interface PickedImage {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string | null;
}

// Decoding a full-resolution photo takes a lot of memory, so photos are resized one at a time
// even when several uploads run in parallel.
let resizeQueue: Promise<unknown> = Promise.resolve();

/**
 * Returns a local file URI to upload: the original when it is already within MAX_UPLOAD_EDGE
 * (so it is never re-compressed), otherwise a copy scaled down to fit, keeping its aspect ratio.
 * Falls back to the original if resizing fails, so a photo is never lost.
 */
export function prepareImageForUpload(image: PickedImage): Promise<string> {
  const task = resizeQueue.then(() => resize(image));
  resizeQueue = task.catch(() => undefined);
  return task;
}

async function resize({ uri, width, height, mimeType }: PickedImage): Promise<string> {
  if (!width || !height || Math.max(width, height) <= MAX_UPLOAD_EDGE) {
    return uri;
  }

  const context = ImageManipulator.manipulate(uri);
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
  try {
    // Only the longer edge is given; the other is scaled to preserve the aspect ratio
    context.resize(width >= height ? { width: MAX_UPLOAD_EDGE } : { height: MAX_UPLOAD_EDGE });
    rendered = await context.renderAsync();
    const isPng = mimeType === "image/png";
    const result = await rendered.saveAsync({
      // PNG keeps transparency (e.g. screenshots); photos are saved as high-quality JPEG
      format: isPng ? SaveFormat.PNG : SaveFormat.JPEG,
      compress: 0.9,
    });
    return result.uri;
  } catch (error) {
    console.warn("Could not resize photo, uploading original:", error);
    return uri;
  } finally {
    rendered?.release();
    context.release();
  }
}
