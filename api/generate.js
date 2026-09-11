import Replicate from "replicate";

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
    const { video, audio } = req.body || {};

    if (!video || !audio) {
      return res.status(400).json({
        ok: false,
        message: "Video dan audio wajib diisi.",
      });
    }

    const output = await replicate.run(
      "sync/lipsync-2",
      {
        input: {
          video,
          audio,
          sync_mode: "loop",
        },
      }
    );

    return res.status(200).json({
      ok: true,
      status: "completed",
      output,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      message: error.message || "Gagal membuat video.",
    });
  }
}
