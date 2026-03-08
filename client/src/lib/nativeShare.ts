import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
  dialogTitle?: string;
};

export async function shareContent(payload: SharePayload) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
      files: payload.files,
      dialogTitle: payload.dialogTitle || payload.title || "공유",
    });
    return true;
  }

  if (navigator.share) {
    await navigator.share({
      title: payload.title,
      text: payload.text,
      url: payload.url,
    });
    return true;
  }

  return false;
}
