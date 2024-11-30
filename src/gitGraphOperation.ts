import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

export class GitGraphOperation {
    public static currentPanel: GitGraphOperation | undefined;

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionPath: string;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (GitGraphOperation.currentPanel) {
            GitGraphOperation.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel('git-graph-operation', 'Git Graph Operation', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(extensionPath, 'media'))
            ]
        });

        GitGraphOperation.currentPanel = new GitGraphOperation(panel, extensionPath);
    }

    private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
        this.panel = panel;
        this.extensionPath = extensionPath;

        this.update();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.onDidChangeViewState(e => {
            if (this.panel.visible) {
                this.update();
            }
        }, null, this.disposables);
    }

    private sendDirectoryData() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            console.debug('Root path:', rootPath); // Debug log
            this.getAllFiles(rootPath).then(directoryData => {
                console.debug('Directory data:', directoryData); // Debug log
                this.panel.webview.postMessage({ command: 'directoryData', data: directoryData });
            });
        } else {
            console.debug('No workspace folders found'); // Debug log
        }
    }

    private async getAllFiles(dir: string): Promise<any> {
        console.debug('Getting all files in directory:', dir); // Debug log
        const result: any = {};
        const files = await vscode.workspace.findFiles('**/*');
        console.debug('Files found:', files); // Debug log
        files.forEach(file => {
            const relativePath = path.relative(dir, file.fsPath);
            console.debug('Processing file:', relativePath); // Debug log
            const parts = relativePath.split(path.sep);
            let current = result;
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    current[part] = null;
                } else {
                    current = current[part] = current[part] || {};
                }
            });
        });
        return result;
    }

    public dispose() {
        GitGraphOperation.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private update() {
        //const cssPath = this.panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'media', 'gitGraphOperation.css')));
        const cssPath = vscode.Uri.file(path.join(this.extensionPath, 'media', 'gitGraphOperation.css')).with({ scheme: 'vscode-resource' });
        const jsPath = vscode.Uri.file(path.join(this.extensionPath, 'media', 'gitGraphOperation.js')).with({ scheme: 'vscode-resource' });
        //const jsPath = this.panel.webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'media', 'gitGraphOperation.js')));
        //this.panel.webview.html = this.getHtmlForWebview(cssPath, jsPath);
        this.sendDirectoryData();
    }

    private getHtmlForWebview(cssPath: string, jsPath: string) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Git Graph Operation</title>
                <link rel="stylesheet" type="text/css" href="${cssPath}">
            </head>
            <body>
                <div class="section top-section">
                    <div class="assignment-list">
                        <h2>Assignments</h2>
                        <ul id="assignmentList">
                            <li onclick="selectAssignment('Assignment 1')">Assignment 1</li>
                            <li onclick="selectAssignment('Assignment 2')">Assignment 2</li>
                            <li onclick="selectAssignment('Assignment 3')">Assignment 3</li>
                        </ul>
                    </div>
                    <div class="assignment-details">
                        <h2>Assignment Details</h2>
                        <div id="assignmentDetails">
                            <p>Select an assignment to see details.</p>
                        </div>
                    </div>
                </div>
                <div class="section bottom-section">
                    <div class="box droppable" id="workspace">
                        <h2>Workspace</h2>
                        <ul id="directoryTree"></ul>
                    </div>
                    <div class="box droppable" id="index">
                        <h2>Index</h2>
                        <ul id="indexList"></ul>
                    </div>
                    <div class="box droppable" id="local-repo">
                        <h2>Local Repo</h2>
                        <ul id="localRepoList"></ul>
                    </div>
                    <div class="box" id="remote-repo">
                        <h2>Remote Repo</h2>
                        <ul id="remoteRepoList"></ul>
                    </div>
                </div>
                <script src="${jsPath}"></script>
            </body>
            </html>`;
    }
}