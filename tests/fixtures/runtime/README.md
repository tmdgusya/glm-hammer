# Runtime fixtures

Sanitized live capture from the exact `zcode-cli` 0.15.2 artifact with SHA-256 `0f2ab95e39876fd639a15eb207fd42ca692d145f44ae5093714071a07de9c16e`.

The capture proves normal and compact `SessionStart`, `UserPromptSubmit`, `Stop`, one Agent/Task `PostToolUse`, and two parallel Agent/Task completions. Only field names and primitive type names are retained. Raw prompt, response, transcript, path, token, and secret values are not retained.

`AskUserQuestion` and `Bash` were not observed. They remain unsupported for release credit, question observation uses the approved `Stop` transcript shape, and F11 remains `OPEN`.
