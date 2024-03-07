import { Space } from "./model";

export type State = Space;

export class SpaceHistory {
  undos: State[];
  redos: State[];
  current: State;
  spaceId: string;

  constructor(spaceId: string, state: State) {
    this.undos = [];
    this.redos = [];
    this.current = state;
    this.spaceId = spaceId;
  }

  get prevState() {
    return this.undos[this.undos.length - 1];
  }

  get nextState() {
    return this.redos[this.redos.length - 1];
  }

  undo() {
    const state = this.undos.pop();
    if (state) {
      this.redos.push(this.current);
      this.current = state;
    }
  }

  redo() {
    const state = this.redos.pop();
    if (state) {
      this.undos.push(this.current);
      this.current = state;
    }
  }

  // clear redos on new undo
  add(state: State) {
    this.undos.push(this.current);
    this.current = state;
    this.redos = [];
  }
}
