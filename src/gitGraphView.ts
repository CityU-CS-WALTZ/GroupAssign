import * as path from 'path';
import * as vscode from 'vscode';
import { Config } from './config';
import { DataSource } from './dataSource';
import { GitGraphViewSettings, RequestMessage, ResponseMessage } from './types';

export class GitGraphView {
	public static currentPanel: GitGraphView | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly extensionPath: string;
	private readonly dataSource: DataSource;
	private disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		if (GitGraphView.currentPanel) {
			GitGraphView.currentPanel.panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel('git-graph', 'Git Graph', column || vscode.ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.file(path.join(extensionPath, 'media'))
			]
		});

		GitGraphView.currentPanel = new GitGraphView(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this.panel = panel;
		this.extensionPath = extensionPath;
		let workspaceFolders = vscode.workspace.workspaceFolders;
		this.dataSource = new DataSource(workspaceFolders !== undefined && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : null);

		this.update();
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
		this.panel.onDidChangeViewState(e => {
			if (this.panel.visible) {
				this.update();
			}
		}, null, this.disposables);

		this.panel.webview.onDidReceiveMessage(async (message: RequestMessage) => {
			switch (message.command) {
				case 'loadBranches':
					this.sendMessage({
						command: 'loadBranches',
						data: this.dataSource.getBranches(message.data.showRemoteBranches)
					});
					return;
				case 'loadCommits':
					this.sendMessage({
						command: 'loadCommits',
						data: this.dataSource.getCommits(message.data.branch, message.data.maxCommits, message.data.showRemoteBranches)
					});
					return;
			}
		}, null, this.disposables);
	}

	public dispose() {
		GitGraphView.currentPanel = undefined;
		this.panel.dispose();
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private update() {
		this.panel.webview.html = this.getHtmlForWebview();
	}

	private getHtmlForWebview() {
		const config = new Config();
		const jsPathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'media', 'main.js'));
		const jsUri = jsPathOnDisk.with({ scheme: 'vscode-resource' });
		const cssPathOnDisk = vscode.Uri.file(path.join(this.extensionPath, 'media', 'main.css'));
		const cssUri = cssPathOnDisk.with({ scheme: 'vscode-resource' });
		const isRepo = this.dataSource.isGitRepository();
		const nonce = getNonce();
		let settings: GitGraphViewSettings = {
			graphStyle: config.graphStyle(),
			initialLoadCommits: config.initialLoadCommits(),
			loadMoreCommits: config.loadMoreCommits(),
			graphColours: config.graphColours(),
			dateFormat: config.dateFormat()
		};

		let html = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src vscode-resource:; script-src vscode-resource: 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" type="text/css" href="${cssUri}">
                <title>Git Graph</title>
            </head>`;
		if (isRepo) {
			html += `<body>
			<div id="controls">
				<span class="unselectable">Branch: </span><select id="branchSelect"></select>
				<label><input type="checkbox" id="showRemoteBranchesCheckbox" value="1" checked>Show Remote Branches</label>
				<div id="refreshBtn" class="roundedBtn">Refresh</div>
			</div>
			<div id="commitGraph"></div>
			<div id="commitTable"></div>
			<script nonce="${nonce}">var settings = ${JSON.stringify(settings)};</script>
			<script src="${jsUri}"></script>
			</body>`;
		} else {
			html += `<body class="notGitRepository"><h1>Git Graph</h1><p>The current workspace is not a Git Repository, unable to show Git Graph.</p></body>`;
		}
		html += `</html>`;
		return html;
	}

	private sendMessage(msg: ResponseMessage) {
		this.panel.webview.postMessage(msg);
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}