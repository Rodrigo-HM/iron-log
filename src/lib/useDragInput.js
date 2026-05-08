import { useRef, useCallback } from 'react';

const DRAG_THRESHOLD = 5;
const DRAG_STEP_PX = 20;

export function useDragInput({ value, fallback = 0, onChange, step = 1, min = 0 }) {
  const touchStartY = useRef(null);
  const touchStartValue = useRef(null);
  const isDragging = useRef(false);
  const accPx = useRef(0);

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    const parsed = parseFloat(value);
    touchStartValue.current = isNaN(parsed) ? (parseFloat(fallback) || 0) : parsed;
    isDragging.current = false;
    accPx.current = 0;
  }, [value, fallback]);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    if (!isDragging.current && Math.abs(dy) >= DRAG_THRESHOLD) {
      isDragging.current = true;
    }
    if (!isDragging.current) return;
    e.preventDefault();
    accPx.current = dy;
    const steps = Math.floor(Math.abs(accPx.current) / DRAG_STEP_PX) * Math.sign(accPx.current);
    const newVal = Math.max(min, Math.round((touchStartValue.current + steps * step) / step) * step);
    onChange(String(Math.round(newVal * 100) / 100));
  }, [onChange, step, min]);

  const onTouchEnd = useCallback((e) => {
    if (isDragging.current) {
      e.preventDefault();
    }
    touchStartY.current = null;
    isDragging.current = false;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
