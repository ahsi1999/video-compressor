import { useRef, useState } from "react";

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function App() {
  const videoRef = useRef(null);
  const [file, setFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [compressing, setCompressing] = useState(false);

  const handleSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setOriginalSize(formatSize(f.size));
    setCompressedSize(null);
    setCompressedUrl(null);
  };

  const compressVideo = async () => {
    if (!file) return;

    setCompressing(true);

    const video = videoRef.current;
    video.src = URL.createObjectURL(file);

    await video.play();
    video.pause();

    const stream = video.captureStream();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
      videoBitsPerSecond: 1_000_000, // 1 Mbps (adjustable)
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setCompressedSize(formatSize(blob.size));
      setCompressedUrl(URL.createObjectURL(blob));
      setCompressing(false);
    };

    mediaRecorder.start();
    video.play();

    video.onended = () => {
      mediaRecorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    };
  };

  return (
    <div className="container">
      <h2>🎥 Client-Side Video Compressor</h2>

      <input type="file" accept="video/*" onChange={handleSelect} />

      {originalSize && <p>Original size: {originalSize}</p>}

      <video ref={videoRef} style={{ display: "none" }} />

      {file && (
        <button onClick={compressVideo} disabled={compressing}>
          {compressing ? "Compressing..." : "Compress Video"}
        </button>
      )}

      {compressedSize && (
        <p>
          ✅ Compressed size: {compressedSize}{" "}
          <a href={compressedUrl} download="compressed.webm">
            Download
          </a>
        </p>
      )}
    </div>
  );
}
