/**
 * Groups consecutive messages from the same role together.
 * Each group has a `role`, the array of original message indices,
 * and whether to show the avatar (only first in group).
 */

export interface ChatMsgBase {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: unknown;
  timestamp?: number;
}

export interface MessageGroup {
  role: ChatMsgBase['role'];
  /** Indices into the original messages array */
  indices: number[];
}

/**
 * Groups consecutive same-role messages.
 * Tool messages are always kept adjacent to the preceding assistant message.
 */
export function groupMessages<T extends ChatMsgBase>(messages: T[]): MessageGroup[] {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let current: MessageGroup = { role: messages[0].role, indices: [0] };

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    // tool results stay with the preceding assistant group
    if (msg.role === 'tool' && current.role === 'assistant') {
      current.indices.push(i);
    } else if (msg.role === current.role) {
      current.indices.push(i);
    } else {
      groups.push(current);
      current = { role: msg.role, indices: [i] };
    }
  }
  groups.push(current);
  return groups;
}

/**
 * Returns whether this message index is the first in its group
 * (and should display the avatar).
 */
export function isFirstInGroup(groups: MessageGroup[], msgIndex: number): boolean {
  for (const g of groups) {
    if (g.indices[0] === msgIndex) return true;
    if (g.indices.includes(msgIndex)) return false;
  }
  return true;
}

/**
 * Returns whether this message index is the last in its group
 * (and should have the tail radius on the bubble).
 */
export function isLastInGroup(groups: MessageGroup[], msgIndex: number): boolean {
  for (const g of groups) {
    if (g.indices[g.indices.length - 1] === msgIndex) return true;
    if (g.indices.includes(msgIndex)) return false;
  }
  return true;
}
