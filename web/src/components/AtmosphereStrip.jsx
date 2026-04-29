import { useEffect, useState } from "react";
import { api } from "../services/api.js";

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #A6192E 0%, #1a1a1a 100%)",
  "linear-gradient(135deg, #6B0F1A 0%, #A6192E 50%, #F5F1E8 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #A6192E 60%, #F5F1E8 100%)",
];

export default function AtmosphereStrip() {
  const [images, setImages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(new Set());

  useEffect(() => {
    api
      .getAtmosphereImages()
      .then((r) => setImages(r.images || []))
      .catch(() => setImages([]));
  }, []);

  const usable = images.filter((i) => !failed.has(i.url));

  useEffect(() => {
    if (usable.length === 0) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % usable.length),
      5000
    );
    return () => clearInterval(t);
  }, [usable.length]);

  const onImgError = (url) => {
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  if (usable.length === 0) {
    return (
      <div
        className="relative h-56 rounded-xl overflow-hidden flex items-end p-4"
        style={{
          background: FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length],
          transition: "background 1.2s ease-in-out",
        }}
      >
        <div className="text-white/90 text-sm">
          <div className="text-xs uppercase tracking-wider opacity-70">
            The Lawrenceville School
          </div>
          <div className="font-serif text-xl mt-1">Bold. Beautiful. Big Red.</div>
        </div>
      </div>
    );
  }

  const current = usable[idx % usable.length];

  return (
    <div className="relative h-56 rounded-xl overflow-hidden bg-stone-900">
      {usable.map((img, i) => (
        <img
          key={img.url}
          src={img.url}
          alt={img.title || "Lawrenceville"}
          onError={() => onImgError(img.url)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{
            opacity: i === idx % usable.length ? 1 : 0,
            transform: i === idx % usable.length ? "scale(1.05)" : "scale(1)",
            transition: "opacity 1200ms ease-in-out, transform 6s ease-out",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-3 left-4 right-4 text-white">
        <div className="text-xs uppercase tracking-wider opacity-80">
          On campus
        </div>
        <a
          href={current.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-serif text-base hover:underline line-clamp-1"
        >
          {current.title}
        </a>
      </div>
      <div className="absolute top-3 right-3 flex gap-1">
        {usable.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition ${
              i === idx % usable.length ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
