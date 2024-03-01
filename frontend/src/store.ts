import { deepEquals } from "./helper";
import { CanvasHistory } from "./history";
import { Space, Block, AppData, CardView, ContainerPosition } from "./model";

export default class WebwriterLocalStore extends EventTarget {
  localStorageKey: string;

  data: AppData;
  history: CanvasHistory;

  constructor(localStorageKey: string) {
    super();
    this.localStorageKey = localStorageKey;
    this.data = new AppData([], [], "");
    this._readStorage();

    window.addEventListener(
      "storage",
      () => {
        this._readStorage();
        this._save();
      },
      false
    );

    this.history = new CanvasHistory(structuredClone(this.data));
  }
  _resetStore() {
    this.data = new AppData([], [], "");
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
        const data = AppData.deserialize(parsed);
        this.data = data;
      }
    } catch (err) {
      console.error("Failed to read data from local storage: ", err);
    }
  }
  _save(event?: string, data?: unknown) {
    window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.data));
    this.dispatchEvent(
      new CustomEvent(event ? event : "save", data ? { detail: data } : undefined)
    );
  }

  get currentSpaceId() {
    return this.data.currentSpaceId;
  }

  set currentSpaceId(spaceId: string) {
    this.data.currentSpaceId = spaceId;
  }

  get blocks() {
    return this.data.blocks;
  }

  set blocks(blocks: Block[]) {
    this.data.blocks = blocks;
  }

  get spaces() {
    return this.data.spaces;
  }

  set spaces(spaces: Space[]) {
    this.data.spaces = spaces;
  }

  get currentSpace() {
    return this.getSpace(this.currentSpaceId);
  }

  getSpace(id: string) {
    const space = this.spaces.find((s) => s.id === id);
    if (space) {
      return space;
    }
    throw new Error(`Space '${id}' is invalid!`);
  }

  addSpace(name?: string) {
    const space = new Space(name);
    this.spaces.push(space);
    this._save("addSpace", space);
  }

  switchToSpace(id: string) {
    if (this.spaces.filter((s) => s.id === id).length === 1) {
      this.currentSpaceId = id;
      this._save("switchSpace", id);
    } else {
      throw new Error(`Error getting space with id: '${id}'`);
    }
  }

  renameSpace(id: string, name: string) {
    this.getSpace(id).name = name;
    this._save();
  }

  deleteSpace(id: string) {
    this.spaces = this.spaces.filter((b) => b.id !== id);
  }

  addBlock() {
    const block = new Block(this.currentSpaceId);
    this.blocks.push(block);
    this._save("addBlock", block);
  }

  getBlock(id: string) {
    return this.blocks.find((b) => b.id === id);
  }

  deleteBlock(id: string) {
    this.blocks = this.blocks.filter((b) => b.id !== id);
  }

  updateBlockContent(id: string, content: string) {
    const block = this.getBlock(id);
    if (block) {
      block.content = content;
      this._save("updateBlock", block);
      this.history.add(structuredClone(this.data));
    }
  }

  getCard(id: string) {
    return this.currentSpace.cards.find((c) => c.contentId === id);
  }

  addCard(position: ContainerPosition) {
    const block = new Block(this.currentSpaceId);
    this.blocks.push(block);

    const card: CardView = {
      contentId: block.id,
      position: position,
      isLocked: false,
    };
    this.currentSpace.cards.push(card);

    this._save("addCard", card);
    this.history.add(structuredClone(this.data));
  }

  updateCardPosition(cardId: string, position: Partial<ContainerPosition>) {
    const card = this.getCard(cardId);
    if (card) {
      const mergedPosition = { ...card.position, ...position };

      if (deepEquals(card.position, mergedPosition)) {
        console.log("card dimensions not changed!");
        return;
      }

      card.position = mergedPosition;
      this._save("updateCardPosition", card);
      this.history.add(structuredClone(this.data));
      console.log(`saved card ${cardId} position`, card.position);
    } else {
      console.error(`${cardId} not found!`);
    }
  }

  deleteCard(contentId: string) {
    this.deleteBlock(contentId);
    this.currentSpace.cards = this.currentSpace.cards.filter(
      (c) => c.contentId !== contentId
    );
    this._save("deleteCard", contentId);
    this.history.add(structuredClone(this.data));
  }

  undo() {
    if (this.history.prevState) {
      this.data = structuredClone(this.history.prevState);
      this.history.undo();
      this._save();
    }
  }

  redo() {
    if (this.history.nextState) {
      this.data = structuredClone(this.history.nextState);
      this.history.redo();
      this._save();
    }
  }
}
