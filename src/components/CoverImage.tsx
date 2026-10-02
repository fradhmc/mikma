import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

interface CoverImageProps {
  src: string | null;
  mangaId?: string;
  coverFileName?: string | null;
  title: string;
  author?: string;
  className?: string;
  aspectClassName?: string;
}

export const CoverImage: React.FC<CoverImageProps> = ({
  src,
  mangaId,
  coverFileName,
  title,
  author,
  className = '',
  aspectClassName = 'aspect-[3/4]',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src);
  const [triedDirect, setTriedDirect] = useState(false);
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setTriedDirect(false);
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    if (!triedDirect && mangaId && coverFileName) {
      setTriedDirect(true);
      setCurrentSrc(`https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}.512.jpg`);
    } else if (!triedDirect && src && src.startsWith('/api/cover/')) {
      setTriedDirect(true);
      const suffix = src.replace(/^\/api\/cover\//, '');
      setCurrentSrc(`https://uploads.mangadex.org/covers/${suffix}`);
    } else {
      setFailed(true);
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-stone-200 dark:bg-stone-900 select-none ${aspectClassName} ${className}`}
    >
      {/* Editorial Fallback & Loading Underlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-br from-stone-200 via-stone-100 to-stone-300 dark:from-stone-900 dark:via-stone-950 dark:to-stone-900 border border-stone-300/60 dark:border-stone-800/80 transition-opacity duration-200 ${
          loaded && !failed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between text-stone-400 dark:text-stone-600 text-[11px] font-tabular">
          <span>ARSIP MANGA</span>
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <div className="my-auto py-2 border-y border-stone-300/80 dark:border-stone-800">
          <p className="font-editorial text-lg leading-snug text-stone-800 dark:text-stone-200 line-clamp-3">
            {title}
          </p>
          {author && (
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 truncate">{author}</p>
          )}
        </div>
        <div className="text-[10px] text-stone-400 dark:text-stone-600 font-tabular">
          MIKMA CATALOG
        </div>
      </div>

      {/* Actual Cover Image */}
      {!failed && currentSrc && (
        <img
          src={currentSrc}
          alt={`Sampul manga ${title}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
