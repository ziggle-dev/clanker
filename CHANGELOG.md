# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2024-07-25

### Added
- GitHub releases support for package manager
- Tar.gz extraction capability for tool packages
- Order-invariant diff algorithm for improved file editing (89% success rate)
- Dynamic tool loading from standalone JavaScript files
- Hot reload support with `--watch-tools` flag
- Tool manifest generation for built-in tools
- Support for multiple tool repositories
- Fallback to registry.json when releases not available

### Fixed
- Package manager now correctly fetches tools from GitHub releases
- Tool installation from tar.gz archives
- Registry caching mechanism
- Tool metadata conversion between registry formats

### Changed
- Registry now prioritizes GitHub releases over raw content
- Improved error handling for missing releases
- Better debug logging throughout the package manager

## [0.1.0] - 2024-07-20

### Added
- Initial release
- Core agent functionality with OpenAI-compatible API support
- Built-in tools: bash, file operations, search, todo management
- React-based terminal UI with Ink
- Package manager for tool discovery and installation
- Tool development framework
- Confirmation system for dangerous operations
- Debug logging and error tracking