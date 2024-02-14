import { AppComponent } from "./component.app";
import WebwriterLocalStore from "./store";

import "./style.css";

export const LocalStore = new WebwriterLocalStore("webwriter");
export const App = new AppComponent(document, LocalStore);
