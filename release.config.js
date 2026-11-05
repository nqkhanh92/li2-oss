const branch = process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'main'
const isDevelopment = branch === 'development'

module.exports = {
  branches: [
    {
      name: 'development',
      prerelease: 'dev',
      channel: 'dev',
    },
    'main',
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '✨ Features' },
            { type: 'fix', section: '🐛 Bug Fixes' },
            { type: 'update', section: '🛠 Updates' },
            { type: 'refactor', section: '♻️ Code Refactoring' },
            { type: 'chore', section: '🧹 Chore' },
            { type: 'docs', section: '📚 Documentation' },
            { type: 'style', section: '🎨 Code Style' },
            { type: 'perf', section: '🚀 Performance Improvements' },
            { type: 'test', section: '🧪 Tests' },
            { type: 'ci', section: '🔧 CI/CD' },
            { type: 'build', section: '📦 Build' },
          ],
        },
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
        tarballDir: 'dist',
      },
    ],
    // Only generate changelog on main branch
    ...(!isDevelopment ? ['@semantic-release/changelog'] : []),
    // Disable git commits on development to prevent version drift
    ...(isDevelopment
      ? []
      : [
          [
            '@semantic-release/git',
            {
              assets: ['CHANGELOG.md', 'package.json', 'yarn.lock'],
              message: 'chore(release): ${nextRelease.version} [skip ci]',
            },
          ],
        ]),
    '@semantic-release/github',
  ],
}
