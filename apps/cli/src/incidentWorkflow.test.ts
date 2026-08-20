import { describe, it, expect } from 'vitest';
import {
  correlateDeploymentWithCommit,
  buildHealthyReport,
  buildIncidentReport,
} from './incidentWorkflow.js';

describe('correlateDeploymentWithCommit', () => {
  it('picks the commit closest in time and assigns High confidence when very close', () => {
    const result = correlateDeploymentWithCommit('2025-01-01T12:00:00Z', [
      { sha: 'far', message: 'Old change', timestamp: '2024-12-29T12:00:00Z' }, // 3 days away
      { sha: 'close', message: 'Recent fix', timestamp: '2025-01-01T11:30:00Z' }, // 30 min away
    ]);

    expect(result.commit.sha).toBe('close');
    expect(result.confidence).toBe('High');
    expect(result.method).toBe('timestamp_proximity');
  });

  it('assigns Low confidence when the closest commit is still far away', () => {
    const result = correlateDeploymentWithCommit('2025-01-01T12:00:00Z', [
      { sha: 'far', message: 'Old change', timestamp: '2024-12-29T12:00:00Z' }, // 3 days away
    ]);

    expect(result.commit.sha).toBe('far');
    expect(result.confidence).toBe('Low');
  });
});

describe('buildHealthyReport', () => {
  it('reports no issue when the app is healthy', () => {
    const report = buildHealthyReport('my-app', { state: 'Running' });

    expect(report).toEqual({
      application: 'my-app',
      status: 'Running',
      issue: 'None detected',
      evidence: [
        'App Service status: Running',
        'No failed requests in the queried window',
        'No exceptions in the queried window',
      ],
      rootCause: 'No failures detected',
      confidence: 'N/A',
      recommendedAction: 'No action needed',
    });
  });
});

describe('buildIncidentReport', () => {
  it('recommends reviewing the PR when one is found', () => {
    const correlation = {
      commit: { sha: 'abc123', message: 'Merge pull request #42 from test/branch' },
      confidence: 'High',
      note: 'timestamp-based note',
    };
    const report = buildIncidentReport(
      'my-app',
      { state: 'Running' },
      [{ name: 'GET /api' }],
      [],
      { name: 'deploy-1', timestamp: '2025-01-01T12:00:00Z', state: 'Succeeded' },
      correlation,
      { number: 42, title: 'Fix database config' },
    );

    expect(report.rootCause).toContain('PR #42');
    expect(report.recommendedAction).toBe('Review the changes in PR #42');
  });

  it('recommends restarting the app when unhealthy and no PR is found', () => {
    const correlation = {
      commit: { sha: 'abc123', message: 'Some commit' },
      confidence: 'Low',
      note: 'timestamp-based note',
    };
    const report = buildIncidentReport(
      'my-app',
      { state: 'Stopped' },
      [],
      [],
      { name: 'deploy-1', timestamp: '2025-01-01T12:00:00Z', state: 'Succeeded' },
      correlation,
      null,
    );

    expect(report.recommendedAction).toBe('Consider restarting the App Service');
  });
});
