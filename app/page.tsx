export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">ReadyLayer</h1>
        <p className="text-xl mb-8">AI writes the code. ReadyLayer makes it production-ready.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Review Guard</h2>
            <p>AI-aware code review for security, quality, and style</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Test Engine</h2>
            <p>Automatic test generation and coverage enforcement</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Doc Sync</h2>
            <p>OpenAPI generation and documentation sync</p>
          </div>
        </div>
      </div>
    </main>
  )
}
