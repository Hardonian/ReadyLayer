# ReadyLayer IntelliJ & JetBrains Plugin

Official ReadyLayer extension for JetBrains IDEs (IntelliJ IDEA, PyCharm, WebStorm, GoLand, CLion, RustRover).

## Features
- **Real-Time Editor Annotations**: Gutter icons and inline warnings for secret leaks, policy violations, and risky AI code.
- **Tools Menu Actions**: Right-click or use `Tools -> ReadyLayer -> Scan File` to run local AST analysis.
- **Zero-Latency CLI Execution**: Communicates with the local `readylayer` CLI binary.

## Building the Plugin
Requirements: JDK 17+ and Gradle 8+.

```bash
./gradlew buildPlugin
```

The packaged `.zip` distribution will be generated in `build/distributions/readylayer-jetbrains-1.0.0.zip`.

## Manual Installation
In IntelliJ IDEA:
1. Go to `Settings` -> `Plugins` -> `⚙️ Gear Icon` -> `Install Plugin from Disk...`
2. Select `readylayer-jetbrains-1.0.0.zip`.
3. Restart IDE.
