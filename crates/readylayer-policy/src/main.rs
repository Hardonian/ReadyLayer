use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use readylayer_policy::{
    evaluate_policy, normalize_facts, normalize_rules, PolicyFacts, PolicyRuleSet,
};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "readylayer-policy", version, about = "Deterministic policy evaluator")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Evaluate(EvaluateArgs),
}

#[derive(Parser)]
struct EvaluateArgs {
    #[arg(long)]
    facts: PathBuf,
    #[arg(long)]
    rules: PathBuf,
    #[arg(long)]
    out: Option<PathBuf>,
    #[arg(long, default_value_t = false)]
    strict: bool,
    #[arg(long, default_value_t = false)]
    explain: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Evaluate(args) => run_evaluate(args),
    }
}

fn run_evaluate(args: EvaluateArgs) -> Result<()> {
    let facts_contents = fs::read_to_string(&args.facts)
        .with_context(|| format!("read facts file {:?}", args.facts))?;
    let rules_contents = fs::read_to_string(&args.rules)
        .with_context(|| format!("read rules file {:?}", args.rules))?;

    let mut facts: PolicyFacts = serde_json::from_str(&facts_contents)
        .with_context(|| "parse facts JSON".to_string())?;
    let is_yaml = args
        .rules
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| matches!(ext, "yaml" | "yml"))
        .unwrap_or(false);
    let mut rules: PolicyRuleSet = if is_yaml {
        serde_yaml::from_str(&rules_contents).with_context(|| "parse rules YAML".to_string())?
    } else {
        serde_json::from_str(&rules_contents).with_context(|| "parse rules JSON".to_string())?
    };

    normalize_facts(&mut facts);
    normalize_rules(&mut rules);

    let decision = evaluate_policy(&facts, &rules)?;
    let output = serde_json::to_string_pretty(&decision)?;

    if let Some(out) = &args.out {
        fs::write(out, &output).with_context(|| format!("write decision file {:?}", out))?;
    } else {
        println!("{output}");
    }

    if args.explain {
        print_explain(&decision);
    }

    if args.strict && decision.decision == readylayer_policy::Decision::Block {
        std::process::exit(2);
    }

    Ok(())
}

fn print_explain(decision: &readylayer_policy::PolicyDecision) {
    println!("Decision: {:?}", decision.decision);
    if decision.reasons.is_empty() {
        println!("No policy reasons matched.");
    } else {
        println!("Reasons:");
        for reason in &decision.reasons {
            println!("- {}: {}", reason.rule_id, reason.message);
        }
    }

    if !decision.required_actions.is_empty() {
        println!("Required actions:");
        for action in &decision.required_actions {
            println!("- {action}");
        }
    }
}
