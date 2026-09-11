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
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // 1. PENANGANAN VERCEL BLOB UPLOAD
    if (req.query.action === "upload") {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        token: process.env.BLOB_READ_WRITE_TOKEN, // Opsional tapi direkomendasikan
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
    const { video, audio } = body || {};

    if (!video || !audio) {
      return res.status(400).json({
        ok: false,
        message: "URL video dan audio wajib diisi.",
      });
    }

    const output = await replicate.run("sync/lipsync-2", {
      input: {
        video,
        audio,
        sync_mode: "loop",
      },
    });

    // Menangani penanganan URL output Replicate dengan aman
    let outputUrl = output;
    if (Array.isArray(output)) {
      outputUrl = output[0];
    } else if (typeof output === "object" && output?.url) {
      outputUrl = typeof output.url === "function" ? output.url() : output.url;
    } else {
      outputUrl = String(output);
    }

    return res.status(200).json({
      ok: true,
      status: "completed",
      output: outputUrl,
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: error?.message || "Terjadi kesalahan server.",
    });
  }
}
