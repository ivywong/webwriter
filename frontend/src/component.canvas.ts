import WebwriterLocalStore from "./store";
import { Block, CardView, ContainerPosition } from "./model";
import { addDragEventListeners } from "./helper";
import { pz } from "./app";

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

    this.store.addEventListener("updateSpaceSize", () => {
      this.renderAll();
    });

    this.store.addEventListener("save", () => {
      this.renderAll();
    });
  }

  _convertPanZoomCoords(x: number, y: number) {
    const transform = pz.getTransform();
    return {
      x: Math.floor((x - transform.x) / transform.scale),
      y: Math.floor((y - transform.y) / transform.scale),
    };
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

    const colorStrip = container.querySelector(".card-color") as HTMLDivElement;
    const preview = container.querySelector(".card-text-rendered") as HTMLDivElement;
    preview.innerHTML = MarkdownIt.render(content);

    container.style.top = `${card.position.y}px`;
    container.style.left = `${card.position.x}px`;
    container.style.zIndex = `${card.position.z}`;
    container.dataset.contentId = `${card.contentId}`;
    colorStrip.style.backgroundColor = `${card.color}`;

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

    if (this.store.currentSpace.settings) {
      this.$root.style.height = `${this.store.currentSpace.settings.height}px`;
      this.$root.style.width = `${this.store.currentSpace.settings.width}px`;
    }

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
    pz.pause();
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
    } else if (this._isCardMenuAction("color", target)) {
      const input = document.getElementById("card-colorpicker") as HTMLInputElement;
      const cardEl = target.closest(".card-container") as HTMLDivElement;
      const card = this.store.getCard(cardEl.dataset.contentId as string);

      if (card) {
        console.log(input.value, card.color);
        input.value = card.color ?? "#ffffff";
        input.oninput = () => {
          this.store.updateCardColor(card?.contentId, input.value);
        };
        input.click();
      }
    } else if (target === this.$root) {
      this._deselectAll();
      pz.resume();
    }
  }

  private _handleCardContainerPointerDown(
    card: HTMLDivElement,
    pointDownEvent: PointerEvent
  ) {
    const pointerId = pointDownEvent.pointerId;
    const offset = { x: pointDownEvent.offsetX, y: pointDownEvent.offsetY };
    const newPosition = structuredClone(
      this.store.getCard(card.dataset.contentId as string)?.position
    ) as ContainerPosition;

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

      const pointerCoords = this._convertPanZoomCoords(moveEvent.pageX, moveEvent.pageY);
      const newCoords = {
        x: pointerCoords.x - offset.x,
        y: pointerCoords.y - offset.y,
      };

      if (!this.inCanvasBounds(newCoords)) {
        return;
      }

      card.style.left = `${newCoords.x}px`;
      card.style.top = `${newCoords.y}px`;

      (newPosition.x = newCoords.x), (newPosition.y = newCoords.y);
    };

    const cleanupDrag = () => {
      card.classList.remove("grabbed");
      this.store.updateCardPosition(card.dataset.contentId as string, newPosition);
      this.expandCanvasIfRequired({ x: newPosition.x, y: newPosition.y });
      pz.resume();
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
      const transform = pz.getTransform();
      textWidth = Math.floor(e.clientX / transform.scale - bounds.left);
      console.log(textWidth);

      card.style.maxWidth = "none";
      card.style.width = `${textWidth}px`;

      autosize.update(textbox);
    };

    const cleanup = () => {
      card.classList.remove("grabbed", "resizing");
      this.store.updateCardPosition(card.dataset.contentId as string, {
        w: textWidth,
      });
      pz.resume();
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

      const position = this._convertPanZoomCoords(evt.pageX, evt.pageY);
      if (!this.inCanvasBounds(position)) {
        return;
      }

      this.store.addCard({
        ...position,
        z: 0,
        w: -1,
      });

      this.expandCanvasIfRequired(position);
    } else if (this._isCardContainer(target)) {
      this._editCard(target.dataset.contentId as string);
    }
  }

  private expandCanvasIfRequired(position: { x: number; y: number }) {
    const shouldExpand = this.inCanvasExpansionBounds(position);

    if (shouldExpand.x || shouldExpand.y) {
      const expansionAmount = 600;
      const updatedSettings = {
        width: this.store.currentSpace.settings.width,
        height: this.store.currentSpace.settings.height,
      };

      if (shouldExpand.x) {
        updatedSettings.width += expansionAmount;
      }
      if (shouldExpand.y) {
        updatedSettings.height += expansionAmount;
      }
      this.store.updateCurrentSpaceSettings(updatedSettings, "updateSpaceSize");
    }
  }

  private inCanvasBounds(position: { x: number; y: number }) {
    return (
      position.x > 0 &&
      position.x <= this.store.currentSpace.settings.width &&
      position.y > 0 &&
      position.y <= this.store.currentSpace.settings.height
    );
  }

  private inCanvasExpansionBounds(position: { x: number; y: number }): {
    x: boolean;
    y: boolean;
  } {
    const xBuffer = 300;
    const yBuffer = 300;

    if (!this.inCanvasBounds(position)) {
      return { x: false, y: false };
    }

    const res = {
      x: position.x >= this.store.currentSpace.settings.width - xBuffer,
      y: position.y >= this.store.currentSpace.settings.height - yBuffer,
    };
    return res;
  }
}
