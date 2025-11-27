module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    // Ignore Copilot agent "Initial plan" commits
    (commit) => commit.startsWith('Initial plan'),
    // Ignore Dependabot "Bump X from Y to Z" commits
    (commit) => /^Bump .+ from .+ to .+/i.test(commit),
    // Ignore merge commits (already pass, but add for safety)
    (commit) => /^Merge /i.test(commit),
  ],
};
