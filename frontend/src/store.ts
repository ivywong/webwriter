import { Space, Block, CanvasData } from "./model";

export default class WebwriterLocalStore extends EventTarget {
  localStorageKey: string;
  spaceId: string;
  canvasData: CanvasData;

  constructor(localStorageKey: string) {
    super();
    this.localStorageKey = localStorageKey;
    this.spaceId = ""; // TODO: handle creating a new space
    this.canvasData = new CanvasData();
    this._readStorage();

    window.addEventListener(
      "storage",
      () => {
        this._readStorage();
        this._save();
      },
      false
    );
  }
  _resetStore = () => {
    this.canvasData = new CanvasData();
    this.spaceId = this.canvasData.spaces[0].id;
    window.localStorage.removeItem(this.localStorageKey);
  };
  _readStorage = () => {
    let localJson = window.localStorage.getItem(this.localStorageKey);
    if (localJson) {
      this._parseCanvasData(localJson);
    } else {
      console.log("No data found in localstorage.");
    }
  };
  _parseCanvasData = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed) {
        console.log(`parsed JSON`, parsed);

        // TODO: fix bug (TypeError: this.canvasData.spaces[0] is undefined)
        this.canvasData = new CanvasData().deserialize(parsed);
        if (this.canvasData.spaces.length > 0) {
          this.spaceId = this.canvasData.spaces[0].id;
        }
      }
    } catch (err) {
      console.error("Failed to read data from local storage: ", err);
    }
  };
  _save() {
    window.localStorage.setItem(
      this.localStorageKey,
      JSON.stringify(this.canvasData)
    );
    this.dispatchEvent(new CustomEvent("save"));
  }

  get spaces() {
    return this.canvasData.spaces;
  }

  get currentSpace() {
    return this.canvasData.spaces[0];
  }

  get blocks() {
    return this.canvasData.blocks;
  }

  set spaces(spaces: Space[]) {
    this.canvasData.spaces = spaces;
  }

  set blocks(blocks: Block[]) {
    this.canvasData.blocks = blocks;
  }

  addBlock() {
    const block = new Block(this.spaceId);
    this.blocks.push(block);
    this._save();
    return block;
  }
}
