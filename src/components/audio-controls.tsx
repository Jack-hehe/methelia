"use client";
import { useCourseLanguage } from "./course-language";
import { localizedError } from "../core/language";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Captions,
} from "lucide-react";
import type { PackageState, Progress } from "../core/state";
import { pageTrack } from "../core/lesson-pages";
import styles from "./audio-controls.module.css";
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
  onNavigate,
  onSave,
  onError,
  onPlayingChange,
  statusControl,
  trailingControls,
  captionTarget,
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
  onNavigate?: (time: number, play: boolean) => Promise<void>;
  onSave: (time: number) => void;
  onError: (e: string) => void;
  onPlayingChange?: (playing: boolean) => void;
  statusControl?: React.ReactNode;
  trailingControls?: React.ReactNode;
  captionTarget?: HTMLDivElement | null;
}) {
  const { t, language, english } = useCourseLanguage();
  const chapterMode = pkg.narrationMode === "chapter" && !pkg.pageAudio;
  const page = pageTrack(pkg, sectionId);
  const track = chapterMode
    ? {
        ...page,
        start: 0,
        end: Math.max(0, ...pkg.cues.map((c) => c.end)),
        ready: pkg.speech === "ready" && pkg.cues.length > 0,
        cues: pkg.cues,
        captions: pkg.captions || [],
      }
    : page;
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(track.start),
    [duration, setDuration] = useState(0),
    [rate, setRate] = useState(1),
    [muted, setMuted] = useState(false),
    [captions, setCaptions] = useState(true),
    [metadataSource, setMetadataSource] = useState(""),
    [navigating, setNavigating] = useState(false);
  const source = `${pkg.id}:${track.url}`;
  const metadataReady = metadataSource === source;
  const navigationId = useRef(0);
  const navigationActive = useRef(false);
  const scrubbing = useRef(false);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const appliedRequest = useRef<number | undefined>(undefined);
  const lastSaved = useRef(0),
    alive = useRef(true);
  const enabled =
    pkg.status === "ready" &&
    Boolean(pkg.chapter) &&
    track.ready &&
    !progress.subtitleOnly;
  const end =
    pkg.pageAudio || chapterMode
      ? (metadataReady && duration) || track.end
      : Math.min(track.end, duration || track.end);
  const limit = (value: number) => Math.max(track.start, Math.min(value, end));
  const nextPageStart = chapterMode
    ? pkg.cues.find(
        (cue) => cue.sectionId !== sectionId && cue.start > page.start,
      )?.start
    : undefined;
  // Stay inside this section even when adjacent aligned cues share a boundary.
  const playbackEnd = Math.max(
    page.start,
    Math.min(
      page.end || end,
      end,
      nextPageStart === undefined ? end : nextPageStart - 0.01,
    ),
  );
  const pageLimit = (value: number) =>
    Math.max(page.start, Math.min(value, playbackEnd));
  const boundaryState = useRef({ playbackEnd, onTime, onSave });
  boundaryState.current = { playbackEnd, onTime, onSave };
  useEffect(() => {
    if (!playing || !enabled || !metadataReady) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const audio = ref.current;
      if (
        !audio ||
        audio.paused ||
        navigationActive.current ||
        scrubbing.current
      )
        return;
      const boundary = boundaryState.current;
      const remaining =
        (boundary.playbackEnd - audio.currentTime) / audio.playbackRate;
      // timeupdate can be hundreds of milliseconds apart. Check independently,
      // allowing a small scheduling margin before the next page's first word.
      if (remaining <= 0.025) {
        audio.pause();
        audio.currentTime = boundary.playbackEnd;
        setTime(boundary.playbackEnd);
        boundary.onTime(boundary.playbackEnd);
        boundary.onSave(boundary.playbackEnd);
        return;
      }
      timer = setTimeout(check, Math.min(25, (remaining - 0.025) * 1000));
    };
    // Let the matching playback request seek before enforcing the new page.
    timer = setTimeout(check, 0);
    return () => clearTimeout(timer);
  }, [playing, enabled, metadataReady, sectionId, source, playbackRequest?.id]);
  useEffect(() => {
    alive.current = true;
    setMetadataSource("");
    setDuration(0);
    setPlaying(false);
    setNavigating(false);
    scrubbing.current = false;
    navigationActive.current = false;
    appliedRequest.current = undefined;
    navigationId.current++;
    const audio = ref.current;
    return () => {
      alive.current = false;
      audio?.pause();
    };
  }, [enabled, source]);
  useEffect(() => {
    if (paused) ref.current?.pause();
  }, [paused]);
  useEffect(() => {
    if (
      !playbackRequest ||
      appliedRequest.current === playbackRequest.id ||
      playbackRequest.packageId !== pkg.id ||
      playbackRequest.sectionId !== sectionId ||
      !enabled ||
      !metadataReady ||
      (playbackRequest.play && paused) ||
      !ref.current
    )
      return;
    appliedRequest.current = playbackRequest.id;
    navigationId.current++;
    navigationActive.current = false;
    setNavigating(false);
    seek(playbackRequest.time);
    if (playbackRequest.play && !paused)
      void ref.current
        .play()
        .catch(() =>
          onError(t("請按播放開始解說。", "Press play to start narration.")),
        );
    else ref.current.pause();
  }, [playbackRequest?.id, metadataReady, enabled, sectionId, paused]);
  function seek(value: number, notify = true) {
    if (!ref.current) return;
    const safe = limit(value);
    ref.current.currentTime = safe;
    setTime(safe);
    if (notify) onTime(safe);
  }
  async function navigate(value: number) {
    const audio = ref.current;
    if (!audio || !enabled || !metadataReady) return;
    navigationActive.current = true;
    audio.pause();
    const safe = limit(value);
    const request = ++navigationId.current;
    const originalSource = source;
    setNavigating(true);
    try {
      await onNavigate?.(safe, false);
      if (
        !alive.current ||
        sourceRef.current !== originalSource ||
        request !== navigationId.current
      )
        return;
      // onNavigate already persisted and synchronized the selected page. Do not
      // report this as natural playback through a callback from the old page.
      seek(safe, !onNavigate);
      if (!onNavigate) onSave(safe);
    } catch (error) {
      if (alive.current && sourceRef.current === originalSource) {
        setTime(audio.currentTime);
        onError(
          error instanceof Error
            ? localizedError(error, language)
            : t(
                "無法切換解說進度，請重試。",
                "Unable to seek narration. Please try again.",
              ),
        );
      }
    } finally {
      if (alive.current && request === navigationId.current) {
        navigationActive.current = false;
        setNavigating(false);
      }
    }
  }
  const markers = chapterMode
    ? pkg.chapter?.sections.flatMap((section, index) => {
        const cue = pkg.cues.find((item) => item.sectionId === section.id);
        return cue ? [{ section, index, time: cue.start }] : [];
      }) || []
    : [];
  const text = track.captions.length
    ? track.captions.find((c) => time >= c.start && time < c.end)?.text
    : pkg.chapter?.script.find((s) => s.sectionId === sectionId)?.text;
  return (
    <div className="audio-dock">
      {enabled && (
        <audio
          key={source}
          ref={ref}
          src={track.url}
          preload="metadata"
          onLoadedMetadata={() => {
            const a = ref.current!;
            const measuredDuration = Number.isFinite(a.duration)
              ? a.duration
              : track.end;
            const max =
              pkg.pageAudio || chapterMode
                ? measuredDuration
                : Math.min(track.end, measuredDuration);
            setDuration(measuredDuration);
            const restored =
              chapterMode || progress.sectionId === sectionId
                ? progress.time
                : track.start;
            a.currentTime = Math.max(track.start, Math.min(restored, max));
            a.playbackRate = rate;
            a.muted = muted;
            setTime(a.currentTime);
            onTime(a.currentTime);
            setMetadataSource(source);
          }}
          onTimeUpdate={() => {
            if (!alive.current || scrubbing.current || navigationActive.current)
              return;
            const a = ref.current!;
            // Paused timeline seeks can intentionally land in the silence
            // between aligned sections. Keep the displayed and saved time exact.
            const safe = a.paused
              ? limit(a.currentTime)
              : pageLimit(a.currentTime);
            if (!a.paused && a.currentTime >= playbackEnd) {
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
              if (!navigationActive.current)
                onSave(limit(ref.current?.currentTime ?? page.start));
            }
          }}
          onEnded={() => {
            setPlaying(false);
            onPlayingChange?.(false);
            onTime(playbackEnd);
          }}
          onError={() =>
            onError(
              t(
                "語音無法播放，請重整後重試。",
                "Unable to play narration. Refresh and try again.",
              ),
            )
          }
        />
      )}
      {/* Rendered for the whole of a narrated lesson, not only while a line is
          on screen, so the space the player reserves for it cannot flicker in
          and out between sentences. Empty lines are hidden in CSS. */}
      {enabled &&
        captions &&
        (captionTarget
          ? createPortal(
              <div className="subtitle-line" aria-live="off">
                {text}
              </div>,
              captionTarget,
            )
          : captionTarget === undefined && (
              <div className="subtitle-line" aria-live="off">
                {text}
              </div>
            ))}
      <div className={`timeline ${chapterMode ? styles.chapterTimeline : ""}`}>
        <input
          type="range"
          aria-label={t("解說進度", "Narration progress")}
          aria-valuetext={`${clock(Math.max(0, time - track.start))} / ${clock(Math.max(0, end - track.start))}`}
          min="0"
          max={Math.max(0.1, end - track.start)}
          value={Math.max(0, time - track.start)}
          step="0.1"
          disabled={!enabled || !metadataReady || navigating}
          onPointerDown={(e) => {
            scrubbing.current = true;
            ref.current?.pause();
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerUp={(e) => {
            if (!scrubbing.current) return;
            scrubbing.current = false;
            void navigate(track.start + Number(e.currentTarget.value));
          }}
          onPointerCancel={() => {
            scrubbing.current = false;
            setTime(ref.current?.currentTime || track.start);
          }}
          onChange={(e) => {
            const target = track.start + Number(e.target.value);
            if (scrubbing.current) setTime(target);
            else void navigate(target);
          }}
        />
        {markers.map((marker) => (
          <button
            key={marker.section.id}
            type="button"
            className={styles.pageMarker}
            data-page-marker={marker.section.id}
            aria-label={t(
              `第 ${marker.index + 1} 頁：${marker.section.title}，${clock(marker.time)}`,
              `Page ${marker.index + 1}: ${marker.section.title}, ${clock(marker.time)}`,
            )}
            aria-current={sectionId === marker.section.id ? "step" : undefined}
            title={t(
              `第 ${marker.index + 1} 頁 · ${marker.section.title} · ${clock(marker.time)}`,
              `Page ${marker.index + 1} · ${marker.section.title} · ${clock(marker.time)}`,
            )}
            style={{
              left: `${Math.max(0, Math.min(100, (marker.time / (end || 1)) * 100))}%`,
            }}
            disabled={!enabled || !metadataReady || navigating}
            onClick={() => void navigate(marker.time)}
          />
        ))}
      </div>
      <div className="audio-transport">
        <button
          className="play-button"
          disabled={!enabled || !metadataReady || paused || navigating}
          aria-label={
            playing
              ? t("暫停解說", "Pause narration")
              : t("播放解說", "Play narration")
          }
          onClick={() => {
            if (playing) ref.current?.pause();
            else {
              if ((ref.current?.currentTime ?? time) >= playbackEnd - 0.05)
                seek(page.start);
              void ref.current
                ?.play()
                .catch(() =>
                  onError(t("請再按一次播放。", "Please press play again.")),
                );
            }
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="audio-time-slot">
          {statusControl || (
            <span
              className="audio-clock"
              aria-label={
                chapterMode
                  ? t("本章解說時間", "Chapter narration time")
                  : t("本頁解說時間", "Page narration time")
              }
            >
              {clock(Math.max(0, time - track.start))}{" "}
              <span>/ {clock(Math.max(0, end - track.start))}</span>
            </span>
          )}
        </div>
      </div>
      <div className="canvas-tools">
        <div
          className="audio-options"
          role="group"
          aria-label={t("解說設定", "Narration settings")}
        >
          <button
            className={"icon-button " + (captions ? "selected" : "")}
            aria-label={t("切換字幕", "Toggle captions")}
            title={t("字幕", "Captions")}
            aria-pressed={captions}
            disabled={!enabled}
            onClick={() => setCaptions((v) => !v)}
          >
            <Captions size={19} />
          </button>
          <button
            className="icon-button"
            aria-label={t("切換靜音", "Toggle mute")}
            title={muted ? t("開啟聲音", "Unmute") : t("關閉聲音", "Mute")}
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
            aria-label={t("播放速度", "Playback speed")}
            aria-description={t(
              `目前速度 ${rate} 倍`,
              `Current speed ${rate}x`,
            )}
            title={t("播放速度", "Playback speed")}
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
