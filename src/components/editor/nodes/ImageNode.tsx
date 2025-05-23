/*
 * ImageNode for Lnked, adapted from Lexical Playground (MIT License)
 * https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/nodes/ImageNode.tsx
 */
import { DecoratorNode, NodeKey, SerializedLexicalNode, Spread } from "lexical";
import type { JSX } from "react";
import React, { useState, useEffect } from "react";
import Image from "next/image";

export type SerializedImageNode = Spread<
  {
    type: "image";
    version: 1;
    src: string;
    alt: string;
    width?: number;
    height?: number;
    maxWidth?: number;
    showCaption?: boolean;
    caption?: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: number | undefined;
  __height: number | undefined;
  __maxWidth: number | undefined;
  __showCaption: boolean;
  __caption: string;

  static getType() {
    return "image";
  }

  static clone(node: ImageNode) {
    return new ImageNode(
      node.__src,
      node.__alt,
      node.__width,
      node.__height,
      node.__maxWidth,
      node.__showCaption,
      node.__caption,
      node.__key
    );
  }

  static importJSON(serialized: SerializedImageNode) {
    return new ImageNode(
      serialized.src,
      serialized.alt,
      serialized.width,
      serialized.height,
      serialized.maxWidth,
      serialized.showCaption,
      serialized.caption
    );
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      width: this.__width,
      height: this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      caption: this.__caption,
    };
  }

  constructor(
    src: string = "",
    alt: string = "Image",
    width?: number,
    height?: number,
    maxWidth?: number,
    showCaption: boolean = false,
    caption: string = "",
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width;
    this.__height = height;
    this.__maxWidth = maxWidth;
    this.__showCaption = showCaption;
    this.__caption = caption;
  }

  createDOM(): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "image-node-container";
    figure.contentEditable = "false";
    return figure;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        alt={this.__alt}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        showCaption={this.__showCaption}
        caption={this.__caption}
      />
    );
  }
}

interface ImageComponentProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  showCaption?: boolean;
  caption?: string;
}

function ImageComponent({
  src,
  alt,
  width = 500,
  height = 500,
  maxWidth,
  showCaption = false,
  caption = "",
}: ImageComponentProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Reset state when src changes
    setError(false);
    setLoaded(false);
  }, [src]);

  return (
    <figure className="image-node-container">
      {error ? (
        <div className="image-node-error">
          <p>Unable to load image: {src}</p>
          <a href={src} target="_blank" rel="noopener noreferrer">
            Open image in new tab
          </a>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          style={{
            maxWidth: maxWidth ? `${maxWidth}px` : "100%",
            height: "auto",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s",
          }}
          className="image-node"
          unoptimized={true}
          loading="lazy"
          onError={() => setError(true)}
          onLoad={() => setLoaded(true)}
        />
      )}
      {!error && showCaption && (
        <figcaption className="image-node-caption">{caption || alt}</figcaption>
      )}
    </figure>
  );
}

export function $createImageNode(
  src: string,
  alt: string = "Image",
  width?: number,
  height?: number,
  maxWidth?: number,
  showCaption: boolean = false,
  caption: string = ""
): ImageNode {
  return new ImageNode(src, alt, width, height, maxWidth, showCaption, caption);
}

export function $isImageNode(node: unknown): node is ImageNode {
  return node instanceof ImageNode;
}
