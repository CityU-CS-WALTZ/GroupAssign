import * as vscode from 'vscode';
import { DateFormat, GraphStyle } from './types';

export class Config {
    private workspaceConfiguration: vscode.WorkspaceConfiguration;

    constructor() {
        this.workspaceConfiguration = vscode.workspace.getConfiguration('git-graph');
    }

    public graphStyle(): GraphStyle {
        return this.workspaceConfiguration.get('graphStyle', 'rounded');
    }
    public initialLoadCommits() {
        return this.workspaceConfiguration.get('initialLoadCommits', 300);
    }
    public loadMoreCommits() {
        return this.workspaceConfiguration.get('loadMoreCommits', 75);
    }
    public graphColours() {
        return this.workspaceConfiguration.get('graphColours', ['#0085d9', '#d9008f', '#00d90a', '#d98500', '#a300d9', '#ff0000']);
    }
    public dateFormat(): DateFormat {
        return this.workspaceConfiguration.get('dateFormat', 'Date & Time');
    }
    public showStatusBarItem() {
        return this.workspaceConfiguration.get('showStatusBarItem', true);
    }
    public showUncommittedChanges() {
        return this.workspaceConfiguration.get('showUncommittedChanges', true);
    }
}