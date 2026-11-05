import { useCallback, useEffect, useRef, useState } from "react";

export const useHorizontalDragScroll = () => {
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const element = scrollRef.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: element.scrollLeft,
      moved: false,
    };
  }, []);

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    const element = scrollRef.current;
    if (!drag || !element) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved && Math.abs(deltaY) > 6 && Math.abs(deltaY) > Math.abs(deltaX)) {
      dragRef.current = null;
      return;
    }
    if (!drag.moved && Math.abs(deltaX) < 5) return;

    drag.moved = true;
    element.scrollLeft = drag.startScrollLeft - deltaX;
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
    if (event.cancelable) event.preventDefault();
  }, []);

  const finishPointerDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (drag.moved) {
      suppressClickRef.current = true;
      window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, []);

  const handleWheel = useCallback((event) => {
    const element = scrollRef.current;
    if (!element || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const canScrollLeft = event.deltaY < 0 && element.scrollLeft > 0;
    const canScrollRight = event.deltaY > 0 && element.scrollLeft < maxScrollLeft;
    if (!canScrollLeft && !canScrollRight) return;

    event.preventDefault();
    element.scrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, element.scrollLeft + event.deltaY),
    );
  }, []);

  const onClickCapture = useCallback((event) => {
    if (!suppressClickRef.current) return;

    suppressClickRef.current = false;
    window.clearTimeout(suppressClickTimerRef.current);
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onDragStart = useCallback((event) => {
    event.preventDefault();
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishPointerDrag);
    window.addEventListener("pointercancel", finishPointerDrag);
    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishPointerDrag);
      window.removeEventListener("pointercancel", finishPointerDrag);
      element.removeEventListener("wheel", handleWheel);
      window.clearTimeout(suppressClickTimerRef.current);
    };
  }, [finishPointerDrag, handlePointerMove, handleWheel]);

  return {
    scrollRef,
    isDragging,
    onPointerDown,
    onClickCapture,
    onDragStart,
  };
};