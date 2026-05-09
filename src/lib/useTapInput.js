import { useRef, useCallback, useState } from 'react';

const DRAG_THRESHOLD = 5;
const DRAG_STEP_PX = 20;
const DOUBLE_TAP_MS = 300;

export function useTapInput({ value, fallback, onChange, step = 1, min = 0 }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const touchStartY = useRef(null);
  const touchStartValue = useRef(null);
  const isDragging = useRef(false);
  const lastTapTime = useRef(0);
  const accPx = useRef(0);
  const lastSteps = useRef(0);

  const effectiveValue = value !== '' ? parseFloat(value) : null;
  const fallbackNum = fallback !== undefined && fallback !== '' ? parseFloat(fallback) : null;
  const hasValue = value !== '';
  const hasFallback = fallbackNum !== null && !isNaN(fallbackNum);

  const confirmFallback = useCallback(() => {
    if (!hasValue && hasFallback) {
      onChange(String(fallbackNum));
    }
  }, [hasValue, hasFallback, fallbackNum, onChange]);

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    const base = hasValue ? effectiveValue : (hasFallback ? fallbackNum : 0);
    touchStartValue.current = isNaN(base) ? 0 : base;
    isDragging.current = false;
    accPx.current = 0;
    lastSteps.current = 0;
  }, [hasValue, effectiveValue, hasFallback, fallbackNum]);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    if (!isDragging.current && Math.abs(dy) >= DRAG_THRESHOLD) {
      isDragging.current = true;
      if (!hasValue && hasFallback) {
        onChange(String(fallbackNum));
        touchStartValue.current = fallbackNum;
      }
    }
    if (!isDragging.current) return;
    e.preventDefault();
    accPx.current = dy;
    const steps = Math.floor(Math.abs(accPx.current) / DRAG_STEP_PX) * Math.sign(accPx.current);
    if (steps !== lastSteps.current) {
      lastSteps.current = steps;
      try { navigator.vibrate?.(10); } catch {}
    }
    const newVal = Math.max(min, Math.round((touchStartValue.current + steps * step) / step) * step);
    onChange(String(Math.round(newVal * 100) / 100));
  }, [hasValue, hasFallback, fallbackNum, onChange, step, min]);

  const onTouchEnd = useCallback((e) => {
    if (isDragging.current) {
      e.preventDefault();
      touchStartY.current = null;
      isDragging.current = false;
      return;
    }
    touchStartY.current = null;
    isDragging.current = false;

    const now = Date.now();
    const sinceLastTap = now - lastTapTime.current;
    lastTapTime.current = now;

    if (sinceLastTap < DOUBLE_TAP_MS) {
      setKeyboardOpen(true);
    } else {
      confirmFallback();
    }
  }, [confirmFallback]);

  const closeKeyboard = useCallback(() => {
    setKeyboardOpen(false);
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, keyboardOpen, closeKeyboard };
}
