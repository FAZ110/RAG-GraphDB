/// <reference types="vite/client" />

declare module 'react-cytoscapejs' {
  import type { ElementDefinition, Stylesheet, LayoutOptions, Core } from 'cytoscape';
  import type { CSSProperties } from 'react';
  import { Component } from 'react';

  interface CytoscapeComponentProps {
    elements: ElementDefinition[];
    stylesheet?: Stylesheet[];
    layout?: LayoutOptions;
    style?: CSSProperties;
    cy?: (cy: Core) => void;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}