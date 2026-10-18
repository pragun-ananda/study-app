import { describe, it, expect } from 'vitest';
import {
  extractDiagramInfo,
  generateDeterministicEvaluation,
  gradeSystemDesignArchitecture
} from '../../src/services/systemDesignGrader.js';

describe('Unit: System Design Architecture Grader (systemDesignGrader.ts)', () => {
  describe('extractDiagramInfo', () => {
    it('returns empty diagram info when diagramData is null or undefined', () => {
      expect(extractDiagramInfo(null)).toEqual({
        elementCount: 0,
        components: [],
        connectionsCount: 0,
        hasDiagram: false
      });
      expect(extractDiagramInfo(undefined)).toEqual({
        elementCount: 0,
        components: [],
        connectionsCount: 0,
        hasDiagram: false
      });
    });

    it('extracts non-deleted elements, labels, and arrows from Excalidraw JSON structure', () => {
      const mockDiagram = {
        elements: [
          {
            id: 'rect-1',
            type: 'rectangle',
            text: 'API Gateway (Envoy)',
            isDeleted: false
          },
          {
            id: 'arrow-1',
            type: 'arrow',
            isDeleted: false
          },
          {
            id: 'rect-2',
            type: 'rectangle',
            label: { text: 'Worker Microservice' },
            isDeleted: false
          },
          {
            id: 'rect-deleted',
            type: 'rectangle',
            text: 'Old Service',
            isDeleted: true
          }
        ]
      };

      const info = extractDiagramInfo(mockDiagram);
      expect(info.elementCount).toBe(3);
      expect(info.hasDiagram).toBe(true);
      expect(info.connectionsCount).toBe(1);
      expect(info.components).toContain('API Gateway (Envoy)');
      expect(info.components).toContain('Worker Microservice');
      expect(info.components).not.toContain('Old Service');
    });
  });

  describe('generateDeterministicEvaluation', () => {
    it('generates structured evaluation adhering to rubric and bounds score 0-100', () => {
      const evaluation = generateDeterministicEvaluation(
        {
          problemTitle: 'Distributed Stream Flood Monitoring',
          prompt: 'Scale water level computation to 10M sensor events/sec.',
          rubric: {
            stream_partitioning: 30,
            stateful_sliding_windows: 40,
            fault_tolerance_ha: 30
          },
          responseText:
            'We ingest events via Kafka partitioned by WatershedID. Flink processes stateful tumbling and sliding windows using RocksDB checkpoints for fault tolerance and failover.',
          diagramData: {
            elements: [
              { id: '1', type: 'rectangle', text: 'Kafka Partition', isDeleted: false },
              { id: '2', type: 'arrow', isDeleted: false },
              { id: '3', type: 'rectangle', text: 'Flink Stream Cluster', isDeleted: false }
            ]
          }
        },
        {
          elementCount: 3,
          components: ['Kafka Partition', 'Flink Stream Cluster'],
          connectionsCount: 1,
          hasDiagram: true
        }
      );

      expect(evaluation.score).toBeGreaterThanOrEqual(0);
      expect(evaluation.score).toBeLessThanOrEqual(100);
      expect(evaluation.rubricScores.stream_partitioning).toBeDefined();
      expect(evaluation.rubricScores.stream_partitioning.maxWeight).toBe(30);
      expect(evaluation.rubricScores.stateful_sliding_windows.maxWeight).toBe(40);
      expect(evaluation.scalabilityAssessment).toContain('scalability');
      expect(evaluation.singlePointsOfFailure.length).toBeGreaterThan(0);
      expect(evaluation.tradeOffCritique.length).toBeGreaterThan(0);
      expect(evaluation.actionableImprovements.length).toBeGreaterThan(0);
    });

    it('handles minimal/empty responses gracefully with lower scores and feedback', () => {
      const evaluation = generateDeterministicEvaluation(
        {
          prompt: 'Design a distributed cache',
          responseText: '',
          diagramData: null
        },
        { elementCount: 0, components: [], connectionsCount: 0, hasDiagram: false }
      );

      expect(evaluation.score).toBeLessThan(75);
      expect(evaluation.scalabilityAssessment).toContain('baseline conceptual structure');
      expect(evaluation.singlePointsOfFailure.length).toBeGreaterThan(0);
    });
  });

  describe('gradeSystemDesignArchitecture', () => {
    it('returns valid SystemDesignGradingResult in test environment', async () => {
      const result = await gradeSystemDesignArchitecture({
        problemTitle: 'Trapping Rain Water Stream Processing',
        prompt: 'Design a distributed real-time flood alert system.',
        rubric: {
          partitioning: 50,
          storage: 50
        },
        responseText: 'Kafka stream with distributed RocksDB storage replicas.',
        diagramData: {
          elements: [{ id: '1', type: 'rectangle', text: 'Kafka', isDeleted: false }]
        }
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.rubricScores.partitioning).toBeDefined();
      expect(result.rubricScores.storage).toBeDefined();
      expect(Array.isArray(result.singlePointsOfFailure)).toBe(true);
      expect(Array.isArray(result.actionableImprovements)).toBe(true);
    });
  });
});
