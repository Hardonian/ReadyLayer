import { redirect } from 'next/navigation';

/**
 * Metrics now live in the readiness command center so operators have one
 * canonical, explainable view instead of two incompatible telemetry contracts.
 */
export default function MetricsPage(): never {
  redirect('/dashboard/readiness');
}
