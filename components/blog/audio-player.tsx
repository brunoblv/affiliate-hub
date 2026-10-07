"use client";

import { useRef, useState } from "react";

const clock = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

/** "Ouça este artigo": play/pausa, barra clicável e tempo. O <audio> nativo fica por baixo. */
export function AudioPlayer({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const el = audio.current;
    if (!el || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    el.currentTime = ((event.clientX - rect.left) / rect.width) * duration;
  }

  function seekByKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const el = audio.current;
    if (!el || !duration) return;
    if (event.key === "ArrowRight") el.currentTime = Math.min(duration, el.currentTime + 10);
    if (event.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 10);
  }

  const percent = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3.5 rounded-[14px] border border-blog-line bg-blog-surface px-4 py-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar narração" : "Ouvir narração"}
        className="flex size-10 flex-none items-center justify-center rounded-full bg-blog-accent hover:bg-blog-accent-dark"
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="#fff" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 1.5v11l9-5.5z" fill="#fff" />
          </svg>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-semibold">Ouça este artigo</span>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Posição da narração"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          aria-valuetext={`${clock(current)} de ${clock(duration)}`}
          onClick={seek}
          onKeyDown={seekByKey}
          className="h-1 cursor-pointer rounded-full bg-blog-line"
        >
          <div className="h-full rounded-full bg-blog-accent" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className="flex-none font-mono text-xs text-blog-muted">
        {clock(current)} / {clock(duration)}
      </span>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />
    </div>
  );
}
