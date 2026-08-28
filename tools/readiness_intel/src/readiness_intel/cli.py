"""
Readiness Intelligence CLI
"""

import json
import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from readiness_intel.analysis.historical import HistoricalAnalyzer
from readiness_intel.analysis.impact import ChangeImpactAnalyzer
from readiness_intel.analysis.scorecard import ScorecardGenerator
from readiness_intel.ci.optimizer import CIOptimizer
from readiness_intel.ingestion.loader import ArtifactIngestionPipeline
from readiness_intel.models import ReadinessVerdict

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def main():
    """ReadyLayer Readiness Intelligence - Predictive Code Risk & Change Intelligence"""
    pass


@main.command()
@click.argument("artifacts_path", type=click.Path(exists=True, path_type=Path))
@click.option("--repo-path", type=click.Path(exists=True, path_type=Path), help="Path to git repository")
@click.option("--since-days", default=30, help="Number of days to look back")
@click.option("--output", "-o", type=click.Path(path_type=Path), help="Output JSON file")
@click.option("--project", default="readylayer", help="Project name")
def ingest(
    artifacts_path: Path,
    repo_path: Optional[Path],
    since_days: int,
    output: Optional[Path],
    project: str,
):
    """Ingest readiness artifacts and build historical dataset."""
    console.print(f"[bold blue]Ingesting readiness artifacts from {artifacts_path}...[/]")

    pipeline = ArtifactIngestionPipeline(artifacts_path, repo_path)

    # Ingest from directory
    findings = pipeline.ingest_from_directory()

    # Optionally ingest from git history
    if repo_path:
        console.print(f"[blue]Ingesting from git history (last {since_days} days)...[/]")
        git_findings = pipeline.ingest_from_git_history(since_days)
        findings.extend(git_findings)

    # Build analyzer
    analyzer = HistoricalAnalyzer(findings)
    dataset = analyzer.build_dataset(project)

    # Show stats
    stats = pipeline.get_stats()
    console.print(f"[green]Loaded {stats['loaded']} artifacts with {stats['errors']} errors[/]")
    console.print(f"[green]Total findings: {len(findings)}[/]")
    console.print(f"[green]Unique files with issues: {len(dataset.file_profiles)}[/]")
    console.print(f"[green]Unique authors: {len(dataset.author_profiles)}[/]")

    # Save dataset if output specified
    if output:
        with open(output, 'w') as f:
            json.dump(dataset.model_dump(), f, indent=2, default=str)
        console.print(f"[green]Dataset saved to {output}[/]")

    return dataset


@main.command()
@click.argument("dataset_path", type=click.Path(exists=True, path_type=Path))
@click.option("--readiness", type=click.Path(exists=True, path_type=Path), help="Current readiness.json")
@click.option("--output-json", type=click.Path(path_type=Path), default="readiness_scorecard.json")
@click.option("--output-md", type=click.Path(path_type=Path), default="readiness_scorecard.md")
def scorecard(
    dataset_path: Path,
    readiness: Optional[Path],
    output_json: Path,
    output_md: Path,
):
    """Generate readiness scorecard from historical data."""
    console.print(f"[bold blue]Generating readiness scorecard...[/]")

    # Load dataset
    with open(dataset_path) as f:
        from readiness_intel.models import HistoricalDataset
        data = json.load(f)
        dataset = HistoricalDataset(**data)

    # Load current readiness if provided
    current_verdict = None
    if readiness:
        with open(readiness) as f:
            data = json.load(f)
            current_verdict = ReadinessVerdict(**data)

    # Generate scorecard
    generator = ScorecardGenerator(dataset)
    scorecard_data = generator.generate(current_verdict)

    # Export
    generator.export_json(scorecard_data, output_json)
    generator.export_markdown(scorecard_data, output_md)

    console.print(f"[green]Scorecard exported:[/]")
    console.print(f"  JSON: {output_json}")
    console.print(f"  Markdown: {output_md}")

    # Display summary
    display_scorecard_summary(scorecard_data)


@main.command()
@click.argument("dataset_path", type=click.Path(exists=True, path_type=Path))
@click.option("--repo-path", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--commit-sha", help="Commit SHA to analyze")
@click.option("--branch", default="main", help="Branch name")
@click.option("--author", help="Author of the change")
@click.option("--output", "-o", type=click.Path(path_type=Path), default="change_impact.json")
def analyze(
    dataset_path: Path,
    repo_path: Path,
    commit_sha: Optional[str],
    branch: str,
    author: Optional[str],
):
    """Analyze impact of code changes."""
    console.print(f"[bold blue]Analyzing change impact...[/]")

    # Load dataset
    with open(dataset_path) as f:
        from readiness_intel.models import HistoricalDataset
        data = json.load(f)
        dataset = HistoricalDataset(**data)

    # Create analyzer
    analyzer = ChangeImpactAnalyzer(dataset, repo_path)

    # Get diff
    if commit_sha:
        files_changed = analyzer.diff_parser.parse_from_git(commit_sha)
    else:
        # Parse from git diff in working directory
        import subprocess
        result = subprocess.run(
            ["git", "diff", "HEAD~1"],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        files_changed = analyzer.diff_parser.parse_diff(result.stdout)

    if not files_changed:
        console.print("[yellow]No changes detected[/]")
        return

    # Analyze
    author = author or "unknown"
    impact = analyzer.analyze_pr(files_changed, commit_sha or "HEAD", branch, author)

    # Display results
    display_impact_analysis(impact)


@main.command()
@click.argument("impact_path", type=click.Path(exists=True, path_type=Path))
@click.option("--output-dir", type=click.Path(path_type=Path), default=".")
@click.option("--github-output", type=click.Path(path_type=Path), help="GitHub Actions output file")
def optimize(
    impact_path: Path,
    output_dir: Path,
    github_output: Optional[Path],
):
    """Optimize CI based on change impact analysis."""
    console.print(f"[bold blue]Optimizing CI configuration...[/]")

    # Load impact analysis
    with open(impact_path) as f:
        from readiness_intel.models import ChangeImpactAnalysis
        data = json.load(f)
        impact = ChangeImpactAnalysis(**data)

    # Create optimizer
    optimizer = CIOptimizer(output_dir)

    # Generate optimization
    result = optimizer.optimize_for_pr(impact)

    # Display results
    display_ci_optimization(result)

    # Write GitHub Actions output if requested
    if github_output:
        with open(github_output, 'a') as f:
            f.write(f"risk_level={result['risk_level']}\n")
            f.write(f"test_tier={result['test_tier']}\n")
            f.write(f"estimated_duration={result['estimated_duration_minutes']}\n")
        console.print(f"[green]GitHub Actions output written to {github_output}[/]")


def display_scorecard_summary(scorecard):
    """Display scorecard summary in console."""
    # Create table
    table = Table(title="Readiness Scorecard Summary")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Readiness Score", f"{scorecard.current_readiness_score:.1f}/100")
    table.add_row("Status", scorecard.current_status)
    table.add_row("Trend", f"{scorecard.trend_direction} ({scorecard.trend_confidence:.0%} confidence)")
    table.add_row("Historical Runs", str(scorecard.total_historical_runs))
    table.add_row("Confidence Interval", f"[{scorecard.confidence_interval[0]:.1f}, {scorecard.confidence_interval[1]:.1f}]")

    console.print(table)

    # Risk areas
    if scorecard.predicted_risk_areas:
        console.print("\n[bold yellow]Predicted Risk Areas:[/]")
        for area in scorecard.predicted_risk_areas[:5]:
            console.print(f"  • {area}")


def display_impact_analysis(impact):
    """Display impact analysis in console."""
    # Risk level with color
    risk_colors = {
        "CRITICAL": "red",
        "HIGH": "orange3",
        "MEDIUM": "yellow",
        "LOW": "green",
    }
    risk_color = risk_colors.get(impact.overall_risk.value, "white")

    console.print(Panel(
        f"[bold {risk_color}]Risk Level: {impact.overall_risk.value}[/]\n"
        f"Confidence: {impact.risk_confidence:.0%}\n"
        f"Files Changed: {len(impact.files_changed)}\n"
        f"Predicted Readiness Delta: {impact.predicted_readiness_delta:+.1f}",
        title="Change Impact Analysis",
        border_style=risk_color
    ))

    console.print("\n[bold]Explanation:[/]")
    console.print(impact.explanation)

    # High risk files
    high_risk = [p for p in impact.file_predictions if p.risk_level.value in ["CRITICAL", "HIGH"]]
    if high_risk:
        console.print("\n[bold red]High Risk Files:[/]")
        for pred in high_risk:
            console.print(f"  • {pred.target} - {', '.join(pred.risk_factors[:2])}")


def display_ci_optimization(result):
    """Display CI optimization results."""
    table = Table(title="CI Optimization")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Risk Level", result['risk_level'])
    table.add_row("Test Tier", result['test_tier'])
    table.add_row("Estimated Duration", f"{result['estimated_duration_minutes']:.0f} min")
    table.add_row("Tests to Run", str(len(result['tests_to_run'])))
    table.add_row("Tests to Skip", str(len(result['tests_to_skip'])))

    console.print(table)

    # Calculate savings
    full_duration = 45  # Full suite
    savings = full_duration - result['estimated_duration_minutes']
    savings_pct = (savings / full_duration) * 100

    if savings > 0:
        console.print(f"\n[green]Estimated savings: {savings:.0f} minutes ({savings_pct:.0f}%)[/]")

    console.print(f"\n[dim]{result['explanation']}[/]")


if __name__ == "__main__":
    main()
