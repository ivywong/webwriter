export function addDragEventListeners(
  el: HTMLElement,
  pointerId: number,
  moveCallback: (this: GlobalEventHandlers, ev: PointerEvent) => any,
  cleanupCallback: Function
) {
  el.setPointerCapture(pointerId);

  el.onpointermove = moveCallback;

  for (const eventType of ["pointerup", "pointercancel", "focusout"]) {
    el.addEventListener(
      eventType,
      () => {
        cleanupCallback();
        el.releasePointerCapture(pointerId);
        el.onpointermove = null;
      },
      { once: true }
    );
  }
}

export function deepEquals(a: any, b: any) {
  // depth of 1 comparison for now
  if (Object.keys(a).length !== Object.keys(b).length) {
    return false;
  }

  for (let [key, value] of Object.entries(a)) {
    if (b[key] !== value) {
      return false;
    }
  }
  return true;
}
