import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CornerUpRight,
  CheckCheck,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Maximize2,
  Eye,
} from 'lucide-react';

import { MessageReaction } from '../types';

interface MediaGridMessageProps {
  images: string[];
  isSender?: boolean;
  isMyMessage?: boolean;
  timestamp: string;
  isRead?: boolean;
  isDelivered?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: string;
  text?: string;
  caption?: string;
  reactions?: MessageReaction[];
  onForward?: () => void;
  onImageClick?: (url: string) => void;
  onReactionClick?: (emoji: any) => void;
  onOpenContextMenu?: () => void;
}

export const MediaGridMessage: React.FC<MediaGridMessageProps> = ({
  images,
  isSender,
  isMyMessage,
  timestamp,
  isRead = false,
  isDelivered = true,
  isForwarded = false,
  forwardedFrom,
  text,
  caption,
  reactions,
  onForward,
  onImageClick,
  onReactionClick,
  onOpenContextMenu,
}) => {
  const isMsgSender = isSender ?? isMyMessage ?? false;
  const msgText = text || caption;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const validImages = (images || []).filter(
    (img) => typeof img === 'string' && img.trim().length > 0
  );

  if (validImages.length === 0) return null;

  const totalCount = validImages.length;
  const displayImages = validImages.slice(0, 4);
  const remainingCount = totalCount > 4 ? totalCount - 3 : 0;

  const openLightbox = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % totalCount);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + totalCount) % totalCount);
    }
  };

  const handleDownload = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `media_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        className={`flex items-end gap-1.5 max-w-[88%] sm:max-w-[76%] ${
          isMsgSender ? 'ml-auto flex-row' : 'mr-auto flex-row-reverse'
        }`}
      >
        {/* Sleek Circular Forward Button (Floating next to the bubble) */}
        {onForward && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onForward();
            }}
            title="Forward media"
            className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-600 shadow-sm border border-slate-200/60 flex items-center justify-center transition-all opacity-85 hover:opacity-100 mb-1 cursor-pointer flex-shrink-0"
          >
            <CornerUpRight className="w-3.5 h-3.5" />
          </motion.button>
        )}

        {/* The Media Bubble Container */}
        <div
          className={`relative overflow-hidden shadow-xs transition-all ${
            isMsgSender
              ? 'neu-active-blue text-white rounded-[18px] rounded-br-[3px] shadow-sm'
              : 'bg-white text-slate-800 rounded-[18px] rounded-bl-[3px] border border-slate-200/80 shadow-2xs'
          } p-[2px]`}
        >
          {/* Forwarded Header Indicator */}
          {isForwarded && (
            <div className={`flex items-center gap-1 px-2 pt-0.5 pb-0.5 text-[9.5px] italic font-medium ${isMsgSender ? 'text-blue-100' : 'text-slate-500'}`}>
              <CornerUpRight className={`w-2.5 h-2.5 ${isMsgSender ? 'text-blue-200' : 'text-slate-400'}`} />
              <span>Forwarded</span>
            </div>
          )}

          {/* Single Image Layout */}
          {totalCount === 1 && (
            <div
              onClick={(e) => {
                if (onImageClick) {
                  onImageClick(validImages[0]);
                } else {
                  openLightbox(0, e);
                }
              }}
              className={`relative cursor-pointer overflow-hidden rounded-[16px] ${
                isMsgSender ? 'rounded-br-[2px]' : 'rounded-bl-[2px]'
              } group w-[270px] sm:w-[320px] max-w-[85vw] min-h-[190px] sm:min-h-[230px] aspect-[4/3] bg-slate-900/10 flex items-center justify-center`}
            >
              <img
                src={validImages[0]}
                alt="Media"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover block group-hover:scale-[1.01] transition-transform duration-200"
              />

              {/* Floating Bottom Right Timestamp Pill */}
              <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-xs flex items-center gap-1 text-[9.5px] font-medium text-white/95 shadow-xs">
                <span>{timestamp}</span>
                {isMsgSender && (
                  <span>
                    {isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    ) : isDelivered ? (
                      <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Two Images Layout (Side-by-Side) */}
          {totalCount === 2 && (
            <div
              className={`relative overflow-hidden rounded-[16px] ${
                isMsgSender ? 'rounded-br-[2px]' : 'rounded-bl-[2px]'
              } w-[270px] sm:w-[320px]`}
            >
              <div className="grid grid-cols-2 gap-[2px]">
                {validImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => openLightbox(idx, e)}
                    className="relative aspect-square cursor-pointer overflow-hidden bg-slate-900/10 group"
                  >
                    <img
                      src={img}
                      alt={`Media ${idx + 1}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>

              {/* Floating Timestamp Pill */}
              <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-xs flex items-center gap-1 text-[9.5px] font-medium text-white/95 shadow-xs">
                <span>{timestamp}</span>
                {isMsgSender && (
                  <span>
                    {isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Three Images Layout (1 Big + 2 Stacked) */}
          {totalCount === 3 && (
            <div
              className={`relative overflow-hidden rounded-[16px] ${
                isMsgSender ? 'rounded-br-[2px]' : 'rounded-bl-[2px]'
              } w-[270px] sm:w-[320px]`}
            >
              <div className="grid grid-cols-2 gap-[2px] h-[220px]">
                <div
                  onClick={(e) => openLightbox(0, e)}
                  className="relative h-full cursor-pointer overflow-hidden bg-slate-900/10 group"
                >
                  <img
                    src={validImages[0]}
                    alt="Media 1"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="grid grid-rows-2 gap-[2px] h-full">
                  {validImages.slice(1, 3).map((img, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => openLightbox(idx + 1, e)}
                      className="relative h-full cursor-pointer overflow-hidden bg-slate-900/10 group"
                    >
                      <img
                        src={img}
                        alt={`Media ${idx + 2}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Timestamp Pill */}
              <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-xs flex items-center gap-1 text-[9.5px] font-medium text-white/95 shadow-xs">
                <span>{timestamp}</span>
                {isMsgSender && (
                  <span>
                    {isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Four or More Images Layout (2x2 Grid with +N overlay) */}
          {totalCount >= 4 && (
            <div
              className={`relative overflow-hidden rounded-[16px] ${
                isMsgSender ? 'rounded-br-[2px]' : 'rounded-bl-[2px]'
              } w-[270px] sm:w-[320px]`}
            >
              <div className="grid grid-cols-2 gap-[2px]">
                {displayImages.map((img, idx) => {
                  const isLastTile = idx === 3;
                  const hasMore = isLastTile && remainingCount > 0;

                  return (
                    <div
                      key={idx}
                      onClick={(e) => openLightbox(idx, e)}
                      className="relative aspect-square cursor-pointer overflow-hidden bg-slate-900/10 group"
                    >
                      <img
                        src={img}
                        alt={`Media ${idx + 1}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />

                      {/* WhatsApp + N Overlay for 4th tile */}
                      {hasMore && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-all group-hover:bg-black/50">
                          <span className="text-white text-xl sm:text-2xl font-bold tracking-wider drop-shadow-md">
                            + {remainingCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating Timestamp Pill on Bottom-Right */}
              <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-xs flex items-center gap-1 text-[9.5px] font-medium text-white/95 shadow-xs">
                <span>{timestamp}</span>
                {isMsgSender && (
                  <span>
                    {isRead ? (
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Optional Caption Text Below the Media Grid */}
          {msgText && msgText.trim().length > 0 && (
            <div className="px-2 pt-1 pb-0.5">
              <p className={`text-[12.5px] leading-snug break-words whitespace-pre-wrap font-normal ${isMsgSender ? 'text-white' : 'text-slate-800'}`}>
                {msgText}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Gallery Modal for Fullscreen Photo Exploration */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none"
            onClick={closeLightbox}
          >
            {/* Top Toolbar */}
            <div
              className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tracking-wide bg-white/20 px-3 py-1 rounded-full">
                  {lightboxIndex + 1} / {totalCount}
                </span>
                <span className="text-xs text-white/70">{timestamp}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDownload(e, validImages[lightboxIndex])}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition cursor-pointer text-white"
                  title="Download image"
                >
                  <Download className="w-4 h-4" />
                </button>
                {onForward && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeLightbox();
                      onForward();
                    }}
                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition cursor-pointer text-white"
                    title="Forward image"
                  >
                    <CornerUpRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={closeLightbox}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition cursor-pointer text-white"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Central Main Image View with Navigation Arrows */}
            <div
              className="relative flex-1 flex items-center justify-center p-2 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {totalCount > 1 && (
                <button
                  onClick={prevImage}
                  className="absolute left-3 sm:left-6 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition z-10 cursor-pointer shadow-lg"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <motion.img
                key={lightboxIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={validImages[lightboxIndex]}
                alt={`Media ${lightboxIndex + 1}`}
                referrerPolicy="no-referrer"
                className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl"
              />

              {totalCount > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-3 sm:right-6 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition z-10 cursor-pointer shadow-lg"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom Thumbnails Strip (if multiple images) */}
            {totalCount > 1 && (
              <div
                className="p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2 overflow-x-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {validImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                      lightboxIndex === idx
                        ? 'border-[#5B9DFF] scale-110 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
