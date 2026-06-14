import type { VCSCommit } from "./types";
import { BranchType } from "./types";
import { getBranchColorInfo } from "../pos/ui-utils";

export interface GraphNode {
  commitHash: string;
  lane: number;
  x: number;
  y: number;
  color: string;
  rowHeight: number;
  startY: number;
}

export interface GraphLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  dashed?: boolean;
  isMain?: boolean;
}

const LANE_WIDTH = 16;
const LANE_OFFSET = 12;
const HEADER_HEIGHT = 56;

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f97316", // Orange
  "#06b6d4", // Cyan
];

export function buildCommitGraph(
  log: VCSCommit[],
  activeBranch: string,
  mainActiveBranch: string,
  expandedHashes: Set<string>,
  branches: Record<string, { type?: BranchType }> = {}
): { nodes: GraphNode[]; lines: GraphLine[]; width: number; height: number } {
  const n = log.length;
  if (n === 0) {
    return { nodes: [], lines: [], width: 0, height: 0 };
  }

  // 1. Assign lanes to branches stably
  const branchList: string[] = [];
  
  if (activeBranch) branchList.push(activeBranch);
  if (mainActiveBranch && !branchList.includes(mainActiveBranch)) {
    branchList.push(mainActiveBranch);
  }

  for (const commit of log) {
    if (!branchList.includes(commit.branch)) {
      branchList.push(commit.branch);
    }
  }

  const laneMap: Record<string, number> = {};
  branchList.forEach((b, idx) => {
    laneMap[b] = idx;
  });

  const getX = (branch: string) => {
    const lane = laneMap[branch] ?? 0;
    return lane * LANE_WIDTH + LANE_OFFSET;
  };

  const getColor = (branchName: string) => {
    return getBranchColorInfo(branchName).hex;
  };

  // 2. Build nodes with dynamic heights
  let currentY = 0;
  const nodes: GraphNode[] = [];
  const commitIndices: Record<string, number> = {};

  log.forEach((commit, idx) => {
    const isExpanded = expandedHashes.has(commit.commitHash);
    const deltasCount = commit.deltas.length;
    // Base height is 56px (collapsed). If expanded, we add height for the deltas list.
    const rowHeight = isExpanded ? HEADER_HEIGHT + Math.min(deltasCount, 10) * 18 + 12 : HEADER_HEIGHT;
    
    const x = getX(commit.branch);
    const y = currentY + HEADER_HEIGHT / 2; // Dot is always centered in the top header section

    nodes.push({
      commitHash: commit.commitHash,
      lane: laneMap[commit.branch] ?? 0,
      x,
      y,
      color: getColor(commit.branch),
      rowHeight,
      startY: currentY,
    });

    commitIndices[commit.commitHash] = idx;
    currentY += rowHeight;
  });

  // 3. Build connecting lines (first-parent + merge-parent edges)
  const commitByHash = new Map(log.map((c) => [c.commitHash, c]));
  const lines: GraphLine[] = [];

  const addEdge = (
    childHash: string,
    parentHash: string,
    colorBranch: string,
    edgeKind: "parent" | "merge"
  ) => {
    const childIdx = commitIndices[childHash];
    const parentIdx = commitIndices[parentHash];
    if (childIdx === undefined || parentIdx === undefined) return;

    const childNode = nodes[childIdx];
    const parentNode = nodes[parentIdx];

    lines.push({
      id: `${childHash}-${edgeKind}-${parentHash}`,
      startX: childNode.x,
      startY: childNode.y,
      endX: parentNode.x,
      endY: parentNode.y,
      color: getColor(colorBranch),
      dashed: branches[colorBranch]?.type === BranchType.Hypothetical,
      isMain: colorBranch === "main",
    });
  };

  log.forEach((commit) => {
    if (commit.parentHash) {
      addEdge(commit.commitHash, commit.parentHash, commit.branch, "parent");
    }

    for (const mergeHash of commit.mergeParentHashes) {
      const mergeParent = commitByHash.get(mergeHash);
      const mergeBranch = mergeParent?.branch ?? commit.branch;
      addEdge(commit.commitHash, mergeHash, mergeBranch, "merge");
    }
  });

  const numLanes = branchList.length;
  const width = numLanes * LANE_WIDTH + LANE_OFFSET * 2;
  const height = currentY;

  return { nodes, lines, width, height };
}
