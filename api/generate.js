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
    // VERCEL BLOB CLIENT UPLOAD
    // =========================
    if (req.query.action === "upload") {
      let body = req.body;

      // Pastikan body berbentuk object
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({
            ok: false,
            message: "Body upload tidak valid.",
          });
        }
      }

      if (!body) {
        return res.status(400).json({
          ok: false,
          message: "Body upload kosong.",
        });
      }

      const blobResponse = await handleUpload({
        body,
        request: req,

        onBeforeGenerateToken: async (pathname) => {
          console.log("Membuat Blob token:", pathname);

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
            }),
          };
        },

        onUploadCompleted: async ({ blob }) => {
          console.log("Blob upload selesai:", blob.url);
        },
      });

      return res.status(200).json(blobResponse);
    }

    // =========================
    // REPLICATE LIP-SYNC
    // =========================

    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const { video, audio } = body || {};

    if (!video || !audio) {
      return res.status(400).json({
        ok: false,
        message: "URL video dan audio wajib diisi.",
      });
    }

    console.log("Mulai Replicate...");
    console.log("Video:", video);
    console.log("Audio:", audio);

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

    console.log("Video selesai:", outputUrl);

    return res.status(200).json({
      ok: true,
      status: "completed",
      output: outputUrl,
    });

  } catch (error) {
    console.error("GENERATE ERROR:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "Gagal membuat video.",
    });
  }
}
