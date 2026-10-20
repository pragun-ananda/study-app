import { describe, it, expect } from 'vitest';
import {
  deepEqual,
  stripTypeScript,
  formatValue,
  parseValue,
  runJavaScript,
  runPython,
  runSQL,
  runGenericCompiled,
  runCode,
  runSubmissionSuite,
  TestCaseItem
} from '../../src/utils/codeRunner';

describe('codeRunner utility', () => {
  describe('deepEqual', () => {
    it('compares primitives correctly', () => {
      expect(deepEqual(5, 5)).toBe(true);
      expect(deepEqual(5, 6)).toBe(false);
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual('hello', 'world')).toBe(false);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(true, false)).toBe(false);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    it('compares floating point numbers with tolerance', () => {
      expect(deepEqual(0.1 + 0.2, 0.3)).toBe(true);
      expect(deepEqual(NaN, NaN)).toBe(true);
    });

    it('compares arrays deeply', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('compares objects deeply', () => {
      expect(deepEqual({ a: 1, b: 'two' }, { a: 1, b: 'two' })).toBe(true);
      expect(deepEqual({ a: 1, b: 'two' }, { b: 'two', a: 1 })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });
  });

  describe('stripTypeScript', () => {
    it('strips parameter types, return types, and export keywords', () => {
      const ts = `export function trap(height: number[]): number { return height.length; }`;
      const js = stripTypeScript(ts);
      expect(js).not.toContain(': number[]');
      expect(js).not.toContain(': number');
      expect(js).not.toContain('export ');
      expect(js).toContain('function trap(height)');
    });

    it('removes interfaces, type aliases, and access modifiers', () => {
      const ts = `
        interface CacheNode { key: number; val: number; }
        type ID = string | number;
        export class LRU {
          private capacity: number;
          public get(key: number): number { return 1; }
        }
      `;
      const js = stripTypeScript(ts);
      expect(js).not.toContain('interface CacheNode');
      expect(js).not.toContain('type ID');
      expect(js).not.toContain('private ');
      expect(js).not.toContain('public ');
    });
  });

  describe('parseValue & formatValue', () => {
    it('formats values properly', () => {
      expect(formatValue(null)).toBe('null');
      expect(formatValue(undefined)).toBe('undefined');
      expect(formatValue('abc')).toBe('"abc"');
      expect(formatValue(123)).toBe('123');
      expect(formatValue({ a: 1 })).toBe('{\n  "a": 1\n}');
    });

    it('parses raw strings properly', () => {
      expect(parseValue('123')).toBe(123);
      expect(parseValue('true')).toBe(true);
      expect(parseValue('null')).toBe(null);
      expect(parseValue('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(parseValue('{"k":"v"}')).toEqual({ k: 'v' });
      expect(parseValue('plain string')).toBe('plain string');
    });
  });

  describe('runJavaScript', () => {
    const testCase: TestCaseItem = {
      id: 'tc-1',
      input: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
      expected: 6
    };

    it('executes a correct solution and marks it passed', async () => {
      const code = `
        export function trap(height: number[]): number {
          console.log("Analyzing heights: " + height.length);
          let left = 0, right = height.length - 1;
          let leftMax = height[left], rightMax = height[right];
          let water = 0;
          while (left < right) {
            if (leftMax < rightMax) {
              left++;
              leftMax = Math.max(leftMax, height[left]);
              water += leftMax - height[left];
            } else {
              right--;
              rightMax = Math.max(rightMax, height[right]);
              water += rightMax - height[right];
            }
          }
          return water;
        }
      `;

      const result = await runJavaScript(code, testCase);
      expect(result.status).toBe('passed');
      expect(result.actual).toBe(6);
      expect(result.stdout).toContain('Analyzing heights: 12');
      expect(result.runtimeMs).toBeGreaterThanOrEqual(0);
    });

    it('executes an incorrect solution and marks it failed', async () => {
      const code = `
        export function trap(height: number[]): number {
          return 0; // wrong
        }
      `;

      const result = await runJavaScript(code, testCase);
      expect(result.status).toBe('failed');
      expect(result.actual).toBe(0);
      expect(result.expected).toBe(6);
    });

    it('handles syntax or runtime exceptions gracefully', async () => {
      const code = `
        export function trap(height: number[]): number {
          throw new Error("Out of bounds index accessed");
        }
      `;

      const result = await runJavaScript(code, testCase);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Out of bounds index accessed');
    });

    it('executes Solution class methods correctly', async () => {
      const code = `
        class Solution {
          trap(height) {
            return 6;
          }
        }
      `;

      const result = await runJavaScript(code, testCase);
      expect(result.status).toBe('passed');
      expect(result.actual).toBe(6);
    });
  });

  describe('runPython', () => {
    const testCase: TestCaseItem = {
      id: 'tc-py-1',
      input: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
      expected: 6
    };

    it('evaluates passing python solution and captures print statements', async () => {
      const code = `
class Solution:
    def trap(self, height: list[int]) -> int:
        print("Starting two-pointer calculation")
        left, right = 0, len(height) - 1
        left_max, right_max = height[left], height[right]
        water = 0
        while left < right:
            if left_max < right_max:
                left += 1
                left_max = max(left_max, height[left])
                water += left_max - height[left]
            else:
                right -= 1
                right_max = max(right_max, height[right])
                water += right_max - height[right]
        return water
      `;

      const result = await runPython(code, testCase);
      expect(result.status).toBe('passed');
      expect(result.actual).toBe(6);
      expect(result.stdout).toContain('Starting two-pointer calculation');
    });

    it('evaluates failing python starter code', async () => {
      const code = `
class Solution:
    def trap(self, height: list[int]) -> int:
        return 0
      `;

      const result = await runPython(code, testCase);
      expect(result.status).toBe('failed');
      expect(result.actual).toBe(0);
    });
  });

  describe('runSQL', () => {
    const testCase: TestCaseItem = {
      id: 'tc-sql-1',
      input: null,
      expected: 6
    };

    it('runs valid SQL query and returns results', async () => {
      const sql = `
        SELECT 
            COALESCE(SUM(GREATEST(0, LEAST(left_max, right_max) - bar_height)), 0) AS trapped_water
        FROM (
            SELECT 
                position,
                bar_height,
                MAX(bar_height) OVER (ORDER BY position ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS left_max,
                MAX(bar_height) OVER (ORDER BY position ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS right_max
            FROM ElevationMap
        ) water_basin;
      `;

      const result = await runSQL(sql, testCase);
      expect(result.status).toBe('passed');
      expect(result.stdout).toContain('[SQL Engine]');
    });

    it('flags queries without SELECT as syntax error', async () => {
      const sql = `INSERT INTO records VALUES (1, 2);`;
      const result = await runSQL(sql, testCase);
      expect(result.status).toBe('error');
      expect(result.error).toContain('SELECT');
    });
  });

  describe('runGenericCompiled', () => {
    const testCase: TestCaseItem = {
      id: 'tc-cpp-1',
      input: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
      expected: 6
    };

    it('validates and runs C++ code', async () => {
      const cpp = `
        #include <vector>
        #include <algorithm>
        class Solution {
        public:
            int trap(std::vector<int>& height) {
                int left_max = 0, right_max = 0;
                int water = 0;
                return 6;
            }
        };
      `;

      const result = await runGenericCompiled('cpp', cpp, testCase);
      expect(result.status).toBe('passed');
      expect(result.stdout).toContain('[CPP Compiler]');
    });

    it('handles protobuf schema evaluation', async () => {
      const proto = `
        syntax = "proto3";
        service WaterTrappingService {
            rpc CalculateTrappedWater (WaterRequest) returns (WaterResponse);
        }
      `;

      const result = await runGenericCompiled('protobuf', proto, testCase);
      expect(result.status).toBe('passed');
    });
  });

  describe('runCode master dispatcher', () => {
    it('dispatches to language runner based on language id', async () => {
      const testCase: TestCaseItem = { id: 'tc-1', input: [1, 2], expected: 3 };
      const tsCode = `export function solve(arr) { return arr[0] + arr[1]; }`;

      const result = await runCode('typescript', tsCode, testCase);
      expect(result.status).toBe('passed');
      expect(result.actual).toBe(3);
    });
  });

  describe('runSubmissionSuite full test suite execution', () => {
    const testCases: TestCaseItem[] = [
      { id: 'tc-1', input: [1, 2], expected: 3 },
      { id: 'tc-2', input: [5, 5], expected: 10 }
    ];

    it('returns ACCEPTED when all test cases pass', async () => {
      const code = `export function add(arr) { return arr[0] + arr[1]; }`;
      const result = await runSubmissionSuite('typescript', code, testCases);

      expect(result.status).toBe('ACCEPTED');
      expect(result.passedCount).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.failedTestCase).toBeUndefined();
      expect(result.runtimeMs).toBeGreaterThanOrEqual(0);
      expect(result.memoryKb).toBeGreaterThan(0);
    });

    it('returns WRONG_ANSWER and diff for first failing test case', async () => {
      const code = `export function add(arr) { return 3; }`;
      const result = await runSubmissionSuite('typescript', code, testCases);

      expect(result.status).toBe('WRONG_ANSWER');
      expect(result.passedCount).toBe(1);
      expect(result.totalCount).toBe(2);
      expect(result.failedTestCase).toBeDefined();
      expect(result.failedTestCase?.testCaseIndex).toBe(1);
      expect(result.failedTestCase?.expected).toBe(10);
      expect(result.failedTestCase?.actual).toBe(3);
    });

    it('returns RUNTIME_ERROR when code throws an unhandled exception', async () => {
      const code = `export function add(arr) { throw new Error('Segmentation fault simulation'); }`;
      const result = await runSubmissionSuite('typescript', code, testCases);

      expect(result.status).toBe('RUNTIME_ERROR');
      expect(result.passedCount).toBe(0);
      expect(result.failedTestCase).toBeDefined();
      expect(result.failedTestCase?.error).toContain('Segmentation fault');
    });
  });
});

