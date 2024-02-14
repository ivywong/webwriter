import { AppComponent } from "./component.app";
import { CanvasComponent } from "./component.canvas";
import WebwriterLocalStore from "./store";

import "./style.css";

const LocalStore = new WebwriterLocalStore("webwriter");
const App = new AppComponent(document, LocalStore);

const canvasEl = document.querySelector("#canvas") as HTMLDivElement;
const Canvas = new CanvasComponent(canvasEl, LocalStore);

const renderAll = () => {
  App.render();
  Canvas.renderAll();
};

LocalStore.addEventListener("save", renderAll);
