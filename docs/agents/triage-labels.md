# Triage labels

The `triage` skill uses these 5 label strings to move issues through the triage state machine:

| Label | Purpose |
|-------|---------|
| `needs-triage` | Maintainer needs to evaluate the issue |
| `needs-info` | Waiting on the reporter for clarification |
| `ready-for-agent` | Fully specified — an AI agent can implement this autonomously |
| `ready-for-human` | Requires human implementation |
| `wontfix` | Will not be actioned |

These labels must exist in the GitHub repo before the triage skill can apply them.
