import WebwriterLocalStore from "./store";

export class AppComponent {
  $root: HTMLDivElement;
  canvas: HTMLDivElement;
  store: WebwriterLocalStore;

  reset: HTMLButtonElement;
  spaceToggle: HTMLDetailsElement;
  spaceTitle: HTMLElement;

  switchSpaceButton: HTMLButtonElement;
  openSpaceSettingsButton: HTMLButtonElement;
  exportSpaceButton: HTMLButtonElement;
  deleteSpaceButton: HTMLButtonElement;

  constructor($root: Document, store: WebwriterLocalStore) {
    this.$root = $root.querySelector("#app") as HTMLDivElement;
    this.canvas = $root.getElementById("canvas") as HTMLDivElement;
    this.reset = $root.getElementById("reset") as HTMLButtonElement;
    this.spaceToggle = $root.getElementById("space-header") as HTMLDetailsElement;
    this.spaceTitle = $root.getElementById("space-title") as HTMLElement;

    this.switchSpaceButton = $root.getElementById("switch-space") as HTMLButtonElement;
    this.openSpaceSettingsButton = $root.getElementById(
      "space-settings"
    ) as HTMLButtonElement;
    this.exportSpaceButton = $root.getElementById("export-space") as HTMLButtonElement;
    this.deleteSpaceButton = $root.getElementById("delete-space") as HTMLButtonElement;

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

    this.openSpaceSettingsButton.addEventListener("click", (evt: MouseEvent) => {
      // open modal
    });
  }
  render() {
    console.log("rerendering!");
    console.log("store data: ", this.store.data);

    this.spaceTitle.textContent = this.store.currentSpace.name;
  }
}
