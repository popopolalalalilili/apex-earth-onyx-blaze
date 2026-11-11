import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "./motion";

export function RotatingWord({ locked }: { locked: "up" | "down" | null }) {
  const reduced = useReducedMotion();
  const [cycle, setCycle] = useState<"up" | "down">("up");
  const shown = locked ?? cycle;
  const [prev, setPrev] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const last = useRef(shown);

  useEffect(() => {
    if (locked || reduced) return;
    const id = window.setInterval(() => setCycle((w) => (w === "up" ? "down" : "up")), 5200);
    return () => window.clearInterval(id);
  }, [locked, reduced]);

  if (shown !== last.current) {
    setPrev(reduced ? null : last.current);
    last.current = shown;
    setTick((n) => n + 1);
  }

  useEffect(() => {
    if (prev == null) return;
    const id = window.setTimeout(() => setPrev(null), 1000);
    return () => window.clearTimeout(id);
  }, [tick, prev]);

  const measure = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (measure.current) setWidth(measure.current.offsetWidth);
  }, [shown]);

  return (
    <span className="word-slot" style={{ width: width ? `${width}px` : undefined }} aria-hidden="true">
      <span className="word-measure" ref={measure}>
        {shown}
      </span>
      {prev != null && <span className="word leave">{prev}</span>}
      <span className={prev != null ? "word enter" : "word"}>{shown}</span>
      <span className="uline" />
    </span>
  );
}
