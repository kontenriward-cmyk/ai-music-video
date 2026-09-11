import Replicate from "replicate";
import { handleUpload } from "@vercel/blob/client";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Method not allowed",
    });
  }

  try {
    // =========================
    // VERCEL BLOB UPLOAD TOKEN
    // =========================
    if (req.query.action === "upload") {
      const body = req.body;

      const jsonResponse = await handleUpload({
        body,
        request: req,

        onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
          return {
            allowedContentTypes: [
              "video/mp4",
              "video/webm",
              "video/quicktime",
              "audio/mpeg",
              "audio/mp3",
              "audio/wav",
              "audio/x-wav",
              "audio/mp4",
              "audio/aac",
              "audio/ogg",
            ],

            maximumSizeInBytes: 500 * 1024 * 1024,

            addRandomSuffix: true,

            tokenPayload: JSON.stringify({
              pathname,
              multipart,
            }),
          };
        },
      });

      return res.status(200).json(jsonResponse);
    }

    // =========================
    // AI LIP-SYNC
    // =========================
    const { video, audio } = req.body || {};

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

    let outputUrl = output;

    if (output && typeof output.url === "function") {
      outputUrl = output.url();
    } else if (output && output.url) {
      outputUrl = output.url;
    }

    return res.status(200).json({
      ok: true,
      status: "completed",
      output: outputUrl,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Gagal membuat video.",
    });
  }
}
