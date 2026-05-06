import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
  easing?: (t: number) => number;
}

// Easing function - ease out cubic
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const useCountUp = ({
  start = 0,
  end,
  duration = 1500,
  decimals = 0,
  easing = easeOutCubic,
}: UseCountUpOptions): number => {
  const [value, setValue] = useState(start);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      
      const currentValue = start + (end - start) * easedProgress;
      setValue(Number(currentValue.toFixed(decimals)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [start, end, duration, decimals, easing]);

  return value;
};
