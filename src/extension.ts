import * as vscode from 'vscode';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import { Config } from './config';
import { GitGraphView } from './gitGraphView';
import { getProjectSpaceContent } from './groupView'
import { getWebviewContent } from './loginView'
//import { readUserData, User, validateUser } from './csv';
import { testConnection,getProjectSpace,getUserTable,User,Task,Project, addProject, deleteProject, addTask, deleteTask } from './database';


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('git-graph.view', () => {
		GitGraphView.createOrShow(context.extensionPath);
	}));

	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	statusBarItem.text = 'Git Graph';
	statusBarItem.tooltip = 'View Git Graph';
	statusBarItem.command = 'git-graph.view';
	context.subscriptions.push(statusBarItem);

	if ((new Config()).showStatusBarItem()) {
		statusBarItem.show();
	}
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('git-graph.showStatusBarItem')) {
			if ((new Config()).showStatusBarItem()) {
				statusBarItem.show();
			} else {
				statusBarItem.hide();
			}
		}
	}));
	

    let user: User | undefined = undefined ;
    let projects: Project[] ;
    let tasks: Task[] ;

    //user = readUserData()

	context.subscriptions.push(vscode.commands.registerCommand('group.view', async() => {
		const panel = vscode.window.createWebviewPanel('groupWebview', 'Group Webview', vscode.ViewColumn.One, {
			enableScripts: true,
            //localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'web')]
		});
		panel.webview.html = getWebviewContent();

        const updateWebview = () => {
            //vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
            panel.title = 'Project Space';
            panel.webview.html = getWebviewContent();
            vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
          };

        const projectSpace = () => {
            getProjectSpace().then(result=> {
                [projects,tasks] = result;
              });
            
            panel.title = 'Project Space';
            panel.webview.html = getProjectSpaceContent(projects, tasks);
            vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
            vscode.window.showInformationMessage(`页面刷新成功`);
        };

        // 创建任务列表的 HTML
        const taskList = (selectedProjectId: number) => {
            const filteredTasks = tasks.filter(task => task.pid === selectedProjectId);
            return filteredTasks.map(task => `
                <div class="task-item">
                    <h4>任务 ID: ${task.tid}</h4>
                    <p>任务名称: ${task.tname}</p>
                    <p>任务描述: ${task.description}</p>
                    <p>截止日期: ${task.deadline}</p>
                    <p>状态: ${task.status}</p>
                </div>
            `).join('');
        };
        // 调用 testConnection 函数
        // testConnection().then(() => {
        //     //console.log('数据库连接测试完成');
        //     vscode.window.showInformationMessage(`数据库连接测试完成`);
        // });

         // 调用 getUserTable 函数并处理返回的用户数据
        const users = await getUserTable();
        vscode.window.showInformationMessage(`获取用户数据`);


        //const users = readUserData("../resources/user.csv");
		panel.webview.onDidReceiveMessage(
            message => {
                let time = 0;
				switch (message.command) {
                    case 'reload':
                        vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
                        return;
                    case 'login':
                        //user = validateUser(users,message.username,message.password);
                        user = users.find((u) => u.username === message.username && u.password === message.password);
                        if (user && user.title=="admin") {
                            panel.webview.postMessage({ status: 'success', message: 'HELLO', isAdmin: true, username: message.username });
                        }else if (user && user.title=="user") {
                            panel.webview.postMessage({ status: 'success', message: 'HELLO', isAdmin: false, username: message.username });
                        } else {
                            panel.webview.postMessage({ status: 'error', message: '请重新输入' });
                        }
                        return;
                    case 'logout':
                        user=undefined;
                        panel.webview.html = getWebviewContent();
                        return;
                    case 'openProjectSpace':
                        //openHtmlFile(context, 'projectSpace.html',user);
                        projectSpace();
                        return;
                    case 'openUserSpace':
                        updateWebview();
                        return;
                    case 'changeProject':
                        const sp = projects.find(it => it.pid === message.pid);
                        if(sp){
                            console.log('下拉框项目改变');
                            panel.webview.postMessage({ action: 'showProject',pid: sp.pid, pname:sp.pname, admin: sp.admin, email: sp.email});
                        }
                        return;
                    case 'createProject':
                        if(! user || user.title != "admin" ){ 
                            vscode.window.showErrorMessage(`用户权限不足`);
                            return;
                        }
                        time = new Date().getTime();
                        const newp: Project = {
                            pid: Math.round(time/1000) ,//毫秒的时间戳
                            pname: message.name,
                            admin: user.username,
                            email: user.email,
                            tasks: '',
                            status: 0
                        };
                        
                        addProject(newp).then();
                        //panel.webview.postMessage({ action: 'createProject',pid: newp.pid, pname:newp.pname, admin: newp.admin, email: newp.email});
                        projects.push(newp);
                        projectSpace();
                        return;
                    case 'deleteProject':
                        if(! user || user.title != "admin" ){ 
                            vscode.window.showErrorMessage(`用户权限不足`);
                            return;
                        }
                        deleteProject(message.pid).then();
                        projects = projects.filter(p => p.pid != message.pid);
                        projectSpace();
                        return;
                    case 'showTask':
                
                        panel.webview.postMessage({action:'showTask', text:taskList(message.pid)});
                        return;
                    case 'createTask':
                        if(! user || user.title != "admin" ){ 
                            vscode.window.showErrorMessage(`用户权限不足`);
                            return;
                        }
                        time = new Date().getTime();
                        const newt: Task = {
                            tid: Math.round(time/1000) ,//毫秒的时间戳
                            tname: message.name,
                            description: message.description,
                            pid: message.pid,
                            developer: message.developer,
                            deadline: message.deadline,
                            status: 'unassigned'
                        };
                        console.log("新增Task:",newt);
                        
                        addTask(newt).then();
                        //panel.webview.postMessage({ action: 'refreshPage'});
                        tasks.push(newt);
                        projectSpace();
                        return;
                    case 'deleteTask':
                        if(! user || user.title != "admin" ){ 
                            vscode.window.showErrorMessage(`用户权限不足`);
                            return;
                        }
                        deleteTask(message.tid).then();
                        tasks = tasks.filter(t => t.tid != message.tid)
                        projectSpace();
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

	}));
	
	let groupBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	groupBarItem.text = 'Group Space';
	groupBarItem.tooltip = 'View Group Space';
	groupBarItem.command = 'group.view';
	context.subscriptions.push(groupBarItem);

	if ((new Config()).showStatusBarItem()) {
		groupBarItem.show();
	}


}

export function deactivate() { }

function openHtmlFile(context: vscode.ExtensionContext, fileName: string,user:User|undefined) {
    if(user === undefined ){
        vscode.window.showErrorMessage(`用户状态异常`);
        return;
    }
    const htmlPath = path.join(context.extensionPath, 'web', fileName);
    if (fs.existsSync(htmlPath)) {
        //vscode.env.openExternal(vscode.Uri.file(htmlPath));
        //const uu=vscode.Uri.parse(htmlPath.toString() + `?username=${user.username}`);
        //vscode.env.openExternal(uu);
        // 构建带参数的URL
        const fileUrl = vscode.Uri.file(htmlPath).with({
            query: `username=${encodeURIComponent(user.username)}&title=${encodeURIComponent(user.title)}`
        });
        // 使用系统默认浏览器打开
        vscode.env.openExternal(fileUrl);
    } else {
        vscode.window.showErrorMessage(`找不到 ${fileName} 文件`);
    }
}

function openCSVFile(context: vscode.ExtensionContext, fileName: string) {
    const csvPath = path.join(context.extensionPath, 'resources', fileName);
    if (fs.existsSync(csvPath)) {
        vscode.env.openExternal(vscode.Uri.file(csvPath));
    } else {
        vscode.window.showErrorMessage(`找不到 ${fileName} 文件`);
    }
}

