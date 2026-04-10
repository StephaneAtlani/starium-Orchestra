export type BudgetLineComparableInput = {
  id: string;
  code: string;
  name: string;
  budgetAmount: number;
  forecastAmount?: number;
  committedAmount?: number;
  consumedAmount?: number;
};

export type ComparedBudgetLinePair = {
  lineKey: string;
  left: BudgetLineComparableInput | null;
  right: BudgetLineComparableInput | null;
};

export function normalizeLineCode(code: string): string {
  return code.trim().toUpperCase();
}

function indexByLineKey(
  lines: BudgetLineComparableInput[],
  side: 'left' | 'right',
): Map<string, BudgetLineComparableInput> {
  const map = new Map<string, BudgetLineComparableInput>();
  for (const line of lines) {
    const lineKey = normalizeLineCode(line.code);
    if (lineKey.length === 0) {
      throw new Error(`Cannot compare line with empty code on ${side} side`);
    }
    if (map.has(lineKey)) {
      throw new Error(
        `Duplicate line key "${lineKey}" detected on ${side} side`,
      );
    }
    map.set(lineKey, line);
  }
  return map;
}

export function compareBudgetLinesByCode(params: {
  left: BudgetLineComparableInput[];
  right: BudgetLineComparableInput[];
  includeMissing?: boolean;
}): ComparedBudgetLinePair[] {
  const includeMissing = params.includeMissing ?? true;
  const leftByKey = indexByLineKey(params.left, 'left');
  const rightByKey = indexByLineKey(params.right, 'right');
  const keys = new Set<string>([...leftByKey.keys(), ...rightByKey.keys()]);

  const pairs: ComparedBudgetLinePair[] = [];
  for (const lineKey of keys) {
    const left = leftByKey.get(lineKey) ?? null;
    const right = rightByKey.get(lineKey) ?? null;
    if (!includeMissing && (!left || !right)) {
      continue;
    }
    pairs.push({ lineKey, left, right });
  }
  return pairs;
}
