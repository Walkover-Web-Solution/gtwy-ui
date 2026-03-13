"use client";
import React from "react";
import { componentRegistry } from "./componentRegistry";

/**
 * RenderNode — recursive renderer for the richUI JSON tree.
 *
 * Each node is a plain JSON object with at minimum a `type` field.
 * The matching React component is looked up from componentRegistry and rendered,
 * receiving all node props plus:
 *   - onAction    (action callback for buttons/clickable elements)
 *   - renderNode  (so layout components can recursively render children)
 *   - actionDefs  (resolved action_definitions map, forwarded to buttons)
 *
 * @param {Object}   props.node        - A richUI JSON node (or array of nodes)
 * @param {Function} props.onAction    - Callback: (action) => void, called by ButtonComponent
 * @param {Object}   props.actionDefs  - Map of named action definitions (from widget doc)
 */
export default function RenderNode({ node, onAction, actionDefs }) {
  if (!node) return null;

  const wrappedOnAction = (action) => {
    if (onAction) onAction(action);
  };

  // Support top-level arrays (e.g. when {{items}} resolves to an array of nodes)
  if (Array.isArray(node)) {
    return (
      <>
        {node.map((item, i) => (
          <RenderNode
            key={item?.id ?? i}
            node={item}
            onAction={onAction} // Keep passing original to children, they will wrap it
            actionDefs={actionDefs}
          />
        ))}
      </>
    );
  }

  if (typeof node !== "object") return null;

  const Component = componentRegistry[node.type];

  if (!Component) {
    // Render children anyway so the tree isn't silently swallowed
    if (Array.isArray(node.children) && node.children.length > 0) {
      return (
        <>
          {node.children.map((child, i) => (
            <RenderNode
              key={child?.id ?? i}
              node={child}
              onAction={onAction} // pass down original
              actionDefs={actionDefs}
            />
          ))}
        </>
      );
    }
    return null;
  }

  // Destructure `key` and `type` out — React requires key passed directly; type is not a valid DOM prop
  const { key, type, ...nodeProps } = node;
  return (
    <Component key={key} {...nodeProps} onAction={wrappedOnAction} actionDefs={actionDefs} renderNode={RenderNode} />
  );
}
