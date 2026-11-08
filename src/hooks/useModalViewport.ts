import { RefObject, useEffect } from "react";

/** Mobile keyboards can shrink/pan the visual viewport without resizing the page. */
export default function useModalViewport(dialog: RefObject<HTMLDialogElement>) {
  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    if (!element || !viewport) return;
    let frame = 0;
    let baseline = Math.max(window.innerHeight, viewport.height);
    let width = viewport.width;
    const sync = () => {
      frame = 0;
      if (Math.abs(viewport.width - width) > 80) {
        baseline = Math.max(window.innerHeight, viewport.height);
        width = viewport.width;
      }
      baseline = Math.max(baseline, viewport.height);
      element.style.setProperty(
        "--modal-viewport-height",
        `${viewport.height}px`,
      );
      element.style.setProperty(
        "--modal-viewport-width",
        `${viewport.width}px`,
      );
      element.style.setProperty(
        "--modal-viewport-top",
        `${viewport.offsetTop}px`,
      );
      element.style.setProperty(
        "--modal-viewport-left",
        `${viewport.offsetLeft}px`,
      );
      const input = document.activeElement;
      const editable =
        input instanceof HTMLElement &&
        element.contains(input) &&
        input.matches(
          'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]',
        );
      // Ignore browser-toolbar changes and pinch zoom when detecting keyboard space.
      const keyboard =
        editable &&
        Math.abs(viewport.scale - 1) < 0.05 &&
        baseline - viewport.height > 120;
      element.dataset.keyboardOpen = String(keyboard);
      if (!editable) return;
      const bounds = element.getBoundingClientRect();
      const field = input.getBoundingClientRect();
      const header = element
        .querySelector(".pos-modal-header")
        ?.getBoundingClientRect();
      const top = (header?.bottom ?? bounds.top) + 12;
      const bottom = bounds.bottom - 12;
      // Scroll the dialog only, avoiding Safari moving the document behind it.
      if (field.bottom > bottom) element.scrollTop += field.bottom - bottom;
      else if (field.top < top) element.scrollTop -= top - field.top;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    sync();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    element.addEventListener("focusin", schedule);
    element.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      element.removeEventListener("focusin", schedule);
      element.removeEventListener("focusout", schedule);
    };
  }, [dialog]);
}
