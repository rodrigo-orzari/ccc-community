# Workspace Rules & Preferences

- **Manual Git Push**: Do NOT automatically push commits to GitHub (`git push origin main`). Code edits and fixes should be tested locally. The user will manually review and push changes to GitHub when ready.
- **GitHub Actions Storage & Workflow Cleanup**: While building new features or making changes across CCC repositories (`ccc`, `ccc-community`, and `ccc-premium-services`), check for and delete old GitHub Actions workflow runs from the past week (e.g. using `gh run list` / `gh run delete`) to stay well under the 0.5 GB storage quota. If there is nothing to delete, continue committing code changes locally to the respective repository.
