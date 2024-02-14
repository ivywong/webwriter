import WebwriterLocalStore from "./store";
import { CardView } from "./model";
import autosize from "autosize";

const cardContainerClass = "card-container";
const cardCornerClass = "card-corner";

export class CanvasComponent {
  $root: HTMLDivElement;
  store: WebwriterLocalStore;

  constructor($root: HTMLDivElement, store: WebwriterLocalStore) {
    this.$root = $root;
    this.store = store;

    this._bindEvents();
    this.renderAll();
  }

  _bindEvents() {
    this.$root.addEventListener("dblclick", (evt: MouseEvent) => {
      console.log(evt);
      const target = evt.target;
      if (evt.target === this.$root) {
        console.log("adding card");

        this.store.addCard({
          x: evt.pageX,
          y: evt.pageY,
          z: 10,
          w: -1,
        });
      } else if (
        target instanceof HTMLElement &&
        target.classList.contains(cardContainerClass)
      ) {
        console.log("double clicked card");

        // ignore events if we are already editing
        if (target.classList.contains("active")) {
          return;
        }

        const textbox = target.querySelector(".card-text") as HTMLTextAreaElement;

        textbox.disabled = false;
        textbox.focus();

        target.classList.add("active");

        textbox.addEventListener("blur", () => {
          console.log(textbox.value);
          this.store.updateBlockContent(
            target.dataset.contentId as string,
            textbox.value as string
          );
        });

        target.addEventListener(
          "focusout",
          () => {
            textbox.disabled = true;
            target.classList.remove("active");
          },
          { once: true }
        );
      }
    });
  }
  renderCard(card: CardView) {
    let cardTemplate = document.querySelector("#card-template") as HTMLTemplateElement;

    let cloned = cardTemplate.content.cloneNode(true);
    this.$root.appendChild(cloned);

    const container = this.$root.querySelector(`.${cardContainerClass}:last-of-type`);

    if (!(container && container instanceof HTMLDivElement)) {
      throw new Error("Failed to add new card!");
    }

    console.log(container);
    const textbox = container.querySelector(`.card-text`) as HTMLTextAreaElement;
    if (textbox) {
      autosize(textbox);
      let content = this.store.getBlock(card.contentId)?.content as string;
      textbox.value = content;
      autosize.update(textbox);
    }

    container.style.top = `${card.position.y}px`;
    container.style.left = `${card.position.x}px`;
    container.style.zIndex = `${card.position.z}`;
    container.dataset.contentId = `${card.contentId}`;

    if (card.position.w !== -1) {
      container.style.maxWidth = "none";
      container.style.width = `${card.position.w}`;
    }

    console.log(container);

    return container;
  }
  renderAll() {
    this.$root.innerHTML = "";
    this.store.currentSpace.cards.forEach((card) => this.renderCard(card));
  }
}
