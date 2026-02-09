import { Handle, Position } from "@xyflow/react";

export default function GenericNode({ data }) {
  const { ui, source, target } = data;

  return (
    <div
      className={`bg-base-100 ${ui.containerClass} transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer shadow-md`}
      style={{ width: ui.width || 220 }}
    >
      {ui.render?.()}

      {target && <Handle type="target" position={Position.Left} />}
      {source && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
