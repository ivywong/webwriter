export type ContainerPosition = {
  x: number;
  y: number;
  z: number;
  w: number;
};

type Link = {
  from: string;
  to: string;
};

export type CardView = {
  contentId: string;
  position: ContainerPosition;
  isLocked: boolean;
};

export interface Serializable<T> {
  deserialize(obj: Object): T;
}

export class CanvasData {
  spaces: Space[];
  blocks: Block[];

  constructor(spaces: Space[] = [], blocks: Block[] = []) {
    this.spaces = spaces;
    this.blocks = blocks;
  }

  static deserialize(obj: any): CanvasData {
    const data = new CanvasData();
    data.spaces = obj.spaces.map((s: any) => {
      return Space.deserialize(s);
    });
    data.blocks = obj.blocks.map((b: any) => {
      return Block.deserialize(b);
    });
    return data;
  }
}

export class Block {
  id: string;
  content: string = ""; // TODO: possibly integrate with CodeMirror
  spaceId: string;
  created: number;
  last_updated: number;

  constructor(spaceId: string) {
    this.id = `block-${crypto.randomUUID()}`;
    this.spaceId = spaceId;
    this.created = Date.now();
    this.last_updated = this.created;
  }

  set text(text: string) {
    this.last_updated = Date.now();
    this.content = text;
  }

  static deserialize(obj: any) {
    const b = new Block(obj.origin);
    b.id = obj.id;
    b.content = obj.content;
    b.spaceId = obj.origin;
    b.created = obj.created;
    b.last_updated = obj.last_updated;
    return b;
  }
}

export class Stack {
  id: string;
  position: ContainerPosition;
  blockIds: string[];
  isLocked = false;
  isCollapsed = false;

  constructor(position: ContainerPosition, blockIds: string[] = []) {
    this.id = `stack-${crypto.randomUUID()}`;
    this.position = position;
    this.blockIds = blockIds;
  }

  addCard(blockId: string) {
    this.blockIds.push(blockId);
  }

  static deserialize(obj: any) {
    const s = new Stack({ x: 0, y: 0, z: 0, w: -1 });
    s.id = obj.id;
    s.position = obj.position;
    s.blockIds = obj.blockIds;
    s.isLocked = obj.isLocked;
    s.isCollapsed = obj.isCollapsed;
    return s;
  }
}

export class Space {
  id: string;
  stacks: Stack[] = [];
  cards: CardView[] = [];
  links: Link[] = [];

  constructor() {
    this.id = `space-${crypto.randomUUID()}`;
  }

  static deserialize(obj: any) {
    const s = new Space();
    s.id = obj.id;
    s.stacks = obj.stacks.map((s: any) => {
      Stack.deserialize(s);
    });
    s.cards = obj.cards;
    s.links = obj.links;
    return s;
  }
}
