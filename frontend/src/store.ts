import { deepEquals } from "./helper";
import { Space, Block, CanvasData, CardView, ContainerPosition } from "./model";

export default class WebwriterLocalStore extends EventTarget {
  localStorageKey: string;
  #spaces: Space[] = [new Space()];
  spaceId: string = this.#spaces[0].id;
  #blocks: Block[] = [];

  constructor(localStorageKey: string) {
    super();
    this.localStorageKey = localStorageKey;
    this._readStorage();

    window.addEventListener(
      "storage",
      () => {
        // TODO: handle multiple tabs
        this._readStorage();
        this._save();
      },
      false
    );
  }
  _resetStore() {
    this._setSpaces([new Space()]);
    this._setBlocks([]);
    window.localStorage.removeItem(this.localStorageKey);
    this._save();
  }
  _readStorage() {
    let localJson = window.localStorage.getItem(this.localStorageKey);
    if (localJson) {
      this._parseCanvasData(localJson);
    } else {
      console.log("No data found in localstorage.");
    }
  }
  _parseCanvasData(json: string) {
    try {
      const parsed = JSON.parse(json);
      if (parsed) {
        console.log(`parsed local storage JSON: `, parsed);
        const canvasData = CanvasData.deserialize(parsed);
        this._setSpaces(canvasData.spaces);
        this._setBlocks(canvasData.blocks);
      }
    } catch (err) {
      console.error("Failed to read data from local storage: ", err);
    }
  }
  _save(event?: string, data?: unknown) {
    window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.canvasData));
    this.dispatchEvent(
      new CustomEvent(event ? event : "save", data ? { detail: data } : undefined)
    );
  }

  get canvasData() {
    return new CanvasData(this.#spaces, this.#blocks);
  }

  get currentSpace() {
    return this.#spaces[0];
  }

  _setSpaces(spaces: Space[]) {
    this.#spaces = spaces;
    if (this.#spaces.length > 0) {
      this.spaceId = this.#spaces[0].id;
    }
  }

  _setBlocks(blocks: Block[]) {
    this.#blocks = blocks;
  }

  addBlock() {
    const block = new Block(this.spaceId);
    this.#blocks.push(block);
    this._save("addBlock", block);
  }

  getBlock(id: string) {
    return this.#blocks.find((b) => b.id === id);
  }

  updateBlockContent(id: string, content: string) {
    const block = this.getBlock(id);
    if (block) {
      block.content = content;
      this._save("updateBlock", block);
    }
  }

  getCardById(id: string) {
    return this.currentSpace.cards.find((c) => c.contentId === id);
  }

  addCard(position: ContainerPosition) {
    const block = new Block(this.spaceId);
    this.#blocks.push(block);

    const card: CardView = {
      contentId: block.id,
      position: position,
      isLocked: false,
    };
    this.currentSpace.cards.push(card);

    this._save("addCard", card);
  }

  updateCardPosition(cardId: string, position: Partial<ContainerPosition>) {
    const card = this.getCardById(cardId);
    if (card) {
      const mergedPosition = { ...card.position, ...position };

      if (deepEquals(card.position, mergedPosition)) {
        console.log("card dimensions not changed!");
        return;
      }

      card.position = mergedPosition;
      this._save("updateCardPosition", card);
      console.log(`saved card ${cardId} position`, card.position);
    } else {
      console.error(`${cardId} not found!`);
    }
  }

  deleteCard(contentId: string) {
    this._setBlocks(this.#blocks.filter((b) => b.id !== contentId));
    this.currentSpace.cards = this.currentSpace.cards.filter(
      (c) => c.contentId !== contentId
    );
    this._save("deleteCard", contentId);
  }
}
