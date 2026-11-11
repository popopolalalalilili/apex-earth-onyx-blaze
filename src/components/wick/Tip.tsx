import { useEffect, useRef, useState } from "react";

export function Tip({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  function place() {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(280, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
    const below = r.bottom + 8;
    const top = below + 120 > window.innerHeight ? Math.max(12, r.top - 96) : below;
    setBox({ top, left });
  }

  useEffect(() => {
    if (!on) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOn(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOn(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [on]);

  return (
    <span className="tip" ref={ref}>
      <button
        ref={btn}
        type="button"
        className="tip-btn"
        aria-expanded={on}
        aria-label="More info"
        onClick={() => {
          place();
          setOn((v) => !v);
        }}
      >
        i
      </button>
      {on && (
        <span className="tip-pop" role="tooltip" style={{ top: box.top, left: box.left }}>
          {text}
        </span>
      )}
    </span>
  );
}
