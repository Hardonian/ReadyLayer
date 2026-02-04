import { stat, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const outputDir = resolve(process.argv[2] ?? process.env.RUNNER_OUTPUT_DIR ?? 'output_dir')

const getSize = async (path) => {
  const info = await stat(path)
  if (!info.isDirectory()) {
    return { bytes: info.size, files: 1 }
  }

  const entries = await readdir(path)
  const totals = await Promise.all(
    entries.map(async (entry) => getSize(join(path, entry)))
  )

  return totals.reduce(
    (acc, current) => ({
      bytes: acc.bytes + current.bytes,
      files: acc.files + current.files,
    }),
    { bytes: 0, files: 0 }
  )
}

const formatMb = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2))

const run = async () => {
  const runnerOutputPath = join(outputDir, 'runner_output.json')
  const evidencePath = join(outputDir, 'evidence')
  const logsPath = join(evidencePath, 'logs')
  const artifactsPath = join(evidencePath, 'artifacts')

  const [runnerOutput, evidence, logs, artifacts] = await Promise.all([
    getSize(runnerOutputPath).catch(() => ({ bytes: 0, files: 0 })),
    getSize(evidencePath).catch(() => ({ bytes: 0, files: 0 })),
    getSize(logsPath).catch(() => ({ bytes: 0, files: 0 })),
    getSize(artifactsPath).catch(() => ({ bytes: 0, files: 0 })),
  ])

  const result = {
    outputDir,
    runnerOutput: {
      bytes: runnerOutput.bytes,
      files: runnerOutput.files,
      megabytes: formatMb(runnerOutput.bytes),
    },
    evidence: {
      bytes: evidence.bytes,
      files: evidence.files,
      megabytes: formatMb(evidence.bytes),
    },
    logs: {
      bytes: logs.bytes,
      files: logs.files,
      megabytes: formatMb(logs.bytes),
    },
    artifacts: {
      bytes: artifacts.bytes,
      files: artifacts.files,
      megabytes: formatMb(artifacts.bytes),
    },
  }

  console.log(JSON.stringify(result, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
