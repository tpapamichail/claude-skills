# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CI workflow (`.github/workflows/ci.yml`) running `npm test`, `npm run check:generated`, and `npm run check:version` on every push and pull request
- Version sync scripts: `npm run bump:manifests` rewrites the manifest version fields from `package.json`, `npm run check:version` verifies that all version fields agree

### Changed

- `route_task` rejects a request `cwd` that resolves outside the session directory, including symlink escapes
- `route_task` caps the accumulated child-process output

## [1.1.3] - 2026-09-03

### Changed

- Streamline standing workflow rules

## [1.1.2] - 2026-09-03

### Added

- Add OMP workflow hook parity

## [1.1.1] - 2026-09-03

### Fixed

- Fix skill discovery in OMP

## [1.1.0] - 2026-09-03

### Added

- Add portable agent routing and rename the project to thomas-skills

### Changed

- Speed up the TDD cycle

### Fixed

- Fix marketplace publishing

[Unreleased]: https://github.com/tpapamichail/thomas-skills/compare/3cbd594...HEAD
[1.1.3]: https://github.com/tpapamichail/thomas-skills/compare/ee79bf3...3cbd594
[1.1.2]: https://github.com/tpapamichail/thomas-skills/compare/thomas-skills--v1.1.1...ee79bf3
[1.1.1]: https://github.com/tpapamichail/thomas-skills/compare/thomas-skills--v1.1.0...thomas-skills--v1.1.1
[1.1.0]: https://github.com/tpapamichail/thomas-skills/compare/claude-skills--v1.0.5...thomas-skills--v1.1.0
