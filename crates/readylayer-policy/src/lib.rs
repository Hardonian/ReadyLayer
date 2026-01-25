use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

pub const POLICY_FACTS_SCHEMA_VERSION: &str = "1.0.0";
pub const POLICY_DECISION_SCHEMA_VERSION: &str = "1.0.0";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PolicyFacts {
    pub schema_version: String,
    #[serde(default)]
    pub tool_versions: BTreeMap<String, String>,
    #[serde(default)]
    pub repo: Option<RepoMetadata>,
    #[serde(default)]
    pub diff_summary: Option<DiffSummary>,
    #[serde(default)]
    pub check_results: Vec<CheckResult>,
    #[serde(default)]
    pub findings: Vec<Finding>,
    #[serde(default)]
    pub risk_signals: Option<RiskSignals>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RepoMetadata {
    pub name: Option<String>,
    pub owner: Option<String>,
    pub url: Option<String>,
    pub default_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiffSummary {
    #[serde(default)]
    pub changed_files: Vec<String>,
    #[serde(default)]
    pub languages: Vec<LanguageSummary>,
    pub total_files: Option<u32>,
    pub additions: Option<u32>,
    pub deletions: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LanguageSummary {
    pub name: String,
    pub files: Option<u32>,
    pub additions: Option<u32>,
    pub deletions: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CheckResult {
    pub check_id: String,
    pub status: String,
    pub exit_code: Option<i32>,
    #[serde(default)]
    pub metrics: BTreeMap<String, serde_json::Value>,
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
pub struct RiskSignals {
    pub dependency_changes: Option<bool>,
    pub permission_changes: Option<bool>,
    pub secrets_detected: Option<bool>,
    pub binary_changes: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PolicyRuleSet {
    pub policy_version: String,
    #[serde(default)]
    pub rules: Vec<PolicyRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PolicyRule {
    pub id: String,
    pub level: Decision,
    pub description: String,
    #[serde(default)]
    pub required_actions: Vec<String>,
    #[serde(default)]
    pub conditions: RuleConditions,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RuleConditions {
    pub block_on_secrets: Option<bool>,
    pub block_on_failed_checks: Option<bool>,
    pub block_on_severity: Option<String>,
    pub warn_on_dependency_changes: Option<bool>,
    pub warn_on_permission_changes: Option<bool>,
    pub warn_on_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Decision {
    #[default]
    Allow,
    Warn,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DecisionReason {
    pub rule_id: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PolicyDecision {
    pub schema_version: String,
    pub policy_version: String,
    pub decision: Decision,
    #[serde(default)]
    pub reasons: Vec<DecisionReason>,
    #[serde(default)]
    pub required_actions: Vec<String>,
    #[serde(default)]
    pub evidence_hashes: BTreeMap<String, String>,
    pub deterministic_statement: String,
}

#[derive(Debug, thiserror::Error)]
pub enum PolicyError {
    #[error("facts schema version mismatch: expected {expected}, got {actual}")]
    FactsSchemaVersionMismatch { expected: String, actual: String },
}

pub fn normalize_facts(facts: &mut PolicyFacts) {
    if let Some(diff_summary) = &mut facts.diff_summary {
        diff_summary.changed_files.sort();
        diff_summary
            .languages
            .sort_by(|a, b| a.name.cmp(&b.name));
    }

    facts
        .check_results
        .sort_by(|a, b| a.check_id.cmp(&b.check_id));
    facts.findings.sort_by(|a, b| {
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

pub fn normalize_rules(rules: &mut PolicyRuleSet) {
    rules.rules.sort_by(|a, b| a.id.cmp(&b.id));
    for rule in &mut rules.rules {
        rule.required_actions.sort();
    }
}

pub fn evaluate_policy(
    facts: &PolicyFacts,
    rules: &PolicyRuleSet,
) -> Result<PolicyDecision, PolicyError> {
    if facts.schema_version != POLICY_FACTS_SCHEMA_VERSION {
        return Err(PolicyError::FactsSchemaVersionMismatch {
            expected: POLICY_FACTS_SCHEMA_VERSION.to_string(),
            actual: facts.schema_version.clone(),
        });
    }

    let mut reasons: Vec<DecisionReason> = Vec::new();
    let mut required_actions: Vec<String> = Vec::new();

    for rule in &rules.rules {
        if rule_matches(rule, facts) {
            reasons.push(DecisionReason {
                rule_id: rule.id.clone(),
                message: rule.description.clone(),
            });
            required_actions.extend(rule.required_actions.clone());
        }
    }

    reasons.sort_by(|a, b| (a.rule_id.as_str(), a.message.as_str()).cmp(&(b.rule_id.as_str(), b.message.as_str())));
    required_actions.sort();
    required_actions.dedup();

    let decision = reasons
        .iter()
        .map(|reason| {
            rules
                .rules
                .iter()
                .find(|rule| rule.id == reason.rule_id)
                .map(|rule| rule.level.clone())
                .unwrap_or(Decision::Allow)
        })
        .max()
        .unwrap_or(Decision::Allow);

    let mut evidence_hashes = BTreeMap::new();
    evidence_hashes.insert("facts_sha256".to_string(), hash_json(facts));
    evidence_hashes.insert("rules_sha256".to_string(), hash_json(rules));

    Ok(PolicyDecision {
        schema_version: POLICY_DECISION_SCHEMA_VERSION.to_string(),
        policy_version: rules.policy_version.clone(),
        decision,
        reasons,
        required_actions,
        evidence_hashes,
        deterministic_statement: "Deterministic evaluation: sorted inputs and rules, stable rule ordering, and SHA-256 evidence hashes."
            .to_string(),
    })
}

fn rule_matches(rule: &PolicyRule, facts: &PolicyFacts) -> bool {
    let conditions = &rule.conditions;

    if conditions.block_on_secrets.unwrap_or(false)
        && facts
            .risk_signals
            .as_ref()
            .and_then(|signals| signals.secrets_detected)
            .unwrap_or(false)
    {
        return true;
    }

    if conditions.block_on_failed_checks.unwrap_or(false)
        && facts
            .check_results
            .iter()
            .any(|check| check.status.eq_ignore_ascii_case("fail"))
    {
        return true;
    }

    if let Some(severity) = &conditions.block_on_severity {
        if facts
            .findings
            .iter()
            .any(|finding| finding.severity.eq_ignore_ascii_case(severity))
        {
            return true;
        }
    }

    if conditions.warn_on_dependency_changes.unwrap_or(false)
        && facts
            .risk_signals
            .as_ref()
            .and_then(|signals| signals.dependency_changes)
            .unwrap_or(false)
    {
        return true;
    }

    if conditions.warn_on_permission_changes.unwrap_or(false)
        && facts
            .risk_signals
            .as_ref()
            .and_then(|signals| signals.permission_changes)
            .unwrap_or(false)
    {
        return true;
    }

    if let Some(category) = &conditions.warn_on_category {
        if facts
            .findings
            .iter()
            .any(|finding| finding.category.eq_ignore_ascii_case(category))
        {
            return true;
        }
    }

    false
}

fn hash_json<T: Serialize>(value: &T) -> String {
    let serialized = serde_json::to_vec(value).unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(&serialized);
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    fn sample_facts() -> PolicyFacts {
        PolicyFacts {
            schema_version: POLICY_FACTS_SCHEMA_VERSION.to_string(),
            check_results: vec![CheckResult {
                check_id: "tests".to_string(),
                status: "fail".to_string(),
                exit_code: Some(1),
                metrics: BTreeMap::new(),
            }],
            findings: vec![Finding {
                rule_id: "secret".to_string(),
                severity: "critical".to_string(),
                category: "secret".to_string(),
                message: "Secret detected".to_string(),
                file: Some(".env".to_string()),
                line: Some(1),
            }],
            risk_signals: Some(RiskSignals {
                secrets_detected: Some(true),
                dependency_changes: Some(false),
                permission_changes: Some(false),
                binary_changes: Some(false),
            }),
            ..PolicyFacts::default()
        }
    }

    fn sample_rules() -> PolicyRuleSet {
        PolicyRuleSet {
            policy_version: "1.0.0".to_string(),
            rules: vec![PolicyRule {
                id: "block-secrets".to_string(),
                level: Decision::Block,
                description: "Secrets must block".to_string(),
                required_actions: vec!["Rotate secrets".to_string()],
                conditions: RuleConditions {
                    block_on_secrets: Some(true),
                    ..RuleConditions::default()
                },
            }],
        }
    }

    #[test]
    fn evaluates_block() {
        let facts = sample_facts();
        let rules = sample_rules();
        let decision = evaluate_policy(&facts, &rules).expect("decision");

        assert_eq!(decision.decision, Decision::Block);
        assert_eq!(decision.reasons.len(), 1);
        assert_eq!(decision.required_actions, vec!["Rotate secrets".to_string()]);
    }
}
