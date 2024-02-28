import WebwriterLocalStore from "./store";

export class AppComponent {
  $root: HTMLDivElement;
  canvas: HTMLDivElement;
  store: WebwriterLocalStore;

  reset: HTMLButtonElement;

  constructor($root: Document, store: WebwriterLocalStore) {
    this.$root = $root.querySelector("#app") as HTMLDivElement;
    this.canvas = $root.getElementById("canvas") as HTMLDivElement;
    this.reset = $root.getElementById("reset") as HTMLButtonElement;
    this.store = store;

    this._bindEvents();
    this.render();
  }

  _bindEvents() {
    this.store.addEventListener("save", this.render.bind(this));

    this.reset.addEventListener("click", (evt: MouseEvent) => {
      this.store._resetStore();
      console.log("reset store data: ", this.store.data);
    });
  }
  render() {
    console.log("rerendering!");
    console.log("store data: ", this.store.data);
  }
}
