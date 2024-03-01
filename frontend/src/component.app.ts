import WebwriterLocalStore from "./store";

export class AppComponent {
  app: HTMLDivElement;
  canvas: HTMLDivElement;
  store: WebwriterLocalStore;

  reset: HTMLButtonElement;
  spaceToggle: HTMLDetailsElement;
  spaceTitle: HTMLElement;

  switchSpaceButton: HTMLButtonElement;
  openSpaceSettingsButton: HTMLButtonElement;
  exportSpaceButton: HTMLButtonElement;
  deleteSpaceButton: HTMLButtonElement;

  spacePickerModal: HTMLDivElement;
  spacePickerPopup: HTMLDivElement;

  constructor($root: Document, store: WebwriterLocalStore) {
    this.app = $root.querySelector("#app") as HTMLDivElement;
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

    this.spacePickerModal = $root.getElementById("space-picker-modal") as HTMLDivElement;
    this.spacePickerPopup = $root.getElementById("space-picker-popup") as HTMLDivElement;

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

    this.switchSpaceButton.addEventListener("click", (evt: MouseEvent) => {
      const spaceListEl = document.createElement("ul");
      for (const space of this.store.spaces) {
        const button = document.createElement("button");
        button.textContent = space.name;
        button.dataset.spaceId = space.id;
        spaceListEl.appendChild(button);
      }
      this.spacePickerPopup.appendChild(spaceListEl);
      this.spacePickerModal.style.display = "flex";
    });

    this.spacePickerModal.addEventListener("click", (evt: MouseEvent) => {
      if (evt.target === this.spacePickerModal) {
        this.spacePickerModal.style.display = "none";
        this.spacePickerPopup.innerHTML = "";
      }
    });
  }
  render() {
    console.log("rerendering!");
    console.log("store data: ", this.store.data);

    this.spaceTitle.textContent = this.store.currentSpace.name;
  }
}
