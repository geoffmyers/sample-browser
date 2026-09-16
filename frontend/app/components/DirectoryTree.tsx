"use client";

import { useState, useMemo } from "react";
import type { DirectoryInfo } from "../lib/types/sample";

interface DirectoryNode {
  name: string;
  path: string;
  sampleCount: number;
  children: DirectoryNode[];
}

interface DirectoryTreeProps {
  directories: DirectoryInfo[];
  selectedDirectory: string | null;
  onSelect: (path: string | null) => void;
}

function buildTree(directories: DirectoryInfo[]): DirectoryNode[] {
  const root: DirectoryNode[] = [];
  const nodeMap = new Map<string, DirectoryNode>();

  // Sort directories to ensure parents are processed first
  const sortedDirs = [...directories].sort((a, b) => a.path.localeCompare(b.path));

  for (const dir of sortedDirs) {
    const pathParts = dir.path.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      // Root directory
      const node: DirectoryNode = {
        name: "(Root)",
        path: "",
        sampleCount: dir.sampleCount,
        children: [],
      };
      nodeMap.set("", node);
      root.push(node);
      continue;
    }

    // Build path incrementally and create missing nodes
    let currentPath = "";
    const currentLevel = root;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i] ?? "";
      const newPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === pathParts.length - 1;

      let node = nodeMap.get(newPath);

      if (!node) {
        node = {
          name: part,
          path: newPath,
          sampleCount: isLast ? dir.sampleCount : 0,
          children: [],
        };
        nodeMap.set(newPath, node);

        // Find parent and add as child
        const parentNode = nodeMap.get(currentPath);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          currentLevel.push(node);
        }
      } else if (isLast) {
        // Update count for existing node
        node.sampleCount = dir.sampleCount;
      }

      currentPath = newPath;
    }
  }

  return root;
}

interface TreeNodeProps {
  node: DirectoryNode;
  level: number;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  defaultExpanded?: boolean;
}

function TreeNode({ node, level, selectedPath, onSelect, defaultExpanded = false }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-node-content ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.path || null)}
      >
        {hasChildren ? (
          <button className="tree-expand-btn" onClick={toggleExpand}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : (
          <span className="tree-expand-spacer" />
        )}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="tree-folder-icon"
        >
          {isExpanded && hasChildren ? (
            <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h9a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2Z" />
          ) : (
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16Z" />
          )}
        </svg>

        <span className="tree-node-name">{node.name}</span>
        {node.sampleCount > 0 && (
          <span className="tree-node-count">({node.sampleCount})</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function DirectoryTree({
  directories,
  selectedDirectory,
  onSelect,
}: DirectoryTreeProps) {
  const tree = useMemo(() => buildTree(directories), [directories]);

  if (directories.length === 0) {
    return <div className="tree-empty">No directories</div>;
  }

  return (
    <div className="directory-tree">
      {/* All Directories option */}
      <div
        className={`tree-node-content ${selectedDirectory === null ? "selected" : ""}`}
        style={{ paddingLeft: "8px" }}
        onClick={() => onSelect(null)}
      >
        <span className="tree-expand-spacer" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="tree-folder-icon"
        >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16Z" />
        </svg>
        <span className="tree-node-name">All Directories</span>
      </div>

      {tree.map((node) => (
        <TreeNode
          key={node.path || "root"}
          node={node}
          level={0}
          selectedPath={selectedDirectory}
          onSelect={onSelect}
          defaultExpanded={true}
        />
      ))}
    </div>
  );
}
