import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface ToggleImageSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledBorder: string;
  disabledBorder: string;
  enabledText: string;
  disabledText: string;
  image: string;
  alt: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

const ToggleImageSwitch: React.FC<ToggleImageSwitchProps> = ({
  enabled,
  onToggle,
  label,
  enabledLabel,
  disabledLabel,
  enabledBorder,
  disabledBorder,
  enabledText,
  disabledText,
  image,
  alt,
  style = {},
  width = 96,
  height = 96,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span
        style={{
          color: enabled ? enabledText : disabledText,
          fontFamily: 'monospace',
          fontSize: '1rem',
          marginBottom: '0.4rem',
          letterSpacing: '0.04em',
          textShadow: '0 1px 4px #000',
        }}
      >
        {enabled ? (enabledLabel || label) : (disabledLabel || label)}
      </span>
      <Image
        src={image}
        alt={alt}
        width={width}
        height={height}
        onClick={onToggle}
        style={{
          border: enabled ? enabledBorder : disabledBorder,
          borderRadius: '1rem',
          background: '#111',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};

export default ToggleImageSwitch; 