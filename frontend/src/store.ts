import { deepEquals } from "./helper";
import { SpaceHistory, State } from "./history";
import {
  Space,
  Block,
  AppData,
  CardView,
  ContainerPosition,
  SpaceSettings,
} from "./model";

export default class WebwriterLocalStore extends EventTarget {
  localStorageKey: string;

  data: AppData;
  history: Map<string, SpaceHistory> = new Map();

  constructor(localStorageKey: string) {
    super();
    this.localStorageKey = localStorageKey;
    this.data = new AppData([], "");
    this._readStorage();

    window.addEventListener(
      "storage",
      () => {
        this._readStorage();
        this._save();
      },
      false,
    );

    this.history.set(
      this.currentSpaceId,
      new SpaceHistory(this.currentSpaceId, this.copyCurrentState()),
    );
  }
  _resetStore() {
    this.data = new AppData([], "");
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
    window.localStorage.setItem(
      this.localStorageKey,
      JSON.stringify(this.data),
    );
    this.dispatchEvent(
      new CustomEvent(
        event ? event : "save",
        data ? { detail: data } : undefined,
      ),
    );
  }

  get currentSpaceId() {
    return this.data.currentSpaceId;
  }

  set currentSpaceId(spaceId: string) {
    this.data.currentSpaceId = spaceId;
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

  set currentSpace(state: Space) {
    const idx = this.data.spaces.findIndex((s) => s.id === this.currentSpaceId);
    if (idx !== -1) {
      this.data.spaces[idx] = state;
    }
  }

  get currentBlocks() {
    return this.currentSpace.blocks;
  }

  set currentBlocks(blocks: Block[]) {
    this.currentSpace.blocks = blocks;
  }

  get currentHistory() {
    return this.history.get(this.currentSpaceId);
  }

  getSpace(id: string) {
    const space = this.spaces.find((s) => s.id === id);
    if (space) {
      return space;
    }
    throw new Error(`Space '${id}' is invalid!`);
  }

  filterSpaces(query: string) {
    return this.spaces.filter((s) => {
      return s.name.toLowerCase().includes(query.toLowerCase());
    });
  }

  addSpace(name?: string) {
    const space = new Space(name);
    this.spaces.push(space);
    this._save("addSpace", space);
    return space;
  }

  updateCurrentSpaceSettings(
    settings: Partial<SpaceSettings>,
    type: "updateSpaceSize" | "rename",
  ) {
    this.currentSpace.settings = {
      ...this.currentSpace.settings,
      ...settings,
    };
    this._save(type, this.currentSpace.settings);
  }

  switchToSpace(id: string) {
    if (this.spaces.filter((s) => s.id === id).length === 1) {
      this.currentSpaceId = id;
      if (!this.history.has(this.currentSpaceId)) {
        this.history.set(
          this.currentSpaceId,
          new SpaceHistory(this.currentSpaceId, this.copyCurrentState()),
        );
      }
      this._save();
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
    if (this.currentSpaceId === id) {
      if (this.spaces.length === 0) {
        const space = this.addSpace();
        this.switchToSpace(space.id);
      } else {
        this.switchToSpace(this.spaces[0].id);
      }
    }
    this.history.delete(id);
    this._save();
  }

  addBlock() {
    const block = new Block(this.currentSpaceId);
    this.currentBlocks.push(block);
    this._save("addBlock", block);
  }

  // TODO: support cross-space block lookup
  getBlock(id: string) {
    return this.currentBlocks.find((b) => b.id === id);
  }

  deleteBlock(id: string) {
    this.currentBlocks = this.currentBlocks.filter((b) => b.id !== id);
  }

  updateBlockContent(id: string, content: string) {
    const block = this.getBlock(id);
    if (block) {
      block.content = content;
      this._save("updateBlock", block);
      this.addUndoable();
    }
  }

  getCard(id: string) {
    return this.currentSpace.cards.find((c) => c.contentId === id);
  }

  addCard(position: ContainerPosition, content?: string) {
    const block = new Block(this.currentSpaceId);
    if (content) {
      block.content = content;
    }
    this.currentBlocks.push(block);

    const card: CardView = {
      contentId: block.id,
      position: position,
      isLocked: false,
      color: "#ffffff",
    };
    this.currentSpace.cards.push(card);

    this._save("addCard", card);
    this.addUndoable();
    return card;
  }

  updateCardColor(cardId: string, color: string) {
    const card = this.getCard(cardId);
    if (card) {
      card.color = color;
      this._save();
    }
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
      this.addUndoable();
      console.log(`saved card ${cardId} position`, card.position);
    } else {
      console.error(`${cardId} not found!`);
    }
  }

  toggleLockCard(cardId: string) {
    const card = this.getCard(cardId);
    if (card) {
      card.isLocked = !card.isLocked;
      console.log(cardId, card.isLocked);
      this._save("toggleLockCard", cardId);
      this.addUndoable();
    }
  }

  deleteCard(contentId: string) {
    const card = this.getCard(contentId);
    if (card?.isLocked) {
      return;
    }
    this.deleteBlock(contentId);
    this.currentSpace.cards = this.currentSpace.cards.filter(
      (c) => c.contentId !== contentId,
    );
    this._save("deleteCard", contentId);
    this.addUndoable();
  }

  copyCurrentState() {
    return structuredClone(this.currentSpace);
  }

  addUndoable() {
    this.history.get(this.currentSpaceId)?.add(this.copyCurrentState());
  }

  merge(data: AppData, state: State) {
    data.spaces = [
      ...data.spaces.filter((s) => s.id !== this.currentSpaceId),
      state,
    ];
    console.log(`merged ${state} into data`);
  }

  undo() {
    if (this.currentHistory?.prevState) {
      this.merge(this.data, structuredClone(this.currentHistory.prevState));
      this.currentHistory.undo();
      this._save();
    }
  }

  redo() {
    if (this.currentHistory?.nextState) {
      this.merge(this.data, structuredClone(this.currentHistory.nextState));
      this.currentHistory.redo();
      this._save();
    }
  }
}
