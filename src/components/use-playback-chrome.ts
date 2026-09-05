"use client";
import { useEffect, useState, type RefObject } from "react";

/** Playback chrome yields space only while watching, never while typing or dragging. */
export function usePlaybackChrome(
  root: RefObject<HTMLElement | null>,
  playing: boolean,
  resetKey: string,
) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dragging = false;
    const editable = () =>
      document.activeElement?.matches(
        'input:not([type="range"]), textarea, select, [contenteditable="true"]',
      );
    const keyboardFocus = () =>
      element.contains(document.activeElement) &&
      document.activeElement?.matches(":focus-visible");
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      if (
        playing &&
        !dragging &&
        !document.hidden &&
        !editable() &&
        !keyboardFocus()
      )
        timer = setTimeout(() => setIdle(true), 2500);
    };
    const down = () => {
      dragging = true;
      wake();
    };
    const up = () => {
      dragging = false;
      wake();
    };
    const keys = () => wake();
    const focus = (event: FocusEvent) => {
      if ((event.target as HTMLElement)?.closest("[inert]")) return;
      wake();
    };
    element.addEventListener("pointermove", wake);
    element.addEventListener("pointerdown", down);
    element.addEventListener("wheel", wake, { passive: true });
    element.addEventListener("focusin", focus);
    element.addEventListener("focusout", focus);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", keys, true);
    document.addEventListener("visibilitychange", wake);
    wake();
    return () => {
      clearTimeout(timer);
      element.removeEventListener("pointermove", wake);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("wheel", wake);
      element.removeEventListener("focusin", focus);
      element.removeEventListener("focusout", focus);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keys, true);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [playing, resetKey, root]);
  return playing && idle;
}
