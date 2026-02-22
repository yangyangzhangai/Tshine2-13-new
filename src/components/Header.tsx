import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { t } = useTranslation();

  const handleAuthClick = () => {
    if (user) {
      if (window.confirm(t('header_confirm_logout'))) {
        signOut();
        navigate('/chat');
      }
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-4">
      <div className="font-bold text-lg text-blue-600">TimeShine</div>
      <div className="flex items-center space-x-2">
        <LanguageSwitcher />
        <button
          onClick={handleAuthClick}
          className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
        >
          {user ? (
            <>
              <User size={18} />
              <span className="max-w-[100px] truncate">
                {user.user_metadata?.display_name || user.email?.split('@')[0]}
              </span>
              <LogOut size={18} className="ml-2" />
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>{t('header_login')}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
