import { Directory, Filesystem } from "@capacitor/filesystem";
import { isNativeApp } from "./appUrl";
import { shareContent } from "./nativeShare";

function stripDataUrlPrefix(dataUrl: string) {
  const parts = dataUrl.split(",", 2);
  return parts.length === 2 ? parts[1] : dataUrl;
}

async function writeDataUrlToFile(dataUrl: string, fileName: string, directory: Directory) {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `myamen/${Date.now()}-${cleanFileName}`;

  await Filesystem.writeFile({
    path,
    data: stripDataUrlPrefix(dataUrl),
    directory,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({ path, directory });
  return uri;
}

async function blobToBase64(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

async function writeBlobToFile(blob: Blob, fileName: string, directory: Directory) {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `myamen/${Date.now()}-${cleanFileName}`;

  await Filesystem.writeFile({
    path,
    data: await blobToBase64(blob),
    directory,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({ path, directory });
  return uri;
}

export async function shareImageDataUrl(dataUrl: string, fileName: string, title: string, text?: string) {
  if (!isNativeApp()) return false;

  const uri = await writeDataUrlToFile(dataUrl, fileName, Directory.Cache);
  await shareContent({
    title,
    text,
    files: [uri],
    dialogTitle: title,
  });
  return true;
}

export async function saveImageDataUrl(dataUrl: string, fileName: string) {
  if (!isNativeApp()) return false;

  await writeDataUrlToFile(dataUrl, fileName, Directory.External);
  return true;
}

export async function shareBlobFile(blob: Blob, fileName: string, title: string, text?: string) {
  if (!isNativeApp()) return false;

  const uri = await writeBlobToFile(blob, fileName, Directory.Cache);
  await shareContent({
    title,
    text,
    files: [uri],
    dialogTitle: title,
  });
  return true;
}
