# Agent Instructions

## Commit Message Rules

When creating or suggesting commits, use Conventional Commits. The format is:

```text
<type>[optional scope][!]: <summary>

[optional body]

[optional footer(s)]
```

### Header

- The header is required.
- Use lowercase `type` values from this list:
    - `feat`: a new user-visible capability or supported behavior.
    - `fix`: a bug fix.
    - `docs`: documentation-only changes.
    - `test`: adding or correcting tests.
    - `refactor`: code changes that neither fix a bug nor add a feature.
    - `perf`: performance improvements.
    - `build`: build system, package manager, or dependency changes.
    - `ci`: CI configuration or automation changes.
    - `chore`: maintenance that does not affect source, tests, docs, build, or CI.
    - `revert`: revert a previous commit.
- Use an optional lowercase scope when it helps identify the affected area.
  Prefer repo-specific scopes such as `cli`, `domain`, `importers`,
  `revolut`, `tests`, `data`, `deps`, or `config`.
- Omit the scope for broad changes or plain documentation updates.
- Mark breaking changes with `!` before the colon, for example
  `feat(importers)!: require normalized currency codes`.
- Write the summary in imperative present tense: `add`, not `added` or `adds`.
- Do not capitalize the first word of the summary unless it is a proper noun.
- Do not end the summary with a period.
- Keep the summary concise; prefer 72 characters or fewer.

### Body

- Add a body when the change is not self-evident from the header.
- Explain why the change is needed and what changed in behavior.
- Use imperative present tense, matching the summary style.
- Separate the body from the header with one blank line.
- Wrap body text to a readable width when practical.

### Footers

- Separate footers from the body with one blank line.
- Use git-trailer-style footers such as `Refs: #123`, `Closes: #123`, or
  `Reviewed-by: Name`.
- For breaking changes, include a `BREAKING CHANGE:` footer unless the header
  already describes the break clearly with `!`.
- `BREAKING CHANGE:` must be uppercase and followed by a concise explanation.
- Include migration notes in the body or breaking-change footer when callers
  need to update their usage.

### Reverts

For revert commits, use:

```text
revert: <header of reverted commit>

This reverts commit <sha>.

<reason for reverting>
```

### Examples

```text
feat(revolut): parse card payment rows
```

```text
fix(domain): preserve decimal precision for money values

Avoid converting imported amounts through floating point numbers so ledger
entries retain their source precision.
```

```text
refactor(importers): split row validation from mapping
```

```text
feat(importers)!: require explicit account currency

BREAKING CHANGE: importer callers must pass the account currency instead of
relying on a default.
```

These rules are based on Conventional Commits 1.0.0 and the Angular commit
message guidelines, adapted for this repository.
