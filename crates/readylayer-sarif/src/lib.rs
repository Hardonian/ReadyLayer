use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const FINDINGS_SCHEMA_VERSION: &str = "1.0.0";
pub const SUMMARY_SCHEMA_VERSION: &str = "1.0.0";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NormalizedFindings {
    pub schema_version: String,
    #[serde(default)]
    pub tool: Option<String>,
    #[serde(default)]
    pub findings: Vec<Finding>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Finding {
    pub rule_id: String,
    pub severity: String,
    pub category: String,
    pub message: String,
    pub file: Option<String>,
    pub line: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FindingsSummary {
    pub schema_version: String,
    pub total: u32,
    pub by_severity: BTreeMap<String, u32>,
    pub by_category: BTreeMap<String, u32>,
}

#[derive(Debug, thiserror::Error)]
pub enum SarifError {
    #[error("findings schema version mismatch: expected {expected}, got {actual}")]
    FindingsSchemaVersionMismatch { expected: String, actual: String },
}

pub fn normalize_findings(findings: &mut NormalizedFindings) {
    findings.findings.sort_by(|a, b| {
        (
            &a.severity,
            &a.category,
            a.file.as_deref().unwrap_or(""),
            a.line.unwrap_or(0),
            &a.rule_id,
            &a.message,
        )
            .cmp(&(
                &b.severity,
                &b.category,
                b.file.as_deref().unwrap_or(""),
                b.line.unwrap_or(0),
                &b.rule_id,
                &b.message,
            ))
    });
}

pub fn generate_summary(findings: &NormalizedFindings) -> FindingsSummary {
    let mut by_severity: BTreeMap<String, u32> = BTreeMap::new();
    let mut by_category: BTreeMap<String, u32> = BTreeMap::new();

    for finding in &findings.findings {
        *by_severity.entry(finding.severity.to_lowercase()).or_insert(0) += 1;
        *by_category.entry(finding.category.to_lowercase()).or_insert(0) += 1;
    }

    FindingsSummary {
        schema_version: SUMMARY_SCHEMA_VERSION.to_string(),
        total: findings.findings.len() as u32,
        by_severity,
        by_category,
    }
}

pub fn generate_sarif(findings: &NormalizedFindings) -> Result<serde_json::Value, SarifError> {
    if findings.schema_version != FINDINGS_SCHEMA_VERSION {
        return Err(SarifError::FindingsSchemaVersionMismatch {
            expected: FINDINGS_SCHEMA_VERSION.to_string(),
            actual: findings.schema_version.clone(),
        });
    }

    let tool_name = findings.tool.clone().unwrap_or_else(|| "ReadyLayer".to_string());

    let rules: Vec<serde_json::Value> = findings
        .findings
        .iter()
        .map(|finding| {
            serde_json::json!({
                "id": finding.rule_id,
                "name": finding.category,
                "shortDescription": { "text": finding.message },
                "defaultConfiguration": { "level": sarif_level(&finding.severity) }
            })
        })
        .collect();

    let results: Vec<serde_json::Value> = findings
        .findings
        .iter()
        .map(|finding| {
            let mut result = serde_json::json!({
                "ruleId": finding.rule_id,
                "level": sarif_level(&finding.severity),
                "message": { "text": finding.message }
            });

            if let Some(file) = &finding.file {
                let line = finding.line.unwrap_or(1);
                let locations = serde_json::json!([
                    {
                        "physicalLocation": {
                            "artifactLocation": { "uri": file },
                            "region": { "startLine": line }
                        }
                    }
                ]);
                result["locations"] = locations;
            }

            result
        })
        .collect();

    Ok(serde_json::json!({
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": tool_name,
                        "rules": rules
                    }
                },
                "results": results
            }
        ]
    }))
}

fn sarif_level(severity: &str) -> &'static str {
    match severity.to_lowercase().as_str() {
        "critical" | "high" => "error",
        "medium" => "warning",
        _ => "note",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn generates_summary_counts() {
        let findings = NormalizedFindings {
            schema_version: FINDINGS_SCHEMA_VERSION.to_string(),
            tool: Some("ReadyLayer".to_string()),
            findings: vec![
                Finding {
                    rule_id: "A".to_string(),
                    severity: "high".to_string(),
                    category: "security".to_string(),
                    message: "Issue".to_string(),
                    file: Some("src/lib.rs".to_string()),
                    line: Some(2),
                },
                Finding {
                    rule_id: "B".to_string(),
                    severity: "low".to_string(),
                    category: "style".to_string(),
                    message: "Note".to_string(),
                    file: None,
                    line: None,
                },
            ],
        };

        let summary = generate_summary(&findings);
        assert_eq!(summary.total, 2);
        assert_eq!(summary.by_severity.get("high"), Some(&1));
        assert_eq!(summary.by_severity.get("low"), Some(&1));
    }

    #[test]
    fn generates_sarif() {
        let findings = NormalizedFindings {
            schema_version: FINDINGS_SCHEMA_VERSION.to_string(),
            tool: None,
            findings: vec![Finding {
                rule_id: "RL001".to_string(),
                severity: "critical".to_string(),
                category: "security".to_string(),
                message: "Problem".to_string(),
                file: Some("src/main.rs".to_string()),
                line: Some(4),
            }],
        };

        let sarif = generate_sarif(&findings).expect("sarif");
        assert_eq!(sarif["version"], "2.1.0");
        assert_eq!(sarif["runs"][0]["tool"]["driver"]["name"], "ReadyLayer");
    }
}
