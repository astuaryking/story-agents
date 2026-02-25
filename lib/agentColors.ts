export const AGENT_COLORS = [
  '#00f5d4', // cyan
  '#f72585', // magenta
  '#f9c74f', // amber
  '#bc96e6', // violet
  '#06d6a0', // green
  '#ff6b35', // orange
];

export function getAgentColor(turnOrder: number): string {
  return AGENT_COLORS[(turnOrder - 1) % AGENT_COLORS.length];
}

export const STATUS_COLORS: Record<string, string> = {
  waiting:   '#f9c74f',
  active:    '#00f5d4',
  judging:   '#bc96e6',
  completed: '#06d6a0',
};
