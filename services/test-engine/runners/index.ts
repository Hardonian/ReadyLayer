import { TestRunnerAdapter } from './types';
import { GoTestRunner } from './go-runner';
import { RustTestRunner } from './rust-runner';
import { PythonTestRunner } from './python-runner';
import { JavaTestRunner } from './java-runner';

export * from './types';
export * from './go-runner';
export * from './rust-runner';
export * from './python-runner';
export * from './java-runner';

const runners: Record<string, TestRunnerAdapter> = {
  go: new GoTestRunner(),
  golang: new GoTestRunner(),
  rust: new RustTestRunner(),
  rs: new RustTestRunner(),
  python: new PythonTestRunner(),
  py: new PythonTestRunner(),
  pytest: new PythonTestRunner(),
  java: new JavaTestRunner(),
  mvn: new JavaTestRunner(),
};

export function getRunnerForLanguage(identifier: string): TestRunnerAdapter | null {
  const normalized = identifier.toLowerCase().trim();
  return runners[normalized] || null;
}
