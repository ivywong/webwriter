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
  color: string;
};

export interface Serializable<T> {
  deserialize(obj: Object): T;
}

export type SpaceSettings = {
  width: number;
  height: number;
};

export class AppData {
  spaces: Space[];
  currentSpaceId: string;

  constructor(spaces: Space[] = [], currentSpaceId: string | undefined) {
    this.spaces = spaces;

    if (currentSpaceId) {
      this.currentSpaceId = currentSpaceId;
      return;
    }

    if (this.spaces.length === 0) {
      this.spaces.push(new Space());
    }

    this.currentSpaceId = this.spaces[0].id;
  }

  static deserialize(obj: any): AppData {
    const spaces = obj.spaces.map((s: any) => {
      return Space.deserialize(s);
    });
    // TODO: null check?
    const currentSpaceId = obj.currentSpaceId;

    return new AppData(spaces, currentSpaceId);
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
    const b = new Block(obj.spaceId);
    b.id = obj.id;
    b.content = obj.content;
    b.spaceId = obj.spaceId;
    b.created = obj.created;
    b.last_updated = obj.last_updated;
    return b;
  }
}

export class Stack {
  id: string;
  title: string;
  position: ContainerPosition;
  blockIds: string[];
  isLocked = false;
  isCollapsed = false;

  constructor(position: ContainerPosition, blockIds: string[] = [], title?: string) {
    this.id = `stack-${crypto.randomUUID()}`;
    this.title = title ?? "Untitled Stack";
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
  name: string = "Untitled";
  stacks: Stack[] = [];
  cards: CardView[] = [];
  links: Link[] = [];
  blocks: Block[] = [];
  settings: SpaceSettings;

  constructor(name: string = "Untitled") {
    this.id = `space-${crypto.randomUUID()}`;
    this.name = name;
    this.settings = {
      width: 2000,
      height: 1500,
    };
  }

  static deserialize(obj: any): Space {
    const s = new Space();

    s.id = obj.id;
    s.name = obj.name;
    s.stacks = obj.stacks.map((s: unknown) => {
      return Stack.deserialize(s);
    });
    s.cards = obj.cards;
    s.links = obj.links;
    s.blocks = obj.blocks.map((b: unknown) => {
      return Block.deserialize(b);
    });
    s.settings = obj.settings;
    return s;
  }
}
