import * as vscode from "vscode";
import * as path from "path";
import { TextEncoder } from "util";

let myStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // --- INITIALIZE STATUS BAR ---
  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  myStatusBarItem.command = "global-notes.showFolder";
  context.subscriptions.push(myStatusBarItem);
  updateStatusBar(context);

  // --- COMMAND: SET STORAGE FOLDER ---
  let setFolder = vscode.commands.registerCommand(
    "global-notes.setFolder",
    async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select Notes Root Folder",
      });

      if (folderUri && folderUri[0]) {
        await context.globalState.update(
          "notesFolderPath",
          folderUri[0].fsPath
        );
        vscode.window.showInformationMessage(
          `Notes folder set to: ${folderUri[0].fsPath}`
        );
        updateStatusBar(context);
      }
    }
  );

  // --- COMMAND: ADD NEW NOTE ---
  let addNote = vscode.commands.registerCommand(
    "global-notes.addNote",
    async () => {
      const rootPath = context.globalState.get<string>("notesFolderPath");

      if (!rootPath) {
        promptSetFolder();
        return;
      }

      const fileNameInput = await vscode.window.showInputBox({
        prompt: "Enter note name (e.g. Work/Meeting)",
        placeHolder: "MyNote",
      });

      if (!fileNameInput) return;

      try {
        const fullFilePath = path.join(rootPath, `${fileNameInput}.md`);
        const fileUri = vscode.Uri.file(fullFilePath);
        const folderUri = vscode.Uri.file(path.dirname(fullFilePath));

        // Ensure directory exists
        await vscode.workspace.fs.createDirectory(folderUri);

        // Write initial content
        const content = new TextEncoder().encode(
          `# ${path.basename(fileNameInput)}\n\n`
        );
        await vscode.workspace.fs.writeFile(fileUri, content);

        // Open document
        const doc = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(doc);
      } catch (err) {
        vscode.window.showErrorMessage(`Error: ${err}`);
      }
    }
  );

  // --- COMMAND: CREATE EMPTY FOLDER ---
  let createFolder = vscode.commands.registerCommand(
    "global-notes.createFolder",
    async () => {
      const rootPath = context.globalState.get<string>("notesFolderPath");
      if (!rootPath) {
        promptSetFolder();
        return;
      }

      const folderName = await vscode.window.showInputBox({
        prompt: "Enter new folder name",
        placeHolder: "e.g. Projects/Archive",
      });

      if (folderName) {
        const folderUri = vscode.Uri.file(path.join(rootPath, folderName));
        await vscode.workspace.fs.createDirectory(folderUri);
        vscode.window.showInformationMessage(`Folder created: ${folderName}`);
      }
    }
  );

  // --- COMMAND: SHOW CURRENT FOLDER ---
  let showFolder = vscode.commands.registerCommand(
    "global-notes.showFolder",
    () => {
      const rootPath = context.globalState.get<string>("notesFolderPath");
      if (rootPath) {
        vscode.window.showInformationMessage(
          `Current Global Notes Path: ${rootPath}`
        );
      } else {
        promptSetFolder();
      }
    }
  );

  context.subscriptions.push(setFolder, addNote, createFolder, showFolder);
}

// --- HELPER FUNCTIONS ---

function updateStatusBar(context: vscode.ExtensionContext) {
  const rootPath = context.globalState.get<string>("notesFolderPath");
  if (rootPath) {
    myStatusBarItem.text = `$(file-directory) Notes: ${path.basename(
      rootPath
    )}`;
    myStatusBarItem.tooltip = `Global Notes Path: ${rootPath}`;
    myStatusBarItem.show();
  } else {
    myStatusBarItem.text = `$(alert) Set Notes Folder`;
    myStatusBarItem.show();
  }
}

async function promptSetFolder() {
  const selection = await vscode.window.showErrorMessage(
    "Notes folder not set!",
    "Set Folder Now"
  );
  if (selection === "Set Folder Now") {
    vscode.commands.executeCommand("global-notes.setFolder");
  }
}

export function deactivate() {}
