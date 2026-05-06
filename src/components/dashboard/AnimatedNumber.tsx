import React from 'react';
import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  formatFn?: (val: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1500,
  className = '',
  formatFn,
}) => {
  const animatedValue = useCountUp({
    end: value,
    duration,
    decimals,
  });

  const formatNumber = (num: number) => {
    if (formatFn) return formatFn(num);
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span className={className}>
      {prefix}{formatNumber(animatedValue)}{suffix}
    </span>
  );
};
