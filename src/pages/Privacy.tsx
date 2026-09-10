import React from 'react';
import { WhoCanContactSubPage } from '../components/settings/WhoCanContactSubPage';
import { PrivacyControlsSubPage } from '../components/settings/PrivacyControlsSubPage';
import { User, SettingsSection } from '../types';

export interface PrivacyPageProps {
  currentUser?: User;
  onNavigateSection?: (section: SettingsSection) => void;
  onShowToast?: (msg: string) => void;
}

export const Privacy: React.FC<PrivacyPageProps> = ({
  currentUser,
  onNavigateSection,
  onShowToast = () => {},
}) => {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="neu-flat rounded-[28px] p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Messaging & Privacy</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage who can contact you and configure your message privacy settings.</p>
        </div>

        <WhoCanContactSubPage onShowToast={onShowToast} />
        
        <div className="border-t border-slate-200/70 pt-6">
          <PrivacyControlsSubPage
            currentUser={currentUser}
            onNavigateSection={onNavigateSection}
            onShowToast={onShowToast}
          />
        </div>
      </div>
    </div>
  );
};

export default Privacy;
