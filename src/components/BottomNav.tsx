import React from 'react';
import { NavLink } from 'react-router-dom';
import { Clock, CheckSquare, PieChart } from 'lucide-react';
import { cn } from '../lib/utils';

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around items-center h-16">
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            )
          }
        >
          <Clock size={24} />
          <span className="text-xs font-medium">记录</span>
        </NavLink>
        
        <NavLink
          to="/todo"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            )
          }
        >
          <CheckSquare size={24} />
          <span className="text-xs font-medium">待办管理</span>
        </NavLink>
        
        <NavLink
          to="/report"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            )
          }
        >
          <PieChart size={24} />
          <span className="text-xs font-medium">时间报告</span>
        </NavLink>
      </div>
    </nav>
  );
};
