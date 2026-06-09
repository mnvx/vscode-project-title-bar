# Project Title Bar

Shows the current project (workspace root) name in the VS Code status bar, right after the "Open Remote Window" (`><`) button.

## Installation

### Option A — install from folder (development mode)
1. Copy the `project-title-bar` folder to:
   - **Windows:** `%USERPROFILE%\.vscode\extensions\`
   - **macOS/Linux:** `~/.vscode/extensions/`
2. Restart VS Code.

### Option B — package as .vsix
```bash
npm install -g @vscode/vsce
cd project-title-bar
vsce package
code --install-extension project-title-bar-1.0.0.vsix
```

## Settings

| Setting | Default | Description |
|---|---|---|
| `projectTitleBar.prefix` | `""` | Text/emoji before the project name, e.g. `"📁 "` |
| `projectTitleBar.color` | `""` | Color of the text, e.g. `"#ffcc00"` |

Example `settings.json`:
```json
{
  "projectTitleBar.prefix": "📁 ",
  "projectTitleBar.color": "#ffcc00"
}
```

 ## Deployment

Update version in package.json

```bash
make
```

And upload new version here:

https://marketplace.visualstudio.com/manage/publishers/isitup
