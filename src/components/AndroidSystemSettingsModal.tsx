import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Camera,
  Mic,
  MapPin,
  Image as ImageIcon,
  Users,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { AppPermissionsState, AppPermissionType, AppPermissionStatus } from '../types';
import { PERMISSION_DEFINITIONS, PERMISSION_ORDER, saveStoredPermissions } from '../services/permissionService';
import { FUNSHANN_LOGO_URL } from '../utils/brand';

interface AndroidSystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionsState: AppPermissionsState;
  onUpdatePermissions: (nextState: AppPermissionsState) => void;
  onShowToast?: (msg: string) => void;
}

export const AndroidSystemSettingsModal: React.FC<AndroidSystemSettingsModalProps> = ({
  isOpen,
  onClose,
  permissionsState,
  onUpdatePermissions,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const handleTogglePermission = (key: AppPermissionType) => {
    const current = permissionsState[key];
    const nextStatus: AppPermissionStatus = current === 'granted' ? 'denied' : 'granted';

    const updated = {
      ...permissionsState,
      [key]: nextStatus,
    };

    onUpdatePermissions(updated);
    saveStoredPermissions(updated);
    if (onShowToast) {
      onShowToast(
        nextStatus === 'granted'
          ? `${PERMISSION_DEFINITIONS[key].name} permission set to Allowed`
          : `${PERMISSION_DEFINITIONS[key].name} permission set to Don't allow`
      );
    }
  };

  const allowedList = PERMISSION_ORDER.filter((k) => permissionsState[k] === 'granted');
  const notAllowedList = PERMISSION_ORDER.filter((k) => permissionsState[k] !== 'granted');

  return (
    <div
      id="android-system-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-[#F8FAFC] dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] h-[90vh] sm:h-[620px] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        {/* Android System Title Bar */}
        <div className="px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              id="back-from-android-settings"
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-500 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                App permissions
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Funshann &bull; Android App Info</p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            System Settings
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          {/* App Header Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 shadow-xs">
            <img
              src={FUNSHANN_LOGO_URL}
              alt="Funshann"
              className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23ffffff'/%3E%3Ctext x='50' y='68' font-size='55' font-weight='bold' text-anchor='middle' fill='%23000000' font-family='sans-serif'%3EF%3C/text%3E%3C/svg%3E";
              }}
            />
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white font-['Outfit']">Funshann</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Version 2.4.0 &bull; com.funshann.app</p>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <ShieldCheck className="w-4 h-4 text-[#5B9DFF] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11.5px]">
              Manage which device features Funshann can access. You can grant or revoke any permission at any time.
            </p>
          </div>

          {/* Allowed Permissions Section */}
          <div className="space-y-2">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Allowed ({allowedList.length})
            </h5>

            {allowedList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center text-xs text-slate-400">
                No permissions currently granted
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 shadow-xs">
                {allowedList.map((key) => {
                  const def = PERMISSION_DEFINITIONS[key];
                  return (
                    <div
                      key={key}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#5B9DFF] flex items-center justify-center">
                          {key === 'camera' && <Camera className="w-4 h-4" />}
                          {key === 'microphone' && <Mic className="w-4 h-4" />}
                          {key === 'location' && <MapPin className="w-4 h-4" />}
                          {key === 'photos' && <ImageIcon className="w-4 h-4" />}
                          {key === 'contacts' && <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{def.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {key === 'location' ? 'Allow while using the app' : 'Allowed'}
                          </p>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleTogglePermission(key)}
                        className="w-11 h-6 rounded-full bg-[#5B9DFF] p-0.5 flex items-center justify-end cursor-pointer shadow-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <Check className="w-3 h-3 text-[#5B9DFF] stroke-[3]" />
                        </div>
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Not Allowed Section */}
          <div className="space-y-2">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Not Allowed ({notAllowedList.length})
            </h5>

            {notAllowedList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center text-xs text-slate-400">
                All requested permissions are granted
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 shadow-xs">
                {notAllowedList.map((key) => {
                  const def = PERMISSION_DEFINITIONS[key];
                  return (
                    <div
                      key={key}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                          {key === 'camera' && <Camera className="w-4 h-4" />}
                          {key === 'microphone' && <Mic className="w-4 h-4" />}
                          {key === 'location' && <MapPin className="w-4 h-4" />}
                          {key === 'photos' && <ImageIcon className="w-4 h-4" />}
                          {key === 'contacts' && <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{def.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Don&apos;t allow</p>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleTogglePermission(key)}
                        className="w-11 h-6 rounded-full bg-slate-200 dark:bg-slate-700 p-0.5 flex items-center justify-start cursor-pointer shadow-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <X className="w-3 h-3 text-slate-400" />
                        </div>
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Changes apply instantly to Funshann
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-5 py-2 rounded-xl neu-active-blue text-white text-xs font-bold shadow-sm"
          >
            Done
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
