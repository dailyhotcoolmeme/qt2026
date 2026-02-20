// Client-side upload helper that forwards files to the server upload endpoint.
// This avoids embedding R2 credentials in the browser and prevents credential
// related errors. The server will perform the actual upload to R2 and return
// a public URL.
export const uploadFileToR2 = async (file: File, folder: string = "profiles") => {
  const fileName = `${folder}/${Date.now()}-${(file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Read file as base64
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const base64 = btoa(binary);

  try {
    const res = await fetch("/api/file/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, fileBase64: base64, contentType: file.type }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      const err = data?.error || data || `upload failed (${res.status})`;
      console.error("server upload failed:", err);
      throw new Error(typeof err === "string" ? err : JSON.stringify(err));
    }
    return data.publicUrl;
  } catch (error) {
    console.error("R2 업로드 실패:", error);
    throw error;
  }
};
