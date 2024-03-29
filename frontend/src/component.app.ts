import { Space } from "./model";
import WebwriterLocalStore from "./store";
import { pz } from "./app";

import { debounce } from "ts-debounce";
import hotkeys from "hotkeys-js";

export class AppComponent {
  app: HTMLDivElement;
  canvas: HTMLDivElement;
  store: WebwriterLocalStore;

  resetStorage: HTMLButtonElement;
  resetZoom: HTMLButtonElement;
  spaceToggle: HTMLDetailsElement;
  spaceTitle: HTMLElement;

  switchSpaceButton: HTMLButtonElement;
  openSpaceSettingsButton: HTMLButtonElement;
  exportSpaceButton: HTMLButtonElement;
  deleteSpaceButton: HTMLButtonElement;

  modal: HTMLDivElement;
  popup: HTMLDivElement;

  constructor($root: Document, store: WebwriterLocalStore) {
    this.app = $root.querySelector("#app") as HTMLDivElement;
    this.canvas = $root.getElementById("canvas") as HTMLDivElement;
    this.resetStorage = $root.getElementById("reset-storage") as HTMLButtonElement;
    this.resetZoom = $root.getElementById("reset-zoom") as HTMLButtonElement;
    this.spaceToggle = $root.getElementById("space-header") as HTMLDetailsElement;
    this.spaceTitle = $root.getElementById("space-title") as HTMLElement;

    this.switchSpaceButton = $root.getElementById("switch-space") as HTMLButtonElement;
    this.openSpaceSettingsButton = $root.getElementById(
      "space-settings"
    ) as HTMLButtonElement;
    this.exportSpaceButton = $root.getElementById("export-space") as HTMLButtonElement;
    this.deleteSpaceButton = $root.getElementById("delete-space") as HTMLButtonElement;

    this.modal = $root.getElementById("modal") as HTMLDivElement;
    this.popup = $root.getElementById("popup") as HTMLDivElement;

    this.store = store;

    this._bindEvents();
    this._setupHotkeys();
    this.render();
  }

  _bindEvents() {
    this.spaceToggle.onpointerdown = (evt: PointerEvent) => {
      // prevent panning when clicking on the UI
      evt.preventDefault();
    };
    this.spaceToggle.onkeydown = (evt: KeyboardEvent) => {
      if (
        evt.target === this.spaceToggle &&
        (evt.code === "Enter" || evt.code === "Space")
      ) {
        this.toggleMenu();
        evt.preventDefault();
      }
    };

    this.app.onclick = (evt: MouseEvent) => {
      const isChild = this.spaceToggle.contains(evt.target as Node);
      if (!isChild && this.spaceToggle.hasAttribute("open")) {
        this.closeMenu();
      }
    };
    this.store.addEventListener("save", this.render.bind(this));

    this.resetStorage.onclick = () => {
      this.store._resetStore();
      console.log("reset store data: ", this.store.data);
    };

    this.resetZoom.onclick = () => {
      pz.zoomAbs(0, 0, 1.0);
      pz.moveTo(0, 0);
    };

    pz.on("zoom", () => {
      this.resetZoom.textContent = `${Math.ceil(pz.getTransform().scale * 100)}%`;
    });

    this.deleteSpaceButton.onclick = () => {
      // TODO: add confirmation modal
      this.store.deleteSpace(this.store.currentSpaceId);
      this.closeMenu();
    };

    this.switchSpaceButton.onclick = () => {
      this.openModal();
      this.renderSpaceSwitcher();
    };

    this.modal.onclick = (evt: MouseEvent) => {
      if (evt.target === this.modal) {
        this.closeModal();
      }
    };
  }

  _setupHotkeys() {
    // enable hotkeys for inputs in the modal
    // https://github.com/jaywcjlove/hotkeys-js?tab=readme-ov-file#filter
    hotkeys.filter = function (event) {
      const target = event.target as HTMLElement;
      const inputs = ["TEXTAREA", "INPUT", "SELECT"];
      return (
        !inputs.includes(target.tagName) ||
        (target.tagName === "INPUT" && hotkeys.getScope() === "modal")
      );
    };

    hotkeys("ctrl+/, command+/", { scope: "canvas" }, () => {
      if (!this.isModalOpen()) {
        console.log("modal closed");
        this.openModal();
        this.renderSpaceSwitcher();
      }
    });

    hotkeys("esc", { scope: "modal" }, () => {
      this.closeModal();
    });
  }

  private renderSpaceSwitcher() {
    const popupTemplate = document.getElementById(
      "space-picker-template"
    ) as HTMLTemplateElement;

    const cloned = popupTemplate.content.cloneNode(true);
    this.popup.replaceChildren(cloned);

    const input = document.getElementById("space-picker-input") as HTMLInputElement;
    const debouncedInputHandler = debounce(
      (evt: InputEvent) => {
        const filteredSpaces = this.store.filterSpaces(
          (evt.target as HTMLInputElement).value.trim()
        );
        const spacesListEl = this.popup.querySelector("ul") as HTMLElement;
        spacesListEl.replaceChildren(...filteredSpaces.map(this.createSpaceButton));
      },
      50,
      { isImmediate: true }
    );
    input?.addEventListener("input", function (evt) {
      debouncedInputHandler(evt as InputEvent);
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

    const spaceListEl = this.popup.getElementsByTagName("ul")[0] as HTMLUListElement;

    for (const space of this.store.spaces) {
      spaceListEl.appendChild(this.createSpaceButton(space));
    }

    input.focus();
  }

  render() {
    console.log("rerendering!");
    console.log("store data: ", this.store.data);

    this.spaceTitle.textContent = this.store.currentSpace.name;
  }
  createSpaceButton(space: Space) {
    const button = document.createElement("button");
    button.textContent = space.name;

    button.onclick = () => {
      this.store.switchToSpace(space.id);
      this.closeModal();
      this.closeMenu();
    };
    return button;
  }

  openMenu() {
    this.spaceToggle.setAttribute("open", "");
  }

  closeMenu() {
    this.spaceToggle.removeAttribute("open");
  }

  toggleMenu() {
    if (this.spaceToggle.hasAttribute("open")) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  isModalOpen() {
    return getComputedStyle(this.modal).display !== "none";
  }

  openModal() {
    this.modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    hotkeys.setScope("modal");
  }

  closeModal() {
    this.modal.style.display = "none";
    document.body.style.overflow = "unset";
    this.popup.innerHTML = "";
    hotkeys.setScope("canvas");
  }
}
