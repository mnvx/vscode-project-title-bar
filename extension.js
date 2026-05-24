const vscode = require('vscode');

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
    statusBarItem
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
