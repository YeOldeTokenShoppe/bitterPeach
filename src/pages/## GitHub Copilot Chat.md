## GitHub Copilot Chat

- Extension Version: 0.22.4 (prod)
- VS Code: vscode/1.95.3
- OS: Mac

## Network

User Settings:

```json
  "github.copilot.advanced": {
    "debug.useElectronFetcher": true,
    "debug.useNodeFetcher": false
  }
```

Connecting to https://api.github.com:

- DNS ipv4 Lookup: 140.82.116.5 (17 ms)
- DNS ipv6 Lookup: ::ffff:140.82.116.5 (7 ms)
- Electron Fetcher (configured): HTTP 200 (224 ms)
- Node Fetcher: HTTP 200 (104 ms)
- Helix Fetcher: HTTP 200 (156 ms)

Connecting to https://api.individual.githubcopilot.com/_ping:

- DNS ipv4 Lookup: 140.82.114.21 (1 ms)
- DNS ipv6 Lookup: ::ffff:140.82.114.21 (1 ms)
- Electron Fetcher (configured): HTTP 200 (80 ms)
- Node Fetcher: HTTP 200 (256 ms)
- Helix Fetcher: HTTP 200 (257 ms)

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).
