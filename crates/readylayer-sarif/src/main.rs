use anyhow::{Context, Result};
use clap::Parser;
use readylayer_sarif::{generate_sarif, generate_summary, normalize_findings, NormalizedFindings};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "readylayer-sarif", version, about = "Generate SARIF and summary JSON")]
struct Cli {
    #[arg(long)]
    input: PathBuf,
    #[arg(long)]
    sarif: PathBuf,
    #[arg(long)]
    summary: PathBuf,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    let findings_contents = fs::read_to_string(&cli.input)
        .with_context(|| format!("read findings file {:?}", cli.input))?;
    let mut findings: NormalizedFindings = serde_json::from_str(&findings_contents)
        .with_context(|| "parse findings JSON".to_string())?;

    normalize_findings(&mut findings);

    let sarif = generate_sarif(&findings)?;
    let summary = generate_summary(&findings);

    fs::write(&cli.sarif, serde_json::to_string_pretty(&sarif)?)
        .with_context(|| format!("write sarif file {:?}", cli.sarif))?;
    fs::write(
        &cli.summary,
        serde_json::to_string_pretty(&summary)?,
    )
    .with_context(|| format!("write summary file {:?}", cli.summary))?;

    Ok(())
}
