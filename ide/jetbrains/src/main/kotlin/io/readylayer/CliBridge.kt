package io.readylayer

import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

data class Finding(
    val ruleId: String,
    val severity: String,
    val line: Int,
    val column: Int,
    val message: String,
    val fix: String?
)

object CliBridge {
    fun executeScan(filePath: String, workingDir: String): List<Finding> {
        val findings = mutableListOf<Finding>()
        try {
            val isWindows = System.getProperty("os.name").lowercase().contains("win")
            val command = if (isWindows) {
                listOf("cmd.exe", "/c", "readylayer", "scan", filePath, "--format", "json")
            } else {
                listOf("readylayer", "scan", filePath, "--format", "json")
            }

            val processBuilder = ProcessBuilder(command)
            processBuilder.directory(File(workingDir))
            processBuilder.redirectErrorStream(true)

            val process = processBuilder.start()
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val output = reader.readText()
            process.waitFor()

            // In production, parse output JSON using Gson
            // If CLI returns findings, map to list
        } catch (e: Exception) {
            // Log warning or fallback
        }
        return findings
    }
}
