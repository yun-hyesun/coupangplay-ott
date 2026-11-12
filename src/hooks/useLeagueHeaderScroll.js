import { useLayoutEffect, useRef } from "react";

// Update only the header's CSS variables, without re-rendering schedules on scroll.
export function useLeagueHeaderScroll(leagueId) {
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const header = document.querySelector(".header");
    if (!page || !header) return undefined;

    let frame = 0;
    let scrollRange = 1;
    let expandedHeight = 395;
    let headerHeight = 70;
    let previousProgress = -1;

    const update = () => {
      frame = 0;
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
      if (progress === previousProgress) return;
      page.style.setProperty("--league-header-progress", String(progress));
      // Both backgrounds use one canvas, with the hero offset below the navigation.
      const backgroundHeight = `${headerHeight + expandedHeight - scrollRange * progress}px`;
      page.style.setProperty("--league-header-background-height", backgroundHeight);
      header.style.setProperty("--league-header-background-height", backgroundHeight);
      previousProgress = progress;
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const measure = () => {
      window.cancelAnimationFrame(frame);
      const style = window.getComputedStyle(page);
      const expanded = parseFloat(style.getPropertyValue("--league-hero-expanded-height")) || 395;
      const compact = parseFloat(style.getPropertyValue("--league-hero-compact-height")) || 176;
      expandedHeight = expanded;
      scrollRange = Math.max(1, expanded - compact);
      headerHeight = header.getBoundingClientRect().height;
      page.style.setProperty("--global-header-height", `${headerHeight}px`);
      page.querySelectorAll(".league-detail__action-label").forEach((label) => {
        const text = label.firstElementChild;
        if (!text) return;
        const textWidth = text.getBoundingClientRect().width;
        label.style.setProperty("--league-action-label-width", `${textWidth}px`);
      });
      previousProgress = -1;
      update();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    const shell = page.querySelector(".league-detail__hero-shell");
    if (shell) observer.observe(shell);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      header.style.removeProperty("--league-header-background-height");
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", measure);
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [leagueId]);

  return pageRef;
}
