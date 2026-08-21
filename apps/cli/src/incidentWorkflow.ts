export {
  correlateDeploymentWithCommit,
  buildHealthyReport,
  buildIncidentReport,
  printIncidentReport,
};

function correlateDeploymentWithCommit(
  deploymentTimestamp: string,
  commits: { sha: string; message: string; author?: string; timestamp: string }[],
) {
  const deploymentTime = new Date(deploymentTimestamp).getTime();

  let closestCommit = commits[0];
  let smallestDiffHours =
    Math.abs(new Date(commits[0].timestamp).getTime() - deploymentTime) / (1000 * 60 * 60);

  for (const commit of commits) {
    const diffHours =
      Math.abs(new Date(commit.timestamp).getTime() - deploymentTime) / (1000 * 60 * 60);
    if (diffHours < smallestDiffHours) {
      closestCommit = commit;
      smallestDiffHours = diffHours;
    }
  }

  const confidence = smallestDiffHours < 1 ? 'High' : smallestDiffHours < 24 ? 'Medium' : 'Low';

  return {
    commit: closestCommit,
    confidence,
    method: 'timestamp_proximity' as const,
    note: 'This correlation is based on deployment/commit timestamp proximity, not an exact commit reference. Azure Resource Manager deployments do not carry a Git commit SHA.',
  };
}

function buildHealthyReport(appName: string, status: { state: string }) {
  return {
    application: appName,
    status: status.state,
    issue: 'None detected',
    evidence: [
      'App Service status: Running',
      'No failed requests in the queried window',
      'No exceptions in the queried window',
    ],
    rootCause: 'No failures detected',
    confidence: 'N/A',
    recommendedAction: 'No action needed',
  };
}

function buildIncidentReport(
  appName: string,
  status: { state: string },
  failedRequests: unknown[],
  exceptions: unknown[],
  deployment: { name: string; timestamp: string; state: string },
  correlation: { commit: { sha: string; message: string }; confidence: string; note: string },
  pullRequest: { number: number; title: string } | null,
) {
  const evidence = [
    `App Service status: ${status.state}`,
    `Failed requests: ${failedRequests.length}`,
    `Exceptions: ${exceptions.length}`,
    `Most recent deployment: ${deployment.name} (${deployment.state}) at ${deployment.timestamp}`,
    `Closest commit by time: ${correlation.commit.sha} — "${correlation.commit.message.split('\n')[0]}"`,
  ];

  const rootCause = pullRequest
    ? `Likely related to PR #${pullRequest.number} ("${pullRequest.title}"), correlated by timestamp proximity (${correlation.confidence} confidence). ${correlation.note}`
    : `A recent deployment and nearby commit were found, but no associated pull request could be identified. ${correlation.note}`;

  return {
    application: appName,
    status: status.state,
    issue: `${failedRequests.length} failed request(s), ${exceptions.length} exception(s) detected`,
    evidence,
    rootCause,
    confidence: correlation.confidence,
    recommendedAction: pullRequest
      ? `Review the changes in PR #${pullRequest.number}${status.state !== 'Running' ? ', and consider restarting the App Service' : ''}`
      : status.state !== 'Running'
        ? 'Consider restarting the App Service'
        : 'Investigate recent commits manually',
  };
}

function printIncidentReport(report: {
  application: string;
  status: string;
  issue: string;
  evidence: string[];
  rootCause: string;
  confidence: string;
  recommendedAction: string;
}) {
  console.log('Incident Investigation');
  console.log('=======================');
  console.log('');
  console.log('Application:');
  console.log(report.application);
  console.log('');
  console.log('Status:');
  console.log(report.status);
  console.log('');
  console.log('Issue:');
  console.log(report.issue);
  console.log('');
  console.log('Evidence:');
  for (const line of report.evidence) {
    console.log(`- ${line}`);
  }
  console.log('');
  console.log('Likely Cause:');
  console.log(report.rootCause);
  console.log('');
  console.log('Confidence:');
  console.log(report.confidence);
  console.log('');
  console.log('Recommended Action:');
  console.log(report.recommendedAction);
}
