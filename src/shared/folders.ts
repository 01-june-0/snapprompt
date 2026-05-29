/**
 * Folder hierarchy helpers (unlimited depth, see PRD §F6.1 / Q3).
 */
import type { Folder } from './types';

export interface FolderNode extends Folder {
  children: FolderNode[];
  depth: number;
}

/** Build a sorted tree of root nodes. Orphans (missing parent) become roots. */
export function buildTree(folders: Folder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const f of folders) byId.set(f.id, { ...f, children: [], depth: 0 });

  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: FolderNode[], depth: number) => {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    for (const n of nodes) {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    }
  };
  sortRec(roots, 0);
  return roots;
}

/** Flatten the tree into display order, each node carrying its depth. */
export function flattenTree(folders: Folder[]): FolderNode[] {
  const out: FolderNode[] = [];
  const walk = (nodes: FolderNode[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(buildTree(folders));
  return out;
}

/** Human-readable path, e.g. "코딩 / 리뷰". Null → "분류 없음". */
export function folderPath(folders: Folder[], id: string | null): string {
  if (!id) return '분류 없음';
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let cur = byId.get(id);
  let guard = 0;
  while (cur && guard++ < 100) {
    parts.unshift(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts.join(' / ') || '분류 없음';
}

/** All descendant folder ids of `id` (exclusive of `id`). */
export function descendantIds(folders: Folder[], id: string): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parentId) continue;
    const arr = childrenOf.get(f.parentId) ?? [];
    arr.push(f.id);
    childrenOf.set(f.parentId, arr);
  }
  const set = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of childrenOf.get(cur) ?? []) {
      if (!set.has(c)) {
        set.add(c);
        stack.push(c);
      }
    }
  }
  return set;
}

/** Folder id + all its descendants (for "show everything under this folder"). */
export function selfAndDescendants(folders: Folder[], id: string): Set<string> {
  const set = descendantIds(folders, id);
  set.add(id);
  return set;
}

/** Would making `candidateParent` the parent of `id` create a cycle? */
export function wouldCycle(folders: Folder[], id: string, candidateParent: string | null): boolean {
  if (!candidateParent) return false;
  if (candidateParent === id) return true;
  return descendantIds(folders, id).has(candidateParent);
}

/** Count prompts whose folderId is in the given folder (incl. descendants). */
export function countInFolder(
  folders: Folder[],
  promptFolderIds: (string | null)[],
  folderId: string,
): number {
  const ids = selfAndDescendants(folders, folderId);
  return promptFolderIds.filter((f) => f != null && ids.has(f)).length;
}
