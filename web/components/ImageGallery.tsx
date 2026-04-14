import React, { useState, useCallback } from 'react';

interface ImageGalleryProps {
  images: string[];
  labels?: { imageUnavailable?: string };
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, labels }) => {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [failedSet, setFailedSet] = useState<Set<string>>(new Set());

  const onError = useCallback((src: string) => {
    setFailedSet(prev => new Set(prev).add(src));
  }, []);

  if (!images.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 my-2">
        {images.map((src, i) => (
          failedSet.has(src) ? (
            <div key={i} className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-white/15">broken_image</span>
              <span className="text-[7px] text-slate-300 dark:text-white/15">{labels?.imageUnavailable || 'Unavailable'}</span>
            </div>
          ) : (
            <button key={i} onClick={() => setLightbox(src)} className="group relative">
              <img
                src={src}
                alt=""
                loading="lazy"
                onError={() => onError(src)}
                className="max-h-32 max-w-[200px] rounded-xl object-cover border border-slate-200/40 dark:border-white/[0.06]
                           transition hover:shadow-lg hover:scale-[1.02] cursor-zoom-in"
              />
              <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition" />
            </button>
          )
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-zoom-out animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-white text-[18px]">close</span>
          </button>
        </div>
      )}
    </>
  );
};
