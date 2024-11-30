import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import {request} from 'http';

export interface GitExtension {
    getAPI(version: number): GitAPI;
}

interface GitAPI {
    repositories: Repository[];
}

interface Repository {
    getConfig(): Promise<Config>;
}

interface Config {
    get(key: string): Promise<{value: string} | undefined>;
}


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

        // Add message listener
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'taskSelected':
                        this.handleTaskSelection(message.taskId);
                        break;
                    case 'selectFiles':
                        this.handleFileSelection(message.taskId);
                        break;
                }
            },
            undefined,
            this.disposables
        );
    }

    private async handleFileSelection(taskId: string) {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Select Files'
        });

        if (files && files.length > 0) {
            // Get workspace root directory
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('Workspace root directory not found');
                return;
            }

            // Convert to relative paths
            const selectedFiles = files.map(file => {
                const relativePath = path.relative(workspaceRoot, file.fsPath);
                return relativePath;
            });
            
            const req = request({
                hostname: 'localhost',
                port: 3000,
                path: `/api/tasks/${taskId}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                console.debug(res);
                if (res.statusCode === 200) {
                    this.handleTaskSelection(taskId);
                }
            });

            req.write(JSON.stringify({ files: selectedFiles }));
            req.end();
        }
    }

    private async handleTaskSelection(taskId: string) {
        const tasks = await this.fetchTasks();
        const selectedTask = tasks.find(task => task.id === parseInt(taskId));
        
        if (selectedTask) {
            this.panel.webview.postMessage({
                command: 'updateTaskDetails',
                task: selectedTask
            });
        }
    }

    private async fetchTasks(): Promise<any[]> {
        return new Promise(async (resolve, reject) => {
            // Get Git user info
            const gitUserInfo: any = await this.getGitUserInfo();

            if (!gitUserInfo.email) {
                console.error('Unable to get Git user info');
                resolve([]);
                return;
            }

            const req = request({
                hostname: 'localhost',
                port: 3000,
                path: `/api/user-tasks/${encodeURIComponent(gitUserInfo.email)}`,
                method: 'GET'
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const tasks = JSON.parse(data);
                        resolve(tasks.filter((task: any) => task.status !== 'completed' && task.status !== 'unassigned'));
                    } else {
                        reject(new Error('Failed to fetch tasks'));
                    }
                });
            });

            req.on('error', (err) => {
                console.error('Failed to fetch tasks:', err);
                resolve([]);
            });

            req.end();
        });
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

    private async getGitUserInfo() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            // Execute two git commands in parallel
            Promise.all([
                new Promise((resolve) => {
                    exec('git config user.name', (error: any, stdout: string) => {
                        resolve(error ? '' : stdout.trim());
                    });
                }),
                new Promise((resolve) => {
                    exec('git config user.email', (error: any, stdout: string) => {
                        resolve(error ? '' : stdout.trim());
                    });
                })
            ]).then(([name, email]) => {
                if (name || email) {
                    resolve({
                        name,
                        email
                    });
                } else {
                    resolve(null);
                }
            }).catch(() => {
                resolve(null);
            });
        });
    }

    private async update() {
        const cssPath = vscode.Uri.file(path.join(this.extensionPath, 'media', 'gitGraphOperation.css')).with({ scheme: 'vscode-resource' });
        const jsPath = vscode.Uri.file(path.join(this.extensionPath, 'media', 'gitGraphOperation.js')).with({ scheme: 'vscode-resource' });
        
        const tasks = await this.fetchTasks();
        const gitUserInfo = await this.getGitUserInfo();
        
        const taskListItems = tasks.map((task: any) => 
            `<li data-task-id="${task.id}" class="task-item">${task.tname}</li>`
        ).join('');

        this.panel.webview.html = this.getHtmlForWebview(cssPath as any, jsPath as any, taskListItems);
        this.sendDirectoryData();
    }

    private getHtmlForWebview(cssPath: string, jsPath: string, taskListItems: string) {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Git Graph Operation</title>
                <link rel="stylesheet" type="text/css" href="${cssPath}">
                <style>
                    .task-list {
                        padding-right: 30px;
                        border-right: dotted 1px lightgrey;
                    }
                    .task-item {
                        cursor: pointer;
                        padding: 8px;
                        margin: 4px 0;
                        border-radius: 4px;
                    }
                    .task-item:hover {
                        background-color: #f0f0f0;
                    }
                    .task-item.selected {
                        background-color: #e6f3ff;
                    }
                    .select-files-btn {
                        margin-left: 10px;
                        padding: 5px 10px;
                        background-color: #007acc;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                    .select-files-btn:hover {
                        background-color: #005999;
                    }
                    .task-info {
                        padding: 15px;
                    }
                    .task-info h3 {
                        margin: 15px 0 5px 0;
                        color: #333;
                    }
                    .task-info p {
                        margin: 5px 0;
                        color: #666;
                    }
                    .task-info ul {
                        margin: 5px 0;
                        padding-left: 20px;
                        list-style-type: disc;
                    }
                    .task-info li {
                        margin: 5px 0;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="section top-section">
                    <div class="task-list">
                        <h2>Tasks</h2>
                        <ul id="taskList">
                            ${taskListItems}
                        </ul>
                    </div>
                    <div class="task-details">
                        <h2 style="padding-left: 15px">Task Details</h2>
                        <div id="taskDetails">
                            <div class="task-info">
                                <h3>Description</h3>
                                <p id="taskDescription">Please select a task to view details</p>
                                <h3>Deadline</h3>
                                <p id="taskDeadline">No deadline set</p>
                                <h3>Status</h3>
                                <p id="taskStatus">No status</p>
                                <h3>Developers</h3>
                                <p id="taskDevelopers">No developer</p>
                                <h3>Included Files</h3>
                                <p id="taskFiles">No file included</p>
                                <h3>Comments</h3>
                                <p id="taskComments">No Comment</p>
                            </div>
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
                 <script>
                    let currentTaskId = null;
                    
                    document.getElementById('taskList').addEventListener('click', (e) => {
                        if (e.target.classList.contains('task-item')) {
                            const previousSelected = document.querySelector('.task-item.selected');
                            if (previousSelected) {
                                previousSelected.classList.remove('selected');
                            }
                            
                            e.target.classList.add('selected');
                            
                            const taskId = e.target.dataset.taskId;
                            currentTaskId = taskId;
                            vscode.postMessage({
                                command: 'taskSelected',
                                taskId: taskId
                            });
                        }
                    });

                    window.addEventListener('message', function(event) {
                        var message = event.data;
                        switch (message.command) {
                            case 'updateTaskDetails':
                                var task = message.task;
                                document.getElementById('taskDescription').textContent = task.description || 'No description';
                                document.getElementById('taskDeadline').textContent = task.deadline ? new Date(task.deadline).toLocaleString() : 'No deadline set';
                                document.getElementById('taskStatus').textContent = task.status || 'No status';
                                document.getElementById('taskDevelopers').textContent = task.developers || 'No developer';
                                document.getElementById('taskFiles').textContent = task.filename || 'No file included';
                                document.getElementById('taskComments').innerHTML = task.comments || 'No comment';
                                break;
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}