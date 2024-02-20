import WebwriterLocalStore from "./store";
import { CardView, ContainerPosition } from "./model";
import autosize from "autosize";
import { addDragEventListeners } from "./helper";

const cardContainerClass = "card-container";
const cardCornerClass = "card-corner";

type CardCornerAction = "resize" | "link" | "stack";

export class CanvasComponent {
  $root: HTMLDivElement;
  store: WebwriterLocalStore;
  maxZIndex: number;

  constructor($root: HTMLDivElement, store: WebwriterLocalStore) {
    this.$root = $root;
    this.store = store;
    this.maxZIndex =
      Math.max(...this.store.currentSpace.cards.map((c) => c.position.z)) + 1;
    console.log(this.maxZIndex);

    this._bindEvents();
    this.renderAll();
  }

  _isCardContainer(value: unknown): value is HTMLDivElement {
    return (
      value instanceof HTMLDivElement && value.classList.contains(cardContainerClass)
    );
  }

  _isCardCorner(action: CardCornerAction, value: unknown): value is HTMLDivElement {
    return value instanceof HTMLDivElement && value.dataset.action === action;
  }

  _bindEvents() {
    this.$root.addEventListener("pointerdown", this._pointerDownHandler.bind(this));
    this.$root.addEventListener("dblclick", this._doubleClickHandler.bind(this));

    this.store.addEventListener("addCard", (evt: CustomEventInit) => {
      this.renderCard(evt.detail);
    });
  }

  renderCard(card: CardView) {
    let cardTemplate = document.querySelector("#card-template") as HTMLTemplateElement;

    let cloned = cardTemplate.content.cloneNode(true);
    this.$root.appendChild(cloned);

    const container = this.$root.querySelector(`.${cardContainerClass}:last-of-type`);

    if (!this._isCardContainer(container)) {
      throw new Error("Failed to add new card!");
    }

    console.log(container);
    const textbox = container.querySelector(`.card-text`) as HTMLTextAreaElement;
    if (textbox) {
      autosize(textbox);
      let content = this.store.getBlock(card.contentId)?.content as string;
      textbox.value = content;
    }

    container.style.top = `${card.position.y}px`;
    container.style.left = `${card.position.x}px`;
    container.style.zIndex = `${card.position.z}`;
    container.dataset.contentId = `${card.contentId}`;

    if (card.position.w !== -1) {
      container.style.maxWidth = "none";
      container.style.width = `${card.position.w}px`;
    }

    autosize.update(textbox);

    console.log(container);

    return container;
  }

  renderAll() {
    this.$root.innerHTML = "";
    this.store.currentSpace.cards.forEach((card) => this.renderCard(card));
  }

  private _pointerDownHandler(evt: PointerEvent) {
    console.log(evt);
    const target = evt.target;
    if (this._isCardContainer(target)) {
      this._handleCardContainerPointerDown(target, evt);
    }
    if (this._isCardCorner("resize", target)) {
      this._resizeHandler(target, evt);
    }
    if (target === this.$root) {
      for (let el of this.$root.querySelectorAll(".selected")) {
        el.classList.remove("selected");
      }
    }
  }

  private _handleCardContainerPointerDown(
    card: HTMLDivElement,
    pointDownEvent: PointerEvent
  ) {
    const pointerId = pointDownEvent.pointerId;
    const offset = { x: pointDownEvent.offsetX, y: pointDownEvent.offsetY };
    const newPosition: Partial<ContainerPosition> = {};

    console.log("card container pointer down");
    // bring element to front
    if (
      card.style.zIndex === "" ||
      card.style.zIndex === "auto" ||
      Number(card.style.zIndex) < this.maxZIndex
    ) {
      const newZ = this.maxZIndex + 1;
      card.style.zIndex = `${newZ}`;
      this.maxZIndex += 1;

      newPosition.z = newZ;
    }

    // ignore move events if we are editing
    if (card.classList.contains("editing")) {
      return;
    }

    // TODO: toggle bulk selection, e.g. ctrl/cmd click
    for (let el of this.$root.querySelectorAll(".selected")) {
      el.classList.remove("selected");
    }

    card.classList.add("selected");

    const moveCallback = (moveEvent: PointerEvent) => {
      if (!card.hasPointerCapture(pointerId)) return;

      card.classList.add("grabbed");

      const newX = moveEvent.pageX - offset.x;
      const newY = moveEvent.pageY - offset.y;
      card.style.left = `${newX}px`;
      card.style.top = `${newY}px`;

      (newPosition.x = newX), (newPosition.y = newY);
    };

    const cleanupDrag = () => {
      card.classList.remove("grabbed");
      this.store.updateCardPosition(card.dataset.contentId as string, newPosition);
    };

    addDragEventListeners(card, pointerId, moveCallback, cleanupDrag);
  }

  private _resizeHandler(target: HTMLDivElement, evt: PointerEvent): void {
    const pointerId = evt.pointerId;
    const card = target.parentElement as HTMLDivElement;
    const textbox = card.querySelector(".card-text") as HTMLTextAreaElement;
    const bounds = card?.getBoundingClientRect();

    let textWidth = bounds.width;

    const moveCallback = (e: PointerEvent) => {
      if (!target.hasPointerCapture(pointerId)) return;

      card.classList.add("grabbed", "resizing");

      console.log("grabbed corner");

      // TODO: fix slight jump due to mouse offset
      textWidth = e.clientX - bounds.left;

      console.log(`newW: ${textWidth}`);

      card.style.maxWidth = "none";
      card.style.width = `${textWidth}px`;

      autosize.update(textbox);
    };

    const cleanup = () => {
      console.log("cleaning up");
      console.log(`width: ${textWidth}`);
      card.classList.remove("grabbed", "resizing");
      this.store.updateCardPosition(card.dataset.contentId as string, {
        w: textWidth,
      });
    };

    addDragEventListeners(target, pointerId, moveCallback, cleanup);
  }

  private _doubleClickHandler(evt: MouseEvent): void {
    console.log(evt);
    const target = evt.target;
    if (target === this.$root) {
      console.log("adding card");

      this.store.addCard({
        x: evt.pageX,
        y: evt.pageY,
        z: 0,
        w: -1,
      });
    } else if (this._isCardContainer(target)) {
      console.log("double clicked card");

      // ignore events if we are already editing
      if (target.classList.contains("editing")) {
        return;
      }

      const textbox = target.querySelector(".card-text") as HTMLTextAreaElement;

      textbox.disabled = false;
      textbox.focus();

      target.classList.add("editing");

      textbox.addEventListener("blur", () => {
        console.log(textbox.value);
        this.store.updateBlockContent(
          target.dataset.contentId as string,
          textbox.value as string
        );
      });

      target.addEventListener(
        "focusout",
        () => {
          textbox.disabled = true;
          target.classList.remove("editing");
        },
        { once: true }
      );
    }
  }
}
