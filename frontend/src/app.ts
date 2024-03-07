import { AppComponent } from "./component.app";
import { CanvasComponent } from "./component.canvas";
import WebwriterLocalStore from "./store";

import "./css/reset.css";
import "./css/style.css";

import panzoom from "panzoom";

const LocalStore = new WebwriterLocalStore("webwriter");

const canvasEl = document.querySelector("#canvas") as HTMLDivElement;
const Canvas = new CanvasComponent(canvasEl, LocalStore);

const setupPanzoom = () => {
  return panzoom(canvasEl, {
    maxZoom: 2,
    minZoom: 0.5,
    zoomDoubleClickSpeed: 1, // disable
    beforeWheel: function (e) {
      var shouldIgnore = !(e.altKey || e.metaKey);
      return shouldIgnore;
    },
    onDoubleClick: function () {
      return false; // disable double click
    },
    bounds: false,
  });
};
export const pz = setupPanzoom();

const App = new AppComponent(document, LocalStore);

const renderAll = () => {
  App.render();
  Canvas.renderAll();
};

renderAll();
