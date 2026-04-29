import { useEffect, useRef, useState } from "react";

// Returns a progressively-revealed substring of `text`. When `enabled` is
// false, returns the full text immediately (used for already-rendered history).
export function useTypewriter(text, enabled, { charsPerTick = 4, msPerTick = 14 } = {}) {
  const [shown, setShown] = useState(enabled ? "" : text);
  const tRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const tick = () => {
      i += charsPerTick;
      if (i >= text.length) {
        setShown(text);
      } else {
        setShown(text.slice(0, i));
        tRef.current = setTimeout(tick, msPerTick);
      }
    };
    tRef.current = setTimeout(tick, msPerTick);
    return () => clearTimeout(tRef.current);
  }, [text, enabled, charsPerTick, msPerTick]);

  const isDone = shown.length >= (text || "").length;
  return { shown, isDone };
}
