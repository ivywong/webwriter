type ContainerPosition = {
  x: number;
  y: number;
  z: number;
  w: number;
};

type Link = {
  from: string;
  to: string;
};

type CardView = {
  contentId: string;
  position: ContainerPosition;
  isLocked: boolean;
};

export interface Serializable<T> {
  deserialize(obj: Object): T;
}

export class CanvasData implements Serializable<CanvasData> {
  spaces: Space[];
  blocks: Block[];

  constructor(spaces: Space[] = [], blocks: Block[] = []) {
    this.spaces = spaces;
    this.blocks = blocks;

    this.spaces.push(new Space());
  }

  deserialize(obj: any): CanvasData {
    this.spaces = obj.spaces.map((s: any) => {
      new Space().deserialize(s);
    });
    this.blocks = obj.blocks.map((b: any) => {
      new Block("").deserialize(b);
    });
    return this;
  }
}

export class Block implements Serializable<Block> {
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

  deserialize(obj: any) {
    this.id = obj.id;
    this.content = obj.content;
    this.spaceId = obj.origin;
    this.created = obj.created;
    this.last_updated = obj.last_updated;
    return this;
  }
}

export class Stack implements Serializable<Stack> {
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

  deserialize(obj: any) {
    this.id = obj.id;
    this.position = obj.position;
    this.blockIds = obj.blockIds;
    this.isLocked = obj.isLocked;
    this.isCollapsed = obj.isCollapsed;
    return this;
  }
}

export class Space implements Serializable<Space> {
  id: string;
  stacks: Stack[] = [];
  cards: CardView[] = [];
  links: Link[] = [];

  constructor() {
    this.id = `space-${crypto.randomUUID()}`;
  }

  deserialize(obj: any) {
    this.id = obj.id;
    this.stacks = obj.stacks.map((s: any) => {
      new Stack({ x: 0, y: 0, z: 0, w: -1 }).deserialize(s);
    });
    this.cards = obj.cards;
    this.links = obj.links;
    return this;
  }
}
