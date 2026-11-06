/** Use a separate document so app pagination, collapsed panels and controls cannot leak into reports. */
export default async function printDocument(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:900px;height:700px;border:0;";
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  await new Promise<void>((resolve, reject) => {
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) {
        frame.remove();
        reject(new Error("Print document unavailable"));
        return;
      }
      const cleanup = () => {
        frame.remove();
        previousFocus?.focus();
      };
      win.addEventListener("afterprint", cleanup, { once: true });
      void (async () => {
        try {
          await win.document.fonts.ready;
          win.focus();
          win.print();
          resolve();
          // Some browsers omit afterprint; retain the frame long enough for an open print dialog.
          window.setTimeout(() => {
            if (frame.isConnected) cleanup();
          }, 300000);
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
