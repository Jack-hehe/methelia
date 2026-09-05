"use client";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  Captions,
} from "lucide-react";
import type { PackageState, Progress } from "../core/state";
import { pageTrack } from "../core/lesson-pages";
const clock = (n: number) =>
  `${Math.floor(n / 60)}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;

export function AudioControls({
  pkg,
  sectionId,
  progress,
  paused,
  playbackRequest,
  onTime,
  onSave,
  onError,
  onPlayingChange,
  statusControl,
  trailingControls,
}: {
  pkg: PackageState;
  sectionId: string;
  progress: Progress;
  paused: boolean;
  playbackRequest?: {
    time: number;
    play: boolean;
    id: number;
    packageId: string;
    sectionId: string;
  };
  onTime: (time: number) => void;
  onSave: (time: number) => void;
  onError: (e: string) => void;
  onPlayingChange?: (playing: boolean) => void;
  statusControl?: React.ReactNode;
  trailingControls?: React.ReactNode;
}) {
  const track = pageTrack(pkg, sectionId);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(track.start),
    [duration, setDuration] = useState(0),
    [rate, setRate] = useState(1),
    [muted, setMuted] = useState(false),
    [captions, setCaptions] = useState(true),
    [metadataReady, setMetadataReady] = useState(false);
  const lastSaved = useRef(0),
    alive = useRef(true);
  const enabled =
    pkg.status === "ready" &&
    Boolean(pkg.chapter) &&
    track.ready &&
    !progress.subtitleOnly;
  const end = pkg.pageAudio
    ? duration || track.end
    : Math.min(track.end, duration || track.end);
  const limit = (value: number) => Math.max(track.start, Math.min(value, end));
  useEffect(() => {
    alive.current = true;
    const audio = ref.current;
    return () => {
      alive.current = false;
      audio?.pause();
    };
  }, [enabled, track.url]);
  useEffect(() => {
    if (paused) ref.current?.pause();
  }, [paused]);
  useEffect(() => {
    if (
      !playbackRequest ||
      playbackRequest.packageId !== pkg.id ||
      playbackRequest.sectionId !== sectionId ||
      !enabled ||
      !metadataReady ||
      !ref.current
    )
      return;
    seek(playbackRequest.time);
    if (playbackRequest.play && !paused)
      void ref.current.play().catch(() => onError("請按播放開始本頁解說。"));
    else ref.current.pause();
  }, [playbackRequest?.id, metadataReady, enabled]);
  function seek(value: number) {
    if (!ref.current) return;
    const safe = limit(value);
    ref.current.currentTime = safe;
    setTime(safe);
    onTime(safe);
  }
  const text = track.captions.length
    ? track.captions.find((c) => time >= c.start && time < c.end)?.text
    : pkg.chapter?.script.find((s) => s.sectionId === sectionId)?.text;
  return (
    <div className="audio-dock">
      {enabled && (
        <audio
          ref={ref}
          src={track.url}
          preload="metadata"
          onLoadedMetadata={() => {
            const a = ref.current!;
            const max = pkg.pageAudio
              ? a.duration
              : Math.min(track.end, a.duration);
            setDuration(a.duration);
            const restored =
              progress.sectionId === sectionId ? progress.time : track.start;
            a.currentTime = Math.max(track.start, Math.min(restored, max));
            setTime(a.currentTime);
            onTime(a.currentTime);
            setMetadataReady(true);
          }}
          onTimeUpdate={() => {
            if (!alive.current) return;
            const a = ref.current!;
            const safe = limit(a.currentTime);
            if (a.currentTime >= end) {
              a.pause();
              if (a.currentTime !== safe) a.currentTime = safe;
            }
            setTime(safe);
            onTime(safe);
            if (Date.now() - lastSaved.current > 5000) {
              lastSaved.current = Date.now();
              onSave(safe);
            }
          }}
          onPlay={() => {
            setPlaying(true);
            onPlayingChange?.(true);
          }}
          onPause={() => {
            if (alive.current) {
              setPlaying(false);
              onPlayingChange?.(false);
              onSave(limit(ref.current?.currentTime || track.start));
            }
          }}
          onEnded={() => {
            setPlaying(false);
            onPlayingChange?.(false);
            onTime(end);
          }}
          onError={() => onError("本頁語音無法播放，請重整後重試。")}
        />
      )}
      {enabled && captions && text && (
        <div className="subtitle-line" aria-live="off">
          {text}
        </div>
      )}
      <div className="timeline">
        <input
          type="range"
          aria-label="解說進度"
          aria-valuetext={`${clock(Math.max(0, time - track.start))} / ${clock(Math.max(0, end - track.start))}`}
          min="0"
          max={Math.max(0.1, end - track.start)}
          value={Math.max(0, time - track.start)}
          step="0.1"
          disabled={!enabled || !metadataReady}
          onChange={(e) => seek(track.start + Number(e.target.value))}
        />
      </div>
      <div className="audio-transport">
        <button
          className="play-button"
          disabled={!enabled || !metadataReady || paused}
          aria-label={playing ? "暫停解說" : "播放解說"}
          onClick={() => {
            if (playing) ref.current?.pause();
            else {
              if (time >= end - 0.05) seek(track.start);
              void ref.current?.play().catch(() => onError("請再按一次播放。"));
            }
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="audio-time-slot">
          {statusControl || (
            <span className="audio-clock" aria-label="本頁解說時間">
              {clock(Math.max(0, time - track.start))}{" "}
              <span>/ {clock(Math.max(0, end - track.start))}</span>
            </span>
          )}
        </div>
        <button
          className="icon-button audio-rewind"
          aria-label="倒退十秒"
          title="倒退十秒"
          disabled={!enabled}
          onClick={() => seek(time - 10)}
        >
          <SkipBack size={17} />
        </button>
      </div>
      <div className="canvas-tools">
        <div className="audio-options" role="group" aria-label="解說設定">
          <button
            className={"icon-button " + (captions ? "selected" : "")}
            aria-label="切換字幕"
            title="字幕"
            aria-pressed={captions}
            disabled={!enabled}
            onClick={() => setCaptions((v) => !v)}
          >
            <Captions size={19} />
          </button>
          <button
            className="icon-button"
            aria-label="切換靜音"
            title={muted ? "開啟聲音" : "關閉聲音"}
            aria-pressed={muted}
            disabled={!enabled}
            onClick={() => {
              if (ref.current) ref.current.muted = !muted;
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            className="rate-button"
            aria-label="播放速度"
            aria-description={`目前速度 ${rate} 倍`}
            title="播放速度"
            disabled={!enabled}
            onClick={() => {
              const r = rate === 1 ? 1.25 : rate === 1.25 ? 1.5 : 1;
              setRate(r);
              if (ref.current) ref.current.playbackRate = r;
            }}
          >
            {rate}×
          </button>
        </div>
        {trailingControls}
      </div>
    </div>
  );
}
