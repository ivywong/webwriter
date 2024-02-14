import WebwriterLocalStore from "./store";

export class AppComponent {
  app: HTMLDivElement;
  canvas: HTMLDivElement;
  store: WebwriterLocalStore;

  reset: HTMLButtonElement;

  constructor($root: Document, store: WebwriterLocalStore) {
    this.app = $root.querySelector("#app") as HTMLDivElement;
    this.canvas = $root.getElementById("canvas") as HTMLDivElement;
    this.reset = $root.getElementById("reset") as HTMLButtonElement;
    this.store = store;

    console.log("store: ", this.store);

    this._bindEvents();
    this.render();
  }
  _bindEvents = () => {
    this.store.addEventListener("save", this.render);

    this.reset.addEventListener("click", (evt: MouseEvent) => {
      this.store._resetStore();
      console.log("reset store");
      console.log("store: ", this.store.canvasData);
    });

    this.canvas.addEventListener("dblclick", (evt: MouseEvent) => {
      console.log("add block");
      this.store.addBlock();
    });
  };
  render = () => {
    console.log("rerendering!");
    console.log("store: ", this.store.canvasData);
  };
}
