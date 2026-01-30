# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-30

### Added

- Initial release of the ReadyLayer TypeScript SDK
- Full API coverage for all endpoints:
  - Health checks (getHealth, getReady)
  - Repositories (list, get, create, update, delete, testConnection)
  - Policies (list, get, create, update, delete, validate, templates)
  - Policy Rules (list, create, update, delete)
  - Reviews (list, get, create)
  - Waivers (list, get, create, delete)
  - Evidence (list, get, export)
  - Runs (list, get, create, createSandbox)
  - Billing (getTier, createCheckoutSession)
  - Metrics (get)
  - API Keys (list, create, delete)
- Comprehensive error hierarchy with typed exceptions
- Automatic retry logic with exponential backoff and jitter
- Full TypeScript type definitions from OpenAPI spec
- Support for Bearer token authentication
- Configurable base URL for local development
- Pagination helpers
- Request timeout handling

[1.0.0]: https://github.com/readylayer/readylayer/releases/tag/v1.0.0
