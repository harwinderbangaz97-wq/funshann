import React from 'react';
import { ThemeMode } from '../types';

interface DeviceFrameProps {
  children: React.ReactNode;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  theme = 'light',
}) => {
  const getContentBg = () => {
    if (theme === 'dark') return 'bg-[#090d16] text-[#f1f5f9]';
    if (theme === 'golden') return 'bg-[#faf6ee] text-[#451a03]';
    return 'bg-[#f4f7fb] text-[#1e293b]';
  };

  return (
    <div
      data-theme={theme}
      className={`min-h-[100dvh] w-full ${getContentBg()} flex flex-col relative overflow-x-hidden transition-colors duration-300`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="w-full flex-1 flex flex-col relative">
        {children}
      </div>
    </div>
  );
};
