import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const handleAuthClick = () => {
    if (user) {
      if (window.confirm('确定要退出登录吗？')) {
        signOut();
        navigate('/chat');
      }
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 flex items-center justify-between px-4">
      <div className="font-bold text-lg text-blue-600">Time Shine</div>
      <button
        onClick={handleAuthClick}
        className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
      >
        {user ? (
          <>
            <User size={18} />
            <span className="max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
            <LogOut size={18} className="ml-2" />
          </>
        ) : (
          <>
            <LogIn size={18} />
            <span>登录/注册</span>
          </>
        )}
      </button>
    </header>
  );
};
