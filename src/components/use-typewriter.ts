"use client";
import { useEffect, useRef, useState } from "react";

type Options = {
  /** Must be a stable reference — define it outside the component. */
  words: readonly string[];
  typeMs?: number;
  eraseMs?: number;
  holdMs?: number;
  gapMs?: number;
  startMs?: number;
  /** A disabled typewriter clears itself, so it never competes with real input. */
  enabled?: boolean;
};

/**
 * Types a phrase out, holds it, erases it, moves to the next.
 * `text` is what to render; `idle` is true while the caret rests between phrases.
 */
export function useTypewriter({
  words,
  typeMs = 110,
  eraseMs = 60,
  holdMs = 2200,
  gapMs = 420,
  startMs = 500,
  enabled = true,
}: Options) {
  const [text, setText] = useState("");
  const [idle, setIdle] = useState(true);
  const at = useRef({ word: 0, char: 0, erasing: false });
  const previousWords = useRef(words);

  useEffect(() => {
    if (previousWords.current !== words) {
      previousWords.current = words;
      at.current = { word: 0, char: 0, erasing: false };
      setText("");
      setIdle(true);
    }
    if (!enabled) {
      at.current.char = 0;
      at.current.erasing = false;
      setText("");
      setIdle(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(words[0]);
      setIdle(true);
      return;
    }

    let timer = setTimeout(step, startMs);

    function step() {
      const c = at.current;
      const word = words[c.word];

      if (!c.erasing) {
        c.char += 1;
        setText(word.slice(0, c.char));
        if (c.char === word.length) {
          c.erasing = true;
          setIdle(true);
          timer = setTimeout(step, holdMs);
          return;
        }
        setIdle(false);
        timer = setTimeout(step, typeMs);
        return;
      }

      c.char -= 1;
      setText(word.slice(0, c.char));
      if (c.char === 0) {
        c.erasing = false;
        c.word = (c.word + 1) % words.length;
        setIdle(true);
        timer = setTimeout(step, gapMs);
        return;
      }
      setIdle(false);
      timer = setTimeout(step, eraseMs);
    }

    return () => clearTimeout(timer);
  }, [enabled, words, typeMs, eraseMs, holdMs, gapMs, startMs]);

  return { text, idle };
}
