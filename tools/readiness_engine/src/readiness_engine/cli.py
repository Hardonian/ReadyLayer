"""
CLI entry point for the readiness engine.
"""

import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from readiness_engine.engine import ReadinessEngine
from readiness_engine.models import Severity


console = Console()


def get_git_info(project_root: Path) -> tuple[str | None, str | None]:
    """Get git commit SHA and branch."""
    import subprocess
    
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            cwd=project_root,
            check=True,
        ).stdout.strip()
    except Exception:
        sha = None
    
    try:
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            cwd=project_root,
            check=True,
        ).stdout.strip()
    except Exception:
        branch = None
    
    return sha, branch


@click.command()
@click.option(
    "--project-root",
    "-p",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    default=".",
    help="Project root directory",
)
@click.option(
    "--output-dir",
    "-o",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default="./readiness-output",
    help="Output directory for reports",
)
@click.option(
    "--project-name",
    "-n",
    default="readylayer",
    help="Project name",
)
@click.option(
    "--fail-on-blocker/--no-fail-on-blocker",
    default=True,
    help="Exit with error code if blockers found",
)
@click.option(
    "--fail-on-high/--no-fail-on-high",
    default=True,
    help="Exit with error code if high severity found",
)
@click.option(
    "--skip-tools",
    help="Comma-separated list of tools to skip (eslint,typescript,build,vitest,playwright)",
)
def main(
    project_root: Path,
    output_dir: Path,
    project_name: str,
    fail_on_blocker: bool,
    fail_on_high: bool,
    skip_tools: str | None,
) -> int:
    """
    Readiness Engine - Judge codebase production-readiness.
    
    Runs all configured tools, normalizes findings, and generates
    machine- and human-readable reports.
    """
    console.print(Panel.fit(
        f"[bold blue]Readiness Engine v1.0.0[/bold blue]\n"
        f"Project: [bold]{project_name}[/bold]\n"
        f"Root: [dim]{project_root.resolve()}[/dim]",
        title="AI Code Readiness Platform",
        border_style="blue",
    ))
    
    # Get git info
    commit_sha, branch = get_git_info(project_root)
    if commit_sha:
        console.print(f"Git commit: [dim]{commit_sha[:8]}[/dim] on [dim]{branch}[/dim]")
    
    # Initialize engine
    engine = ReadinessEngine(project_name, project_root)
    
    # Skip tools if specified
    if skip_tools:
        skip_list = [t.strip() for t in skip_tools.split(",")]
        for tool in skip_list:
            if tool in engine.parsers:
                del engine.parsers[tool]
                console.print(f"[yellow]Skipping {tool}[/yellow]")
    
    # Run assessment
    console.print("\n[bold]Running assessment...[/bold]")
    
    try:
        verdict = engine.assess_readiness(commit_sha, branch)
    except Exception as e:
        console.print(f"[bold red]Assessment failed: {e}[/bold red]")
        return 1
    
    # Generate outputs
    console.print("[bold]Generating reports...[/bold]")
    try:
        outputs = engine.generate_outputs(verdict, output_dir)
    except Exception as e:
        console.print(f"[bold red]Report generation failed: {e}[/bold red]")
        return 1
    
    # Display results
    console.print("\n" + "=" * 60)
    
    if verdict.ready:
        console.print(Panel(
            "[bold green]✅ READY FOR PRODUCTION[/bold green]",
            border_style="green",
        ))
    else:
        console.print(Panel(
            "[bold red]❌ NOT READY FOR PRODUCTION[/bold red]\n"
            f"Blockers: {verdict.metrics.blocker_count} | "
            f"High: {verdict.metrics.high_count}",
            border_style="red",
        ))
    
    # Summary table
    table = Table(title="Findings Summary")
    table.add_column("Severity", style="bold")
    table.add_column("Count", justify="right")
    table.add_column("Indicator")
    
    severities = [
        ("BLOCKER", verdict.metrics.blocker_count, "🔴"),
        ("HIGH", verdict.metrics.high_count, "🟠"),
        ("MEDIUM", verdict.metrics.medium_count, "🟡"),
        ("LOW", verdict.metrics.low_count, "🟢"),
    ]
    
    for sev, count, indicator in severities:
        color = {
            "BLOCKER": "red",
            "HIGH": "orange3",
            "MEDIUM": "yellow",
            "LOW": "green",
        }.get(sev, "white")
        table.add_row(
            f"[{color}]{sev}[/{color}]",
            str(count),
            indicator,
        )
    
    table.add_row("[bold]Total[/bold]", str(verdict.metrics.total_findings), "")
    console.print(table)
    
    # By category
    if verdict.metrics.by_category:
        cat_table = Table(title="By Category")
        cat_table.add_column("Category")
        cat_table.add_column("Count", justify="right")
        
        for cat, count in sorted(verdict.metrics.by_category.items()):
            if count > 0:
                cat_table.add_row(cat, str(count))
        
        console.print(cat_table)
    
    # Output files
    console.print("\n[bold]Generated Reports:[/bold]")
    for name, path in outputs.items():
        console.print(f"  • [cyan]{name}:[/cyan] [dim]{path}[/dim]")
    
    # Determine exit code
    exit_code = 0
    if fail_on_blocker and verdict.metrics.blocker_count > 0:
        exit_code = 1
    if fail_on_high and verdict.metrics.high_count > 0:
        exit_code = 1
    
    if exit_code != 0:
        console.print(f"\n[bold red]Exiting with code {exit_code} due to readiness issues[/bold red]")
    
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
