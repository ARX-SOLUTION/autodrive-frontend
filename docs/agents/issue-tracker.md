# Issue tracker: GitHub

Issues for this repo are tracked in GitHub Issues:

https://github.com/ARX-SOLUTION/autodrive-frontend/issues

Skills that interact with the issue tracker (`to-issues`, `triage`, `to-prd`, `qa`) use the `gh` CLI to create, read, and modify issues.

## Usage

```bash
# Create a new issue
gh issue create --title "..." --body "..."

# List open issues
gh issue list

# View an issue
gh issue view <number>

# Add a label
gh issue edit <number> --add-label "needs-triage"
```
