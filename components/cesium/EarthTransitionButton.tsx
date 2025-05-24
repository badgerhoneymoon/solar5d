'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Globe, Mountain } from 'lucide-react';

interface EarthTransitionButtonProps {
  visible: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const EarthTransitionButton: React.FC<EarthTransitionButtonProps> = ({
  visible,
  onClick,
  disabled = false,
  className = '',
}) => {
  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-500 z-20 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg backdrop-blur-sm border border-blue-500/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Globe className="w-5 h-5 mr-2" />
        Explore Earth Surface
        <Mountain className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}; 