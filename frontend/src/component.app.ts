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

    this.reset.onclick = () => {
      this.store._resetStore();
      console.log("reset store data: ", this.store.data);
    };

    this.deleteSpaceButton.onclick = () => {
      // TODO: add confirmation modal
      this.store.deleteSpace(this.store.currentSpaceId);
      this.closeMenu();
    };

    this.switchSpaceButton.onclick = () => {
      const popupTemplate = document.getElementById(
        "space-picker-template"
      ) as HTMLTemplateElement;

      const cloned = popupTemplate.content.cloneNode(true);
      this.spacePickerPopup.appendChild(cloned);

      const input = document.getElementById("space-picker-input") as HTMLInputElement;
      input?.addEventListener("input", () => {
        console.log(input.value);
      });

      const createSpaceButton = document.getElementById(
        "create-space-button"
      ) as HTMLButtonElement;

      createSpaceButton.onclick = () => {
        if (input.value !== "") {
          const space = this.store.addSpace(input.value);
          input.value = "";
          this.store.switchToSpace(space.id);
          this.closeModal();
          this.closeMenu();
        }
      };

      const spaceListEl = this.spacePickerPopup.getElementsByTagName(
        "ul"
      )[0] as HTMLUListElement;

      for (const space of this.store.spaces) {
        const button = document.createElement("button");
        button.textContent = space.name;
        spaceListEl.appendChild(button);

        button.onclick = () => {
          this.store.switchToSpace(space.id);
          this.closeModal();
          this.closeMenu();
        };
      }
      this.spacePickerModal.style.display = "flex";
    };

    this.spacePickerModal.onclick = (evt: MouseEvent) => {
      if (evt.target === this.spacePickerModal) {
        this.closeModal();
      }
    };
  }
  render() {
    console.log("rerendering!");
    console.log("store data: ", this.store.data);

    this.spaceTitle.textContent = this.store.currentSpace.name;
  }

  closeMenu() {
    this.spaceToggle.removeAttribute("open");
  }

  closeModal() {
    this.spacePickerModal.style.display = "none";
    this.spacePickerPopup.innerHTML = "";
  }
}
