import './style.css'

const cardContainerClass = "card-container";

const app = document.querySelector<HTMLDivElement>('#app');

const canvas = document.createElement("div");
canvas.id = "canvas";
app?.appendChild(canvas);

let maxZIndex = 0;

function createCardOnCanvas(x: number, y: number) {
  const container = document.createElement("div");
  container.setAttribute("class", cardContainerClass);
  container.style.top = `${y}px`;
  container.style.left = `${x}px`;
  canvas?.appendChild(container);
}

canvas?.addEventListener("pointerdown", (event: PointerEvent) => {
  console.log(event);
  const el = event.target;
  const pointerId = event.pointerId;
  const offset = { x: event.offsetX, y: event.offsetY };

  if (el instanceof HTMLElement && el.classList.contains(cardContainerClass)) {
    // bring element to front
    if (el.style.zIndex === "" || el.style.zIndex === "auto" || Number(el.style.zIndex) < maxZIndex) {
      el.style.zIndex = `${maxZIndex + 1}`;
      maxZIndex += 1;
    }

    // ignore move events if we are editing
    if (el.classList.contains("active")) {
      return;
    }

    el.setPointerCapture(pointerId);

    // todo: set the pointer listeners directly
    // https://javascript.info/pointer-events
    const dragCard = (e: PointerEvent) => {
      if (!el.hasPointerCapture(pointerId)) return;

      el.classList.add("grabbed");
      el.style.left = `${e.pageX - offset.x}px`;
      el.style.top = `${e.pageY - offset.y}px`; 
    };

    const cleanupDrag = () => {
      el.classList.remove("grabbed");
      el.releasePointerCapture(pointerId);
      el.removeEventListener("pointermove", dragCard);
    }

    el.addEventListener("pointermove", dragCard);

    for (const eventType of ["pointerup", "focusout"]) {
      el.addEventListener(eventType, () => {
        cleanupDrag();
      }, { once: true });
    }
  }
});

canvas?.addEventListener("dblclick", (event: MouseEvent) => {
  console.log(event);
  const el = event.target;
  if (el === canvas) {
    createCardOnCanvas(event.pageX, event.pageY);
  }
  else if (el instanceof HTMLElement && el.classList.contains(cardContainerClass)) {
    console.log("double clicked card");
    el.contentEditable = "true";
    el.classList.add("active");
    el.focus();

    el.addEventListener("focusout", () => {
      el.contentEditable = "false";
      el.classList.remove("active");
    }, { once: true });
  }
});