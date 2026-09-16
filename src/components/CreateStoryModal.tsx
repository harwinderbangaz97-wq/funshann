import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  Camera,
  Check,
  Sparkles,
  Send,
  RefreshCw,
  Film,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Story } from '../types';
import { usePermissionAndMedia } from '../context/PermissionAndMediaContext';
import { formatRelativeTime } from '../services/timeUtils';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPublishStory: (newStory: Story) => void;
  onShowToast?: (msg: string) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPublishStory,
  onShowToast,
}) => {
  const { chooseFromGallery, takePhoto, recordVideo } = usePermissionAndMedia();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen) return null;

  const handlePickFromGallery = async () => {
    const res = await chooseFromGallery({
      accept: 'image/*,video/*',
      featureName: 'Story Gallery',
    });
    if (res) {
      setSelectedMedia(res.url);
      setIsVideo(res.isVideo);
      if (onShowToast) {
        onShowToast(res.isVideo ? 'Video selected from gallery! 🎬' : 'Photo selected from gallery! 📸');
      }
    }
  };

  const handleTakePhoto = async () => {
    const res = await takePhoto({
      facingMode: 'environment',
      title: 'Snap Story Photo',
    });
    if (res) {
      setSelectedMedia(res.url);
      setIsVideo(false);
      if (onShowToast) onShowToast('Photo captured with camera! 📸');
    }
  };

  const handleRecordVideo = async () => {
    const res = await recordVideo({
      facingMode: 'environment',
      title: 'Record Story Video',
    });
    if (res) {
      setSelectedMedia(res.url);
      setIsVideo(true);
      if (onShowToast) onShowToast('Video recorded with camera! 🎬');
    }
  };

  const handlePublish = () => {
    if (!selectedMedia) {
      if (onShowToast) onShowToast('Please select a photo or video first');
      return;
    }

    setIsPublishing(true);

    const now = Date.now();
    const newStory: Story = {
      id: `story_${now}`,
      userId: currentUser.id,
      user: currentUser,
      mediaUrl: selectedMedia,
      timestamp: formatRelativeTime(now),
      createdAtMs: now,
      isSeen: false,
      caption: caption.trim() || undefined,
      likesCount: 0,
      isLiked: false,
      likedBy: [],
      viewsCount: 1,
    };

    setTimeout(() => {
      onPublishStory(newStory);
      setIsPublishing(false);
      setSelectedMedia(null);
      setCaption('');
      onClose();
      if (onShowToast) onShowToast('Your story was published! ✨');
    }, 300);
  };

  const handleClose = () => {
    setSelectedMedia(null);
    setCaption('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="neu-flat rounded-[30px] max-w-sm w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] bg-white relative"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-['Outfit']">Add to Your Story</h3>
              <p className="text-[10px] text-slate-400">Visible to followers for 24 hours</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {!selectedMedia ? (
            /* Choose source stage */
            <div className="space-y-3 py-2">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">Choose media from your device</p>
                <p className="text-[11px] text-slate-400">Select a picture or video to post to your active story</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handlePickFromGallery}
                className="w-full p-3.5 rounded-[22px] neu-raised flex items-center gap-3.5 hover:bg-slate-50 transition cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#5B9DFF] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Choose from Gallery</h4>
                  <p className="text-[11px] text-slate-400">Photos and videos from your device</p>
                </div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleTakePhoto}
                className="w-full p-3.5 rounded-[22px] neu-raised flex items-center gap-3.5 hover:bg-slate-50 transition cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Take Photo</h4>
                  <p className="text-[11px] text-slate-400">Snap a photo using device camera</p>
                </div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleRecordVideo}
                className="w-full p-3.5 rounded-[22px] neu-raised flex items-center gap-3.5 hover:bg-slate-50 transition cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#5B9DFF] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Record Video</h4>
                  <p className="text-[11px] text-slate-400">Record a video using device camera</p>
                </div>
              </motion.button>
            </div>
          ) : (
            /* Media Preview & Caption stage */
            <div className="space-y-3">
              {/* Media Preview Box */}
              <div className="relative aspect-[9/16] max-h-[340px] w-full rounded-[24px] overflow-hidden neu-raised bg-black">
                {isVideo ? (
                  <video
                    src={selectedMedia}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedMedia}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Change media badge */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePickFromGallery}
                    className="h-7 px-2.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black/80 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                {/* Video Indicator */}
                {isVideo && (
                  <div className="absolute top-3 left-3 h-6 px-2 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                    <Film className="w-3 h-3 text-[#5B9DFF]" />
                    <span>Video</span>
                  </div>
                )}
              </div>

              {/* Caption Input */}
              <div>
                <input
                  type="text"
                  maxLength={100}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a story caption (optional)..."
                  className="w-full h-10 px-3.5 text-xs neu-inset rounded-full text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {selectedMedia && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="flex-1 h-11 rounded-full neu-raised text-slate-600 text-xs font-bold hover:text-slate-900 transition cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublish}
              className="flex-1 h-11 rounded-full neu-active-blue text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:brightness-105 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isPublishing ? 'Sharing...' : 'Share to Story'}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
