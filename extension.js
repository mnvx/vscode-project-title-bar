const vscode = require('vscode');
const fs = require('fs');
const nodePath = require('path');

let statusBarItem;

function getProjectName() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].name;
  }
  return null;
}

// String -> hue 0..360
function hashToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0) % 360;
}

// HSL -> #rrggbb
function hslToHex(h, s, l) {
  h = h / 360;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function isDarkTheme() {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Dark
      || kind === vscode.ColorThemeKind.HighContrast;
}

function getAutoColor(projectName) {
  const hue = hashToHue(projectName);
  const dark = isDarkTheme();
  // Dark theme:  light pastels  (s=65%, l=72%)
  // Light theme: deep saturated (s=75%, l=30%)
  return dark
    ? hslToHex(hue, 0.65, 0.72)
    : hslToHex(hue, 0.75, 0.30);
}

function updateStatusBar() {
  const config = vscode.workspace.getConfiguration('projectTitleBar');
  const prefix = config.get('prefix', '');
  const manualColor = config.get('color', '');
  const projectName = getProjectName();

  if (projectName) {
    statusBarItem.text = `${prefix}${projectName}`;
    statusBarItem.tooltip = `Project: ${projectName}`;
    statusBarItem.color = manualColor || getAutoColor(projectName);
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

// _workbench.getRecentlyOpened returns plain URI component objects, not vscode.Uri instances.
function reviveUri(raw) {
  if (!raw) return null;
  if (raw instanceof vscode.Uri) return raw;
  try {
    return vscode.Uri.from({
      scheme: raw.scheme || 'file',
      authority: raw.authority || '',
      path: raw.path || '',
      query: raw.query || '',
      fragment: raw.fragment || '',
    });
  } catch {
    return null;
  }
}

// Writes a colored circle SVG to the extension's storage dir and returns a file Uri.
// Falls back to a ThemeIcon if the file can't be written.
function getColorIconPath(storageDir, hexColor) {
  const filename = `dot-${hexColor.replace('#', '')}.svg`;
  const fullPath = nodePath.join(storageDir, filename);
  try {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(storageDir, { recursive: true });
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">`
               + `<circle cx="8" cy="8" r="7" fill="${hexColor}"/></svg>`;
      fs.writeFileSync(fullPath, svg, 'utf8');
    }
    return vscode.Uri.file(fullPath);
  } catch {
    return new vscode.ThemeIcon('circle-filled');
  }
}

async function openRecentWithColors(context) {
  let recent;
  try {
    recent = await vscode.commands.executeCommand('_workbench.getRecentlyOpened');
  } catch (err) {
    vscode.window.showErrorMessage(`Project Title Bar: could not load recent projects — ${err?.message ?? err}`);
    return;
  }

  const workspaces = recent?.workspaces ?? [];
  if (!workspaces.length) {
    vscode.window.showInformationMessage('No recent projects found.');
    return;
  }

  const storageDir = context.globalStorageUri.fsPath;
  const items = [];

  for (const entry of workspaces) {
    let name, targetUri, detail;

    if (entry.folderUri) {
      const uri = reviveUri(entry.folderUri);
      if (!uri) continue;
      name = entry.label || uri.path.split('/').pop() || uri.path;
      detail = uri.fsPath || uri.path;
      targetUri = uri;
    } else if (entry.workspace?.configPath) {
      const uri = reviveUri(entry.workspace.configPath);
      if (!uri) continue;
      const basename = uri.path.split('/').pop() || '';
      name = entry.label || basename.replace(/\.code-workspace$/, '') || uri.path;
      detail = uri.fsPath || uri.path;
      targetUri = uri;
    } else {
      continue;
    }

    const color = getAutoColor(name);
    const iconPath = getColorIconPath(storageDir, color);

    items.push({ label: name, description: detail, iconPath, targetUri });
  }

  if (!items.length) {
    vscode.window.showInformationMessage('No recent projects found.');
    return;
  }

  const selected = await vscode.window.showQuickPick(items, {
    title: 'Open Recent',
    placeHolder: 'Type to filter recent projects…',
    matchOnDescription: true,
  });

  if (selected) {
    await vscode.commands.executeCommand('vscode.openFolder', selected.targetUri, false);
  }
}

function activate(context) {
  // Priority 10001: just after Remote indicator (><), before branch name (~10000)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10001
  );

  updateStatusBar();

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => updateStatusBar()),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('projectTitleBar')) updateStatusBar();
    }),
    vscode.window.onDidChangeActiveColorTheme(() => updateStatusBar()),
    vscode.commands.registerCommand('projectTitleBar.openRecent', () =>
      openRecentWithColors(context)
    ),
    statusBarItem
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
