import { parseAmountToMinor } from '@/utils/money';

type Operator = '+' | '-' | '*' | '/';
export type CalculatorKey = Operator | 'back' | 'clear' | 'percent' | 'sign' | 'decimal' | 'equals' | `${number}`;
type Operation = { value: bigint; operator: Operator };
export type CalculatorState = { operations: Operation[]; input: string; replace: boolean; error: boolean };

const FRACTION_DIGITS = 12;
const SCALE = 10n ** BigInt(FRACTION_DIGITS);
const MAX_DIGITS = 20;
const MAX_OPERATIONS = 32;

function fromText(text: string): bigint {
  const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
  const value = BigInt(whole || '0') * SCALE + BigInt(fraction.padEnd(FRACTION_DIGITS, '0'));
  return text.startsWith('-') ? -value : value;
}

function toText(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  const fraction = (absolute % SCALE).toString().padStart(FRACTION_DIGITS, '0').replace(/0+$/, '');
  return `${value < 0n ? '-' : ''}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`;
}

function evaluate(operations: Operation[], last: bigint): bigint | null {
  let sum = 0n;
  let term = operations[0]?.value ?? last;
  for (let i = 0; i < operations.length; i += 1) {
    const next = operations[i + 1]?.value ?? last;
    switch (operations[i].operator) {
      case '+': sum += term; term = next; break;
      case '-': sum += term; term = -next; break;
      case '*': term = term * next / SCALE; break;
      case '/':
        if (next === 0n) return null;
        term = term * SCALE / next;
        break;
    }
  }
  return sum + term;
}

export function createCalculator(amount = ''): CalculatorState {
  const normalized = amount.trim().replace(',', '.');
  const input = /^-?\d+(\.\d{0,12})?$/.test(normalized) && normalized.length <= MAX_DIGITS
    ? normalized
    : '0';
  return { operations: [], input, replace: false, error: false };
}

export function calculatorResult(state: CalculatorState): bigint | null {
  if (state.error) return null;
  return state.replace && state.operations.length
    ? evaluate(state.operations.slice(0, -1), fromText(state.input))
    : evaluate(state.operations, fromText(state.input));
}

export function calculatorAmount(state: CalculatorState, currencyDigits: number): string | null {
  const value = calculatorResult(state);
  if (value === null || value <= 0n || currencyDigits < 0 || currencyDigits > FRACTION_DIGITS) return null;
  const step = 10n ** BigInt(FRACTION_DIGITS - currencyDigits);
  const rounded = toText((value + step / 2n) / step * step);
  const minor = parseAmountToMinor(rounded, currencyDigits);
  return minor !== null && minor > 0 ? rounded : null;
}

export function pressCalculatorKey(state: CalculatorState, key: CalculatorKey): CalculatorState {
  if (key === 'clear') {
    return state.error || state.replace || state.input === '0'
      ? createCalculator()
      : { ...state, input: '0' };
  }
  if (state.error) {
    return /^\d$/.test(key) || key === 'decimal'
      ? pressCalculatorKey(createCalculator(), key)
      : state;
  }
  if (key === 'equals') {
    const value = calculatorResult(state);
    return value === null
      ? { ...createCalculator(), error: true }
      : { ...createCalculator(), input: toText(value), replace: true };
  }
  if (key === '+' || key === '-' || key === '*' || key === '/') {
    const operations = state.replace && state.operations.length ? state.operations.slice(0, -1) : state.operations;
    if (operations.length >= MAX_OPERATIONS) return state;
    return { ...state, operations: [...operations, { value: fromText(state.input), operator: key }], replace: true };
  }
  if (key === 'sign') {
    const input = state.replace && state.operations.length ? '0' : state.input;
    return { ...state, input: input.startsWith('-') ? input.slice(1) : `-${input}`, replace: false };
  }
  if (key === 'percent') {
    const value = state.replace && state.operations.length ? 0n : fromText(state.input);
    const operator = state.operations.at(-1)?.operator;
    const base = operator === '+' || operator === '-'
      ? evaluate(state.operations.slice(0, -1), state.operations.at(-1)!.value)
      : SCALE;
    return base === null ? { ...createCalculator(), error: true } : {
      ...state,
      input: toText(base * value / (SCALE * 100n)),
      replace: false,
    };
  }
  if (key === 'back') {
    if (state.replace) return state;
    const input = state.input.slice(0, -1);
    return { ...state, input: input === '-' || !input ? '0' : input };
  }
  const current = state.replace ? '0' : state.input;
  if (key === 'decimal') {
    return current.includes('.') ? state : { ...state, input: `${current}.`, replace: false };
  }
  if (!/^\d$/.test(key)) return state;
  const input = current === '0' || current === '-0' ? current.slice(0, -1) + key : current + key;
  const fraction = input.split('.')[1];
  return input.length <= MAX_DIGITS && (!fraction || fraction.length <= FRACTION_DIGITS)
    ? { ...state, input, replace: false }
    : state;
}
