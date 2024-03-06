import WebwriterLocalStore from "./store";
import { Block, CardView, ContainerPosition } from "./model";
import { addDragEventListeners } from "./helper";

import autosize from "autosize";
import markdownit from "markdown-it";
import hotkeys from "hotkeys-js";

const MarkdownIt = markdownit();

const cardContainerClass = "card-container";

type CardCornerAction = "resize" | "link" | "stack" | "delete";
type CardMenuAction = "add" | "color" | "lock" | "delete";

export class CanvasComponent {
  $root: HTMLDivElement;
  store: WebwriterLocalStore;
  selectedCardIds: string[];
  maxZIndex: number;

  constructor($root: HTMLDivElement, store: WebwriterLocalStore) {
    this.$root = $root;
    this.store = store;
    this.selectedCardIds = [];

    this.maxZIndex =
      Math.max(...this.store.currentSpace.cards.map((c) => c.position.z)) + 1;
    console.log(this.maxZIndex);

    this._setupHotkeys();
    this._bindEvents();
    this.renderAll();
  }

  get lastSelectedCardId() {
    if (this.selectedCardIds.length > 0) {
      return this.selectedCardIds[this.selectedCardIds.length - 1];
    }
    return null;
  }

  _isCardContainer(value: unknown): value is HTMLDivElement {
    return (
      value instanceof HTMLDivElement && value.classList.contains(cardContainerClass)
    );
  }

  _isCardCorner(action: CardCornerAction, value: unknown): value is HTMLDivElement {
    return value instanceof HTMLDivElement && value.dataset.action === action;
  }

  _isCardMenuAction(action: CardMenuAction, value: unknown): value is HTMLButtonElement {
    return (
      value instanceof HTMLButtonElement &&
      value.classList.contains("card-action-button") &&
      value.dataset.action === action
    );
  }

  _setupHotkeys() {
    hotkeys("ctrl+z, command+z", { scope: "canvas" }, () => {
      console.log("undo canvas state");
      this.store.undo();
    });

    hotkeys(
      "ctrl+shift+z, command+shift+z, ctrl+y, command+y",
      { scope: "canvas" },
      () => {
        console.log("redo canvas state");
        this.store.redo();
      }
    );

    hotkeys("ctrl+c, command+c", { scope: "canvas" }, () => {
      if (this.selectedCardIds.length === 1) {
        const content = this.store.getBlock(this.selectedCardIds[0])?.content as string;
        navigator.clipboard.writeText(content).then(() => {
          console.log("copied to clipboard");
        });
      }
    });

    // this is borked in firefox, works in chrome
    hotkeys("ctrl+v, command+v", { scope: "canvas" }, () => {
      navigator.clipboard.readText().then((copied: string) => {
        console.log(`Pasted: ${copied}`);
        this.store.addCard({ x: 100, y: 100, z: this.maxZIndex, w: -1 }, copied);
      });
    });

    hotkeys("delete, backspace", { scope: "canvas" }, () => {
      const cardToDelete = this.lastSelectedCardId;
      if (cardToDelete) {
        // delete last selected card for now
        console.log(`deleting: ${cardToDelete}`);
        this._deselect(cardToDelete);
        this.store.deleteCard(cardToDelete);
      }
    });

    hotkeys("enter", { scope: "canvas" }, (evt) => {
      evt.preventDefault();
      console.log("edit selected card here");

      if (this.lastSelectedCardId) {
        console.log(`editing: ${this.lastSelectedCardId}`);
        this._editCard(this.lastSelectedCardId);
      }
    });

    hotkeys("esc", { scope: "canvas" }, () => {
      this._deselectAll();
    });

    hotkeys("*", (event, handler) => {
      // TODO: figure out if there's a way of using this to remap keys
      console.log(event.key, handler.key);
    });

    hotkeys.setScope("canvas");
  }

  _bindEvents() {
    this.$root.addEventListener("pointerdown", this._pointerDownHandler.bind(this));
    this.$root.addEventListener("dblclick", this._doubleClickHandler.bind(this));
    this.$root.addEventListener("keydown", (evt) => {
      if (evt.target instanceof HTMLTextAreaElement && evt.key === "Escape") {
        console.log("blurring textarea");
        evt.target.blur();
      }
    });

    this.$root.addEventListener("focusin", (evt) => {
      console.log(evt);
      if (this._isCardContainer(evt.target)) {
        this._selectCard(evt.target);
      }
    });

    this.store.addEventListener("addCard", (evt: CustomEventInit) => {
      this.renderAddCard(evt.detail);
    });

    this.store.addEventListener("deleteCard", (evt: CustomEventInit) => {
      this.renderRemoveCard(evt.detail);
    });

    this.store.addEventListener("updateBlock", (evt: CustomEventInit) => {
      this.renderUpdatedText(evt.detail);
    });
    this.store.addEventListener("save", () => {
      this.renderAll();
    });
  }

  renderAddCard(card: CardView) {
    let cardTemplate = document.querySelector("#card-template") as HTMLTemplateElement;

    let cloned = cardTemplate.content.cloneNode(true);
    this.$root.appendChild(cloned);

    const container = this.$root.querySelector(`.${cardContainerClass}:last-of-type`);
    const content = this.store.getBlock(card.contentId)?.content as string;

    if (!this._isCardContainer(container)) {
      throw new Error("Failed to add new card!");
    }

    const textbox = container.querySelector(`.card-text`) as HTMLTextAreaElement;
    autosize(textbox);
    textbox.value = content;
    textbox.style.display = "none";

    const preview = container.querySelector(".card-text-rendered") as HTMLDivElement;
    preview.innerHTML = MarkdownIt.render(content);

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

  renderRemoveCard(id: string) {
    const target = this.$root.querySelector(`[data-content-id='${id}']`);
    if (target) {
      this.$root.removeChild(target);
      console.log(`Removed card: ${id}`);
    } else {
      console.error(`Could not find and remove card: ${id}`);
    }
  }

  renderUpdatedText(block: Block) {
    const rendered = this.$root.querySelector(
      `[data-content-id='${block.id}'] .card-text-rendered`
    ) as HTMLDivElement;
    rendered.innerHTML = MarkdownIt.render(block.content);
    console.log(`rendered block: ${block.id}`);
  }

  renderAll() {
    this.$root.innerHTML = "";
    this.store.currentSpace.cards.forEach((card) => this.renderAddCard(card));
  }

  _selectCard(card: HTMLElement) {
    this._deselectAll();
    card.classList.add("selected");
    this.selectedCardIds.push(card.dataset.contentId as string);
  }

  _deselect(id: string) {
    const idx = this.selectedCardIds.indexOf(id);
    if (idx > -1) {
      console.log(`deselecting card: ${id}`);
      this.selectedCardIds.splice(idx, 1);
    } else {
      console.debug(`deselecting failed: ${id} not found`);
      console.debug(`selected: ${this.selectedCardIds}`);
    }
  }

  _deselectAll() {
    for (let el of this.$root.querySelectorAll(".selected")) {
      console.log("deselecting all");
      el.classList.remove("selected");
      this.selectedCardIds = [];
    }
  }

  private _pointerDownHandler(evt: PointerEvent) {
    console.log(evt);
    const target = evt.target;
    if (this._isCardContainer(target)) {
      this._handleCardContainerPointerDown(target, evt);
    } else if (this._isCardCorner("resize", target)) {
      this._resizeHandler(target, evt);
    } else if (
      this._isCardCorner("delete", target) ||
      this._isCardMenuAction("delete", target)
    ) {
      const card = target.closest(".card-container") as HTMLDivElement;
      if (card.dataset.contentId) {
        this.store.deleteCard(card.dataset.contentId);
      }
    } else if (target === this.$root) {
      this._deselectAll();
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
    this._deselectAll();

    this._selectCard(card);

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

      // TODO: fix slight jump due to mouse offset
      textWidth = e.clientX - bounds.left;

      card.style.maxWidth = "none";
      card.style.width = `${textWidth}px`;

      autosize.update(textbox);
    };

    const cleanup = () => {
      card.classList.remove("grabbed", "resizing");
      this.store.updateCardPosition(card.dataset.contentId as string, {
        w: textWidth,
      });
    };

    addDragEventListeners(target, pointerId, moveCallback, cleanup);
  }

  private _editCard(cardId: string) {
    const target = this.$root.querySelector(`[data-content-id='${cardId}'`);
    if (!target || target.classList.contains("editing")) {
      return;
    }

    const textbox = target.querySelector(".card-text") as HTMLTextAreaElement;
    const preview = target.querySelector(".card-text-rendered") as HTMLDivElement;

    preview.style.display = "none";
    textbox.style.display = "block";

    autosize.update(textbox);

    textbox.disabled = false;
    textbox.focus();

    target.classList.add("editing");

    textbox.addEventListener(
      "blur",
      () => {
        console.log(`saving content: ${cardId}`);
        this.store.updateBlockContent(cardId, textbox.value as string);

        textbox.disabled = true;
        target.classList.remove("editing");

        preview.style.display = "block";
        textbox.style.display = "none";
      },
      { once: true }
    );
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
      this._editCard(target.dataset.contentId as string);
    }
  }
}
