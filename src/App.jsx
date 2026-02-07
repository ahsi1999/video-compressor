import { useRef, useState } from "react";

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export default function App() {
  const videoRef = useRef(null);

  const [file, setFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);

  const [compressing, setCompressing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [progress, setProgress] = useState(0);

  // Quality → bitrate mapping
  const [quality, setQuality] = useState("low");
  const bitrateMap = {
    high: 1_000_000,   // ~70 MB / 10 min
    medium: 600_000,  // ~40 MB
    low: 400_000,     // ~25–30 MB
  };

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
    setProgress(0);

    const video = videoRef.current;
    video.src = URL.createObjectURL(file);
    video.muted = true; // 🔇 mute playback only

    await video.play();
    video.pause();

    const stream = video.captureStream();

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
      videoBitsPerSecond: bitrateMap[quality],
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      setCompressedSize(formatSize(blob.size));
      setCompressedUrl(URL.createObjectURL(blob));
      setCompressing(false);
      setTimeLeft(null);
      setProgress(100);
    };

    mediaRecorder.start();
    video.play();

    const interval = setInterval(() => {
      if (video.duration) {
        const remaining = video.duration - video.currentTime;
        setTimeLeft(formatTime(remaining));
        setProgress(
          Math.min(
            100,
            Math.round((video.currentTime / video.duration) * 100)
          )
        );
      }
    }, 300);

    video.onended = () => {
      clearInterval(interval);
      mediaRecorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    };
  };

  return (
    <div className="container">
      <h2>🎥 Client-Side Video Compressor</h2>

      <input type="file" accept="video/*" onChange={handleSelect} />

      {originalSize && <p>Original size: {originalSize}</p>}

      {file && (
        <>
          <label>
            Compression quality:
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="high">High (~70 MB)</option>
              <option value="medium">Medium (~40 MB)</option>
              <option value="low">Low (~25–30 MB)</option>
            </select>
          </label>

          <br />

          <button onClick={compressVideo} disabled={compressing}>
            {compressing ? "Compressing..." : "Compress Video"}
          </button>
        </>
      )}

      {compressing && (
        <>
          <p>⏳ Time remaining: {timeLeft}</p>
          <p>📊 Progress: {progress}%</p>
        </>
      )}

      {compressedSize && (
        <p>
          ✅ Compressed size: {compressedSize}{" "}
          <a href={compressedUrl} download="compressed.webm">
            Download
          </a>
        </p>
      )}

      <video ref={videoRef} style={{ display: "none" }} />
    </div>
  );
}
