import Replicate from "replicate";
import { handleUpload } from "@vercel/blob/client";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    // 1. PENANGANAN UPLOAD VERCEL BLOB
    if (req.query.action === "upload") {
      const jsonResponse = await handleUpload({
        body: req.body,
        request: req,
        token: process.env.BLOB_READ_WRITE_TOKEN, // Memaksa penggunaan token secara eksplisit
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [
            "video/mp4", "video/webm", "video/quicktime",
            "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
            "audio/mp4", "audio/aac", "audio/ogg",
          ],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async ({ blob }) => {
          console.log("UPLOAD SUCCESS:", blob.url);
        },
      });

      return res.status(200).json(jsonResponse);
    }

    // 2. PENANGANAN REPLICATE
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { video, audio } = body;

    if (!video || !audio) {
      return res.status(400).json({
        ok: false,
        message: "URL video dan audio wajib diisi.",
      });
    }

    const output = await replicate.run("sync/lipsync-2", {
      input: { video, audio, sync_mode: "loop" },
    });

    let outputUrl = "";
    if (typeof output === "string") {
      outputUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      outputUrl = String(output[0]);
    } else if (output && typeof output.url === "function") {
      outputUrl = output.url().href || String(output.url());
    } else if (output?.url) {
      outputUrl = String(output.url);
    } else {
      outputUrl = String(output);
    }

    return res.status(200).json({
      ok: true,
      status: "completed",
      output: outputUrl,
    });

  } catch (error) {
    console.error("ERROR HANDLER:", error);
    return res.status(500).json({
      ok: false,
      message: error?.message || "Terjadi kesalahan server.",
    });
  }
}
