import { DataSource } from "./dataSource";
import * as vscode from 'vscode';
import * as path from 'path';
import * as gitOpr from './gitOperations';

export class GitGraphUI {

    private readonly serverLink = 'https://1b1abb257927d37fc852a9fc7791d25d.serveo.net';

    private readonly panel: vscode.WebviewPanel;

    private readonly dataSource: DataSource;

    private localBranches: string[];
    private remoteBranches: string[];

    private curLocalBranch: string;
    private curRemoteBranch: string;

    public constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        let workspaceFolders = vscode.workspace.workspaceFolders;
        this.dataSource = new DataSource(workspaceFolders !== undefined && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : null);
        this.localBranches = [];
        this.remoteBranches = [];
        this.curLocalBranch = '';
        this.curRemoteBranch = '';

        this.panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'getCommitDetail') {
                const details = this.dataSource.getCommitDetails(message.data);
                this.panel.webview.postMessage({ command: 'commitDetailData', data: details });
            }
            else if (message.command === 'indexListData') {
                const indexList = message.data;
                this.addFilesToTask(indexList);
            }
            else if (message.command === 'newStageData') {
                const newInputs = message.data;
                this.gitAdd(newInputs);
            }
            else if (message.command === 'unstageData') {
                const unstageFile = message.data;
                this.gitUnstage(unstageFile);
            }
            else if (message.command === 'commitAllStagedData') {
                this.gitCommitAllStaged();
            }
            else if (message.command === 'unstageAllData') {
                this.gitUnstageAll();
            }
            else if (message.command === 'newCommitData') {
                const newCommitFiles = message.data;
                this.gitCommit(newCommitFiles);
            }
            else if (message.command === 'resetCommit') {
                this.gitResetCommit();
            }
            else if (message.command === 'newPushData') {
                this.gitPush();
            }
            else if (message.command === 'localBranchChanged') {
                this.changeLocalBranch(message.data);
            }
            else if (message.command === 'remoteBranchChanged') {
                this.changeRemoteBranch(message.data);
            }
            else if (message.command === 'fetchData') {
                this.gitFetch();
            }
            else if (message.command === 'pullData') {
                this.gitPull();
            }
        });
    }

    private async gitAdd(newInputs: string[]) {

        const flag = newInputs.length > 5;

        for (const file of newInputs) {
            const res = await this.dataSource.add(file);
            if (res.success) {
                if (!flag) vscode.window.showInformationMessage(`Staged file ${file}`);
            }
            else {
                console.log(res.message);
                vscode.window.showErrorMessage(`Staging file ${file} failed`);
            }
        }

        if (flag) vscode.window.showInformationMessage(`Staged ${newInputs.length} files.`);

        this.sendDirectoryData();
        this.sendStagedFiles();
    }

    private async gitUnstage(unstageFile: string) {
        const res = await this.dataSource.unstageFile(unstageFile);

        if (res.success) {
            vscode.window.showInformationMessage(`Unstaged file ${unstageFile}`);
        }
        else {
            console.log(res.message);
            vscode.window.showErrorMessage(`Unstaging file ${unstageFile} failed`);
        }

        this.sendDirectoryData();
        this.sendStagedFiles();
    }

    private async gitUnstageAll() {
        const res = await this.dataSource.unstage();

        if (res.success) {
            vscode.window.showInformationMessage('Unstaged all files');
        }
        else {
            console.log(res.message);
            vscode.window.showErrorMessage('Unstaging all files failed');
        }

        this.sendDirectoryData();
        this.sendStagedFiles();
    }

    private async gitCommit(newFiles: string[]) {
        let message = await vscode.window.showInputBox({ prompt: "Enter commit message" });

        if (message) {
            console.log(newFiles.join(" "));
            const res = await this.dataSource.commitFile(newFiles.join(" "), message);
            if (res.success) {
                vscode.window.showInformationMessage(`Committed ${newFiles.length} files`);
            }
            else {
                console.log(res.message);
                vscode.window.showErrorMessage(`Committing files failed`);
            }

            this.sendStagedFiles();
            this.sendUnpushedCommits();
        }
    }

    private async gitCommitAllStaged() {
        let message = await vscode.window.showInputBox({ prompt: "Enter commit message" });

        if (message) {
            const res = await this.dataSource.commit(message);
            if (res.success) {
                vscode.window.showInformationMessage(`Committed all staged files`);
            }
            else {
                console.log(res.message);
                vscode.window.showErrorMessage(`Committing files failed`);
            }

            this.sendStagedFiles();
            this.sendUnpushedCommits();
        }
    }

    private async gitResetCommit() {

        const res = await this.dataSource.resetCommits();

        if (res.success) {
            vscode.window.showInformationMessage('Reset latest commit');
        }
        else {
            console.log(res.message);
            vscode.window.showErrorMessage('Resetting latest commit failed');
        }

        this.sendStagedFiles();
        this.sendUnpushedCommits();
    }

    private async gitPush() {

        const options = {
            placeHolder: 'Please select a potential completed task (or leave it blank for skipping)',
            canPickMany: false,
            matchOnDescription: true,
            matchOnDetail: true
        };

        var axios = require('axios');
        
        vscode.window.showInformationMessage('Fetching task list...');
        const response = await axios.post(`${this.serverLink}/show`, { userid: "1" });

        console.log(response.data);

        const qpitems = response.data.map(item => {
            return { label: item.tname, description: `Select task ${item.tname}(${item.tid})` }
        });

        console.log(qpitems);
    
        const selectedItem = await vscode.window.showQuickPick(qpitems, options);
        if (selectedItem) {
            const tid = parseInt(selectedItem['description'].match(/\((\d+)\)/)[1], 10);
            const response = await axios.post(`${this.serverLink}/task/underaccept`, { id: tid });
            if (response.success) vscode.window.showInformationMessage(`Submitted task: ${selectedItem['label']}`);
            else vscode.window.showErrorMessage('Failed to submit task');
        }

        console.log(`${this.curLocalBranch}:${this.curRemoteBranch.split('/')[1]}`);
        const res = await this.dataSource.push(`${this.curLocalBranch}:${this.curRemoteBranch.split('/')[1]}`);
        console.log(res);
        if (res.success) {
            vscode.window.showInformationMessage(`Pushed into branch ${this.curRemoteBranch}`);
        }
        else {
            console.log(res.message);
            vscode.window.showInformationMessage(`Pushing into branch ${this.curRemoteBranch} failed`);
        }

        this.sendUnpushedCommits();
    }

    private async gitFetch() {
        vscode.window.showInformationMessage('Fetching from remote');

        const res = await this.dataSource.fetch();
        if (res.success) {
            vscode.window.showInformationMessage('Fetched from remote');
        }
        else {
            console.log(res.message);
            vscode.window.showErrorMessage('Fetching from remote failed');
        }

        this.sendUnpushedCommits();
    }

    private async gitPull() {
        vscode.window.showInformationMessage('Pulling from remote');

        const res = await this.dataSource.pull();
        if (res.success) {
            vscode.window.showInformationMessage('Pulled from remote');
        }
        else {
            console.log(res.message);
            vscode.window.showErrorMessage('Pulling from remote failed');
        }

        this.sendDirectoryData();
    }

    private async addFilesToTask(indexList: string[]) {
        
        // TODO: obtain my task list here

        const options = {
            placeHolder: 'Please select a task for assignment',
            canPickMany: false,
            matchOnDescription: true,
            matchOnDetail: true 
        };

        var axios = require('axios');
        
        vscode.window.showInformationMessage('Fetching task list...');
        const response = await axios.post(`${this.serverLink}/show`, { userid: "1" });

        console.log(response.data);

        const qpitems = response.data.map(item => {
            return { label: item.tname, description: `Select task ${item.tname}(${item.tid})` }
        });
    
        const selectedItem = vscode.window.showQuickPick(qpitems, options);

        if (selectedItem) {
            const tid = parseInt(selectedItem['description'].match(/\((\d+)\)/)[1], 10);
            const res = await axios.post(`${this.serverLink}/file`, {
                "a": tid,
                "filenames": indexList
            });
            if (res.success) vscode.window.showInformationMessage(`Added files to task ${selectedItem['label']}`);
            else vscode.window.showErrorMessage('Failed to add files');
        }
    }

    private sendUnpushedCommits() {
        let committed = this.dataSource.getUnpushedCommits();
        this.panel.webview.postMessage({ command: 'unpushedCommitsData', data: committed });
    }

    private sendStagedFiles() {
        let index = this.dataSource.getStagedFiles();
        this.panel.webview.postMessage({ command: 'stagedDirectoryData', data: index });
    }

    private sendDirectoryData() {
        let workspace = this.dataSource.getUntrackedAndModifiedFiles(true, true);
        this.panel.webview.postMessage({ command: 'directoryData', data: workspace });
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

    private changeLocalBranch(newBranch: string) {
        console.log("Selected value:", newBranch);

        // TODO: change local branch here

        this.curLocalBranch = newBranch;
        vscode.window.showInformationMessage(`Current local branch is: ${newBranch}`);
    }

    private changeRemoteBranch(newBranch: string) {
        console.log('selected value:', newBranch);

        // TODO: change remote branch here

        this.curRemoteBranch = newBranch;
        vscode.window.showInformationMessage(`Current remote branch is: ${newBranch}`);
    }

    private sendBranchData() {
        this.localBranches = this.dataSource.getBranches(false);
        this.remoteBranches = this.dataSource.getBranches(true);
        this.curLocalBranch = this.localBranches[0];
        this.curRemoteBranch = this.remoteBranches[0];
        this.panel.webview.postMessage({ command: 'branchData', data: {
            'local': this.localBranches,
            'remote': this.remoteBranches
        } });
    }

    public update() {
        this.sendBranchData();
        this.sendDirectoryData();
        this.sendStagedFiles();
        this.sendUnpushedCommits();
    }

    public getHtml(): string {

        return `
            <div class="section bottom-section">
                <div class="box droppable" id="workspace" style="overflow-y: auto;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <h2>Untracked & Modified</h2>
                        <div style="margin-left: 15px">
                            <i class="fa-solid fa-code-branch" style="color: var(--vscode-editor-foreground); font-size: 1em;"></i>
                            <select id="localBranch"></select>
                        </div>
                    </div>
                    <ul id="directoryTree"></ul>
                </div>
                <div class="box droppable" id="index" style="overflow-y: auto;">
                    <div style="position: relative; width: 100%;">
                        <h2 style="text-align: center;">Staged</h2> 
                        <div style="position: absolute; top: 0; right: 0; background: transparent; border: none; display: flex; justify-content: space-between;">
                            <button title="Commit all staged files" id="commitAllStagedFiles" style="background: transparent; border: none;">
                                <i class="fa-solid fa-check-double" style="color: var(--vscode-editor-foreground); font-size: 1.2em;"></i>
                            </button>
                            <button title="Unstage All Files" id="unstageAllFiles" style="background: transparent; border: none;">
                                <i class="fa-solid fa-trash" style="color: var(--vscode-editor-foreground); font-size: 1.2em;"></i>
                            </button>
                            <button title="Add Current File List to Task" id="addFilesToTask" style="background: transparent; border: none;">
                                <i class="fa-solid fa-plus" style="color: var(--vscode-editor-foreground); font-size: 1.2em;"></i>
                            </button>
                        </div>
                    </div>
                    <ul id="indexList"></ul>
                </div>
                <div class="box droppable" id="local-repo" style="overflow-y: auto;">
                    <h2>Committed</h2>
                    <ul id="localRepoList"></ul>
                </div>
                <div class="box" id="remote-repo">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <h2>Remote Repo</h2>
                        <div style="margin-left: 15px">
                            <i class="fa-solid fa-code-branch" style="color: var(--vscode-editor-foreground); font-size: 1em;"></i>
                            <select id="remoteBranch"></select>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                        <i draggable="true" id="remoteFileIcon" class="fa-solid fa-file-import" style="color: var(--vscode-editor-foreground); font-size: 3em;"></i>
                    </div>
                </div>
            </div>`;
    }
} 
