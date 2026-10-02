/**
 * Bitbucket Code Insights & Pull Request Annotations
 *
 * Implements Bitbucket REST API v2.0 Code Insights specification:
 * - Report creation/updates: PUT /2.0/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{key}
 * - Report annotations: POST /2.0/repositories/{workspace}/{repo_slug}/commit/{commit}/reports/{key}/annotations
 */

export interface BitbucketReportData {
  title: string;
  type: 'BOOLEAN' | 'DATE' | 'DURATION' | 'LINK' | 'NUMBER' | 'PERCENTAGE' | 'TEXT';
  value: string | number | boolean;
}

export interface BitbucketReportInput {
  title: string;
  details?: string;
  report_type: 'SECURITY' | 'COVERAGE' | 'TEST' | 'BUG';
  reporter?: string;
  result: 'PASSED' | 'FAILED' | 'PENDING';
  data?: BitbucketReportData[];
  link?: string;
  logo_url?: string;
}

export interface BitbucketReportResponse extends BitbucketReportInput {
  uuid?: string;
  key: string;
  created_on?: string;
  updated_on?: string;
}

export interface BitbucketAnnotationInput {
  external_id: string;
  title: string;
  annotation_type: 'VULNERABILITY' | 'CODE_SMELL' | 'BUG';
  summary: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  path: string;
  line?: number;
  link?: string;
}

export interface BitbucketAnnotationResponse extends BitbucketAnnotationInput {
  uuid?: string;
  created_on?: string;
  updated_on?: string;
}

export interface PolicyFinding {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message?: string;
  filePath?: string;
  lineNumber?: number;
  url?: string;
}

export interface PostInsightsParams {
  workspace: string;
  repoSlug: string;
  commitSha: string;
  token: string;
  reportKey?: string;
  findings: PolicyFinding[];
  dashboardUrl?: string;
}

export class BitbucketCodeInsights {
  private readonly baseUrl = 'https://api.bitbucket.org/2.0';

  private trustedUrl(rawUrl: string): string {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.origin !== new URL(this.baseUrl).origin) {
      throw new Error('Refusing to send Bitbucket credentials to an untrusted origin');
    }
    return url.toString();
  }

  /**
   * Create or update a Code Insights report for a specific commit.
   */
  async createOrUpdateReport(
    workspace: string,
    repoSlug: string,
    commitSha: string,
    reportKey: string,
    report: BitbucketReportInput,
    token: string
  ): Promise<BitbucketReportResponse> {
    const encodedKey = encodeURIComponent(reportKey);
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/commit/${commitSha}/reports/${encodedKey}`;

    const payload = {
      title: report.title,
      details: report.details || 'ReadyLayer policy compliance analysis',
      report_type: report.report_type,
      reporter: report.reporter || 'ReadyLayer',
      result: report.result,
      data: report.data || [],
      link: report.link,
      logo_url: report.logo_url,
    };

    const response = await fetch(this.trustedUrl(url), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Bitbucket Code Insights Report failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as BitbucketReportResponse;
  }

  /**
   * Bulk-post annotations for a Code Insights report (max 100 per request).
   */
  async createAnnotations(
    workspace: string,
    repoSlug: string,
    commitSha: string,
    reportKey: string,
    annotations: BitbucketAnnotationInput[],
    token: string
  ): Promise<BitbucketAnnotationResponse[]> {
    if (annotations.length === 0) {
      return [];
    }

    const encodedKey = encodeURIComponent(reportKey);
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/commit/${commitSha}/reports/${encodedKey}/annotations`;

    // Bitbucket API accepts an array of up to 100 annotations
    const batch = annotations.slice(0, 100);

    const response = await fetch(this.trustedUrl(url), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Bitbucket Code Insights Annotations failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as BitbucketAnnotationResponse[];
  }

  /**
   * High-level helper: Evaluates policy findings and publishes both report + inline annotations.
   */
  async postPolicyEvaluationInsights(params: {
    workspace: string;
    repoSlug: string;
    commitSha: string;
    token: string;
    reportKey?: string;
    findings: PolicyFinding[];
    dashboardUrl?: string;
  }): Promise<{ report: BitbucketReportResponse; annotationsCreated: number }> {
    const reportKey = params.reportKey || 'readylayer-governance';
    const violations = params.findings.filter((f) => !f.passed);
    const passedCount = params.findings.length - violations.length;
    const isPassing = violations.length === 0;

    const reportInput: BitbucketReportInput = {
      title: 'ReadyLayer Policy Verification',
      details: isPassing
        ? `All ${params.findings.length} governance policies verified successfully.`
        : `${violations.length} policy violation(s) detected in AI-assisted code.`,
      report_type: 'SECURITY',
      reporter: 'ReadyLayer',
      result: isPassing ? 'PASSED' : 'FAILED',
      link: params.dashboardUrl,
      data: [
        { title: 'Total Evaluated', type: 'NUMBER', value: params.findings.length },
        { title: 'Passed', type: 'NUMBER', value: passedCount },
        { title: 'Violations', type: 'NUMBER', value: violations.length },
      ],
    };

    const report = await this.createOrUpdateReport(
      params.workspace,
      params.repoSlug,
      params.commitSha,
      reportKey,
      reportInput,
      params.token
    );

    const annotations: BitbucketAnnotationInput[] = violations
      .filter((v) => v.filePath)
      .map((v, index) => ({
        external_id: `rl-${v.ruleId}-${index}`,
        title: v.ruleName,
        annotation_type: v.severity === 'CRITICAL' ? 'VULNERABILITY' : 'CODE_SMELL',
        summary: v.message || `Policy violation on ${v.ruleName}`,
        severity: v.severity || 'HIGH',
        path: v.filePath!,
        line: v.lineNumber || 1,
        link: v.url || params.dashboardUrl,
      }));

    let annotationsCreated = 0;
    if (annotations.length > 0) {
      const res = await this.createAnnotations(
        params.workspace,
        params.repoSlug,
        params.commitSha,
        reportKey,
        annotations,
        params.token
      );
      annotationsCreated = res.length;
    }

    return {
      report,
      annotationsCreated,
    };
  }
}

export const bitbucketCodeInsights = new BitbucketCodeInsights();
