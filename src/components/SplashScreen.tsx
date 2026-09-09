import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onFinish?: () => void;
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, isReady = true }) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (minTimeElapsed && isReady) {
      onFinish?.();
    }
  }, [minTimeElapsed, isReady, onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] bg-gradient-to-b from-[#F2F6FC] via-[#EDF3FA] to-[#E5EEF9] flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* 3D Floating Marbles & Background Accents */}
      <div className="absolute top-12 left-8 w-10 h-10 rounded-full bg-gradient-to-br from-[#60A5FA] via-[#2563EB] to-[#1D4ED8] shadow-[0_10px_20px_rgba(37,99,235,0.35)] pointer-events-none transform -rotate-12 animate-pulse" />
      <div className="absolute bottom-16 right-10 w-9 h-9 rounded-full bg-gradient-to-br from-white via-[#F1F5F9] to-[#CBD5E1] shadow-[0_8px_16px_rgba(148,163,184,0.35)] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', damping: 20 }}
        className="flex flex-col items-center justify-center text-center px-6"
      >
        {/* Center 3D Circular Medallion with Funshann Logo */}
        <div className="w-56 h-56 rounded-full bg-gradient-to-b from-[#FFFFFF] to-[#F4F7FB] shadow-[0_24px_50px_-8px_rgba(100,116,139,0.32),0_10px_20px_-4px_rgba(148,163,184,0.2),inset_0_2px_6px_rgba(255,255,255,0.95)] flex items-center justify-center border border-white/80 p-3 mb-6 overflow-hidden">
          <img
            src="/logo.png"
            alt="Funshann Official Logo"
            className="w-full h-full object-cover rounded-full shadow-inner"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23ffffff'/%3E%3Ctext x='50' y='68' font-size='55' font-weight='bold' text-anchor='middle' fill='%23000000' font-family='sans-serif'%3EF%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col items-center gap-2"
        >
          <h2 className="text-xl font-extrabold text-[#1E293B] tracking-tight font-['Outfit']">
            Funshann
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2F7CF6] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#2F7CF6] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#2F7CF6] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
