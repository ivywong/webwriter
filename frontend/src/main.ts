import './style.css';

const cardContainerClass = "card-container";
const cardCornerClass = "card-corner";

const app = document.querySelector<HTMLDivElement>('#app') as HTMLDivElement;
const canvas = document.getElementById("canvas") as HTMLDivElement;

// const canvas = document.createElement("div");
// canvas.id = "canvas";
// app.appendChild(canvas);

let maxZIndex = 0;

const cards = {};

function createCardOnCanvas(x: number, y: number) {
  let cardTemplate = document.querySelector("#card-template") as HTMLTemplateElement;
  let cloned = cardTemplate.content.cloneNode(true);
  canvas.appendChild(cloned);

  const container = canvas.querySelector(`.${cardContainerClass}:last-of-type`);
  if (!(container && container instanceof HTMLDivElement)) {
    throw new Error("Failed to add new card!");
  }

  console.log(container);
  container.style.top = `${y}px`;
  container.style.left = `${x}px`;
}

function isLeftClick(e: PointerEvent) {
  return e.pointerType !== 'mouse' || e.button === 0;
}

canvas?.addEventListener("pointerdown", (event: PointerEvent) => {
  console.log(event);
  const el = event.target;

  if (!(el instanceof HTMLElement)){ 
    return;
  } else if (el.classList.contains(cardContainerClass) && isLeftClick(event)) {
    handleCardContainerPointerDown(el, event);
  } else if (el.classList.contains(cardCornerClass)) {
    handleCardCornerPointerDown(el, event);
  }

});

function addDragEventListeners(
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

async function handleCardContainerPointerDown(el: HTMLElement, pointDownEvent: PointerEvent) {
  const pointerId = pointDownEvent.pointerId;
  const offset = { x: pointDownEvent.offsetX, y: pointDownEvent.offsetY };

  console.log("card container pointer down");
  // bring element to front
  if (el.style.zIndex === "" || el.style.zIndex === "auto" || Number(el.style.zIndex) < maxZIndex) {
    el.style.zIndex = `${maxZIndex + 1}`;
    maxZIndex += 1;
  }

  // ignore move events if we are editing
  if (el.classList.contains("active")) {
    return;
  }

  const moveCallback = (moveEvent: PointerEvent) => {
    if (!el.hasPointerCapture(pointerId)) return;

    el.classList.add("grabbed");

    const newX = moveEvent.pageX - offset.x;
    const newY = moveEvent.pageY - offset.y;
    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;

    const triggerDistance = 50;
    setTargetCircle(moveEvent.clientX, newY - triggerDistance);

    // check if there is a card element above the current grabbed card and do something
    let above = document.elementFromPoint(moveEvent.clientX, newY - triggerDistance);
    console.log(`100above = x: ${moveEvent.clientX}, y: ${newY - triggerDistance}`);
    console.log("elem from point", above);
    if ((above instanceof HTMLElement) && (above?.classList.contains(cardContainerClass))) {
      console.log("found card!");
      el.classList.add("stacking");
      el.style.outlineOffset = `${(above.getBoundingClientRect().width - el.getBoundingClientRect().width) / 2}px`;
    } else {
      el.classList.remove("stacking");
      el.style.outlineOffset = "";
    }
  };

  const cleanupDrag = () => { el.classList.remove("grabbed") };

  addDragEventListeners(el, pointerId, moveCallback, cleanupDrag);

  console.log("end");
}

function setTargetCircle(newX: number, newY: number) {
  let circle = document.querySelector(".target") as HTMLElement;
  console.log(circle);

  if (!circle) {
    let circle = document.createElement("div");
    circle.classList.add("target");
    circle.style.height = "2px";
    circle.style.width = "2px";
    circle.style.border = "1px solid red";
    circle.style.position = "absolute";
    circle.style.zIndex = "999999999";
    circle.style.pointerEvents = "none";
    canvas.appendChild(circle);
    setTimeout(() => { console.log("added target circle")}, 0);
  }

  circle.style.left = `${newX}px`;
  circle.style.top = `${newY}px`;
}

async function handleCardCornerPointerDown(el: HTMLElement, event: PointerEvent) {
  const pointerId = event.pointerId;
  const parent = el.parentElement as HTMLDivElement;
  const bounds = parent?.getBoundingClientRect();

  if (el.dataset.action === "resize") {
    const moveCallback = (e: PointerEvent) => {
      if (!el.hasPointerCapture(pointerId)) return;
      
      parent.classList.add("grabbed");

      console.log("grabbed corner");
      console.log(bounds);
      // console.log(`X: ${e.clientX}, Y: ${e.clientY}} `);
      // console.log(`w: ${bounds.width}, h: ${bounds.height}, t: ${bounds.top}, l: ${bounds.left}`);

      // TODO: fix slight jump due to mouse offset
      const newW = e.clientX - bounds.left, 
        newH = e.clientY - bounds.top;

      // console.log(`newW: ${newW}, newH: ${newH}`);

      parent.style.maxWidth = "none";
      parent.style.maxHeight = "none";
      parent.style.width = `${newW}px`;
      parent.style.height = `${newH}px`;
    };
  
    const cleanup = () => { 
      parent.classList.remove("grabbed");
    };
  
    addDragEventListeners(el, pointerId, moveCallback, cleanup);
  } else if (el.dataset.action === "link") {
    console.log("link cards");

    // Get the SVG container
    const svgContainer = document.querySelector('.links') as HTMLElement;
    console.log(svgContainer);

    // Create a line element
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${event.clientX}`);
    line.setAttribute('y1', `${event.clientY}`);
    line.setAttribute('x2', `${event.clientX}`);
    line.setAttribute('y2', `${event.clientY}`);
    line.setAttribute('stroke', 'black');

    svgContainer.onpointermove = (e: PointerEvent) => {
      console.log("move");
      line.setAttribute('x2', `${event.clientX}`);
      line.setAttribute('y2', `${event.clientY}`);
      svgContainer.appendChild(line);
    }

    // Append the line to the SVG container
    svgContainer?.appendChild(line);

  } else if (el.dataset.action === "stack") {
    console.log("stack cards");
  }
}

canvas?.addEventListener("dblclick", (event: MouseEvent) => {
  console.log(event);
  const el = event.target;
  if (el === canvas) {
    createCardOnCanvas(event.pageX, event.pageY);
  }
  else if (el instanceof HTMLElement && el.classList.contains(cardContainerClass)) {
    console.log("double clicked card");

    // ignore events if we are already editing
    if (el.classList.contains("active")) {
      return;
    }
    
    const textbox = el.querySelector<HTMLDivElement>(".card-text") as HTMLDivElement;

    textbox.contentEditable = "true";
    textbox.focus();

    el.classList.add("active");

    el.addEventListener("focusout", () => {
      textbox.contentEditable = "false";
      el.classList.remove("active");
    }, { once: true });
  }
});