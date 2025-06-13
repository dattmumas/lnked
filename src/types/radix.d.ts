// Minimal Radix UI stubs – keeps TS happy when real typings are missing
/* eslint-disable @typescript-eslint/no-explicit-any */

// DROPDOWN MENU -----------------------------------------------------------
declare module '@radix-ui/react-dropdown-menu' {
  import type * as React from 'react';

  const Root: React.ComponentType<any>;
  const Trigger: React.ComponentType<any>;
  const Portal: React.ComponentType<any>;
  const Content: React.ComponentType<any>;
  const Item: React.ComponentType<any>;
  const Separator: React.ComponentType<any>;

  namespace DropdownMenu {
    export { Root, Trigger, Portal, Content, Item, Separator };
  }
  export = DropdownMenu;
}

// SELECT ------------------------------------------------------------------
declare module '@radix-ui/react-select' {
  import type * as React from 'react';
  const Root: React.ComponentType<any>;
  const Group: React.ComponentType<any>;
  const Value: React.ComponentType<any>;
  const Trigger: React.ComponentType<any>;
  const Icon: React.ComponentType<any>;
  const Portal: React.ComponentType<any>;
  const Content: React.ComponentType<any>;
  const Viewport: React.ComponentType<any>;
  const Item: React.ComponentType<any>;
  const ItemIndicator: React.ComponentType<any>;
  const ItemText: React.ComponentType<any>;
  const Label: React.ComponentType<any>;
  const Separator: React.ComponentType<any>;
  const ScrollUpButton: React.ComponentType<any>;
  const ScrollDownButton: React.ComponentType<any>;

  namespace SelectPrimitive {
    export {
      Root,
      Group,
      Value,
      Trigger,
      Icon,
      Portal,
      Content,
      Viewport,
      Item,
      ItemIndicator,
      ItemText,
      Label,
      Separator,
      ScrollUpButton,
      ScrollDownButton,
    };
  }
  export = SelectPrimitive;
}

// TOOLTIP -----------------------------------------------------------------
declare module '@radix-ui/react-tooltip' {
  import type * as React from 'react';
  const Provider: React.ComponentType<any>;
  const Root: React.ComponentType<any>;
  const Trigger: React.ComponentType<any>;
  const Content: React.ComponentType<any>;

  namespace TooltipPrimitive {
    export { Provider, Root, Trigger, Content };
  }
  export = TooltipPrimitive;
}

/* eslint-enable @typescript-eslint/no-explicit-any */ 