"use client";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  Volume2,
  VolumeX,
  Captions,
  ArrowRight,
} from "lucide-react";
import type { PackageState, Progress } from "../core/state";
import { clampSeek } from "../core/narration";
const clock = (n: number) =>
  `${Math.floor(n / 60)}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
export function AudioControls({
  pkg,
  progress,
  paused,
  playbackRequest,
  onTime,
  onSave,
  onNext,
  nextDisabled,
  onError,
}: {
  pkg: PackageState;
  progress: Progress;
  paused: boolean;
  playbackRequest?: {
    time: number;
    play: boolean;
    id: number;
    packageId: string;
  };
  onTime: (time: number) => void;
  onSave: (time: number) => void;
  onNext: () => void;
  nextDisabled: boolean;
  onError: (e: string) => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(progress.time),
    [duration, setDuration] = useState(0),
    [rate, setRate] = useState(1),
    [muted, setMuted] = useState(false),
    [captions, setCaptions] = useState(true);
  const lastSaved = useRef(0);
  const [metadataReady, setMetadataReady] = useState(false);
  const enabled = pkg.speech === "ready" && !progress.subtitleOnly;
  const required =
    pkg.chapter?.sections.filter((s) => s.completion).map((s) => s.id) || [];
  useEffect(() => {
    if (paused) ref.current?.pause();
  }, [paused]);
  useEffect(() => {
    if (
      !playbackRequest ||
      playbackRequest.packageId !== pkg.id ||
      !ref.current ||
      !enabled ||
      !metadataReady
    )
      return;
    seek(playbackRequest.time);
    if (playbackRequest.play && !paused)
      void ref.current
        .play()
        .catch(() => onError("請按播放解說開始語音示範。"));
    else ref.current.pause();
  }, [playbackRequest?.id, metadataReady, enabled]);
  function seek(value: number) {
    if (!ref.current) return;
    ref.current.currentTime = clampSeek(
      value,
      pkg.cues,
      required,
      progress.done,
    );
    setTime(ref.current.currentTime);
    onTime(ref.current.currentTime);
  }
  const active = pkg.cues.find((c) => time >= c.start && time <= c.end);
  const text = pkg.chapter?.script.find(
    (s) => s.sectionId === active?.sectionId,
  )?.text;
  return (
    <div className="audio-dock">
      {enabled && (
        <audio
          ref={ref}
          src={"/api/audio/" + pkg.id}
          preload="metadata"
          onLoadedMetadata={() => {
            const a = ref.current!;
            setDuration(a.duration);
            a.currentTime = Math.min(progress.time, a.duration);
            setMetadataReady(true);
          }}
          onTimeUpdate={() => {
            const a = ref.current!;
            const safe = clampSeek(
              a.currentTime,
              pkg.cues,
              required,
              progress.done,
            );
            if (safe < a.currentTime) {
              a.currentTime = safe;
              a.pause();
            }
            setTime(safe);
            onTime(safe);
            if (Date.now() - lastSaved.current > 5000) {
              lastSaved.current = Date.now();
              onSave(safe);
            }
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            onSave(ref.current?.currentTime || 0);
          }}
          onEnded={() => setPlaying(false)}
          onError={() => onError("語音檔案無法播放，請重整或稍後重試。")}
        />
      )}
      {enabled && captions && text && (
        <div className="subtitle-line" aria-live="off">
          {text}
        </div>
      )}
      <div className="audio-dock-inner">
        <div className="playback-controls">
          <button
            className="play-button"
            disabled={!enabled}
            aria-label={playing ? "暫停解說" : "播放解說"}
            onClick={() => {
              if (playing) ref.current?.pause();
              else
                void ref.current
                  ?.play()
                  .catch(() => onError("瀏覽器無法開始播放，請再按一次播放。"));
            }}
          >
            {playing ? <Pause size={19} /> : <Play size={19} />}
          </button>
          <button
            className="icon-button desktop-only"
            aria-label="倒退十秒"
            disabled={!enabled}
            onClick={() => seek(Math.max(0, time - 10))}
          >
            <SkipBack size={17} />
          </button>
          <span className="playback-label">
            {enabled ? "跟隨解說" : "完整文字模式"}
            <small>{enabled ? "FISH AUDIO" : "自在閱讀，動手理解"}</small>
          </span>
        </div>
        <div className="timeline">
          <span>{clock(time)}</span>
          <input
            type="range"
            aria-label="解說進度"
            min="0"
            max={duration || 1}
            value={time}
            step="0.1"
            disabled={!enabled}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <span>{clock(duration)}</span>
        </div>
        <div className="audio-options">
          <button
            className={"icon-button " + (captions ? "selected" : "")}
            aria-label="切換字幕"
            disabled={!enabled}
            onClick={() => setCaptions((v) => !v)}
          >
            <Captions size={19} />
          </button>
          <button
            className="icon-button"
            aria-label="切換靜音"
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
        <button
          className="next-button"
          disabled={nextDisabled}
          onClick={onNext}
        >
          繼續下一章 <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
