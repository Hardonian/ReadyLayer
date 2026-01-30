# ReadyLayer SDKs

Multi-language SDKs for the ReadyLayer API.

## Languages Supported

- **TypeScript** (Node.js/Bun) - `@readylayer/sdk`
- **Python** - `readylayer`
- **Go** - `github.com/readylayer/sdk-go`
- **Java** - `io.readylayer:sdk`
- **C#** - `ReadyLayer.SDK`

## Quick Start

### TypeScript
```bash
npm install @readylayer/sdk
```

```typescript
import { ReadyLayerClient } from '@readylayer/sdk';

const client = new ReadyLayerClient({
  token: process.env.READYLAYER_API_TOKEN
});

const repos = await client.repos.list();
```

### Python
```bash
pip install readylayer
```

```python
from readylayer import ReadyLayerClient

client = ReadyLayerClient(token=os.environ['READYLAYER_API_TOKEN'])
repos = client.repos.list()
```

### Go
```bash
go get github.com/readylayer/sdk-go
```

```go
import "github.com/readylayer/sdk-go/readylayer"

client := readylayer.NewClient(os.Getenv("READYLAYER_API_TOKEN"))
repos, err := client.Repos.List(ctx, nil)
```

### Java
```xml
<dependency>
  <groupId>io.readylayer</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>
```

```java
ReadyLayerClient client = new ReadyLayerClient(System.getenv("READYLAYER_API_TOKEN"));
RepositoryList repos = client.repos().list();
```

### C#
```bash
dotnet add package ReadyLayer.SDK
```

```csharp
var client = new ReadyLayerClient(Environment.GetEnvironmentVariable("READYLAYER_API_TOKEN"));
var repos = await client.Repos.ListAsync();
```

## Documentation

- [TypeScript SDK](./typescript/README.md)
- [Python SDK](./python/README.md)
- [Go SDK](./go/README.md)
- [Java SDK](./java/README.md)
- [C# SDK](./csharp/README.md)

## API Version

These SDKs are generated from OpenAPI 3.1 spec version 1.0.0.
