import React from 'react';

interface BadgeProps {
  count: number;
}

const Badge: React.FC<BadgeProps> = ({ count }) => {
  if (!count || count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);
  const isWide = count >= 10;

  return (
    <span
      className={`absolute -top-1.5 -end-1.5 z-10 flex items-center justify-center
        ${isWide ? 'min-w-[18px] px-1 rounded-full' : 'w-[16px] h-[16px] rounded-full'}
        h-[16px] bg-[#FF3B30] text-white text-[11px] font-bold leading-none
        animate-in zoom-in-50 duration-200`}
    >
      {label}
    </span>
  );
};

export default Badge;
