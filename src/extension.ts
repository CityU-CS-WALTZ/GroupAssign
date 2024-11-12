import * as vscode from 'vscode';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';
import { Config } from './config';
import { GitGraphView } from './gitGraphView';
//import { readUserData, User, validateUser } from './csv';
import { testConnection,getUserTable, User } from './database';


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

    //user = readUserData()

	context.subscriptions.push(vscode.commands.registerCommand('group.view', async() => {
		const panel = vscode.window.createWebviewPanel('groupWebview', 'Group Webview', vscode.ViewColumn.One, {
			enableScripts: true,
            //localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'web')]
		});
		panel.webview.html = getWebviewContent();


        // 调用 testConnection 函数
        testConnection().then(() => {
            //console.log('数据库连接测试完成');
            vscode.window.showErrorMessage(`数据库连接测试完成`);
        });

         // 调用 getUserTable 函数并处理返回的用户数据
        const users = await getUserTable();
        vscode.window.showErrorMessage(`获取用户数据`);

        //const users = readUserData("../resources/user.csv");
		panel.webview.onDidReceiveMessage(
            message => {
				switch (message.command) {
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
                        return;
                    case 'openGroupWeb':
                        openHtmlFile(context, 'groupWeb.html',null);
                        return;
                    case 'openProjectSpace':
                        openHtmlFile(context, 'projectSpace.html',null);
                        return;
                    case 'openProjectManagement':
                        openHtmlFile(context, 'projectManagement.html',null);
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

function openHtmlFile(context: vscode.ExtensionContext, fileName: string,user:User|null) {
    if(! user ){
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

// 添加下载文件的函数
async function downloadFile(url: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        const file = fs.createWriteStream(filePath);
        https.get(url, response => {
            // 处理重定向
            if (response.statusCode === 302 || response.statusCode === 301) {
                if (response.headers.location) {
                    downloadFile(response.headers.location, filePath)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            fs.unlink(filePath, () => {});
            reject(err);
        });

        file.on('error', err => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>登录</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .container {
                text-align: center;
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 5px;
                position: relative;
                width: 300px;
                height: 400px;
            }
            input, button { 
                margin: 10px 0; 
                padding: 5px; 
                width: 200px;
            }
            #message { 
                margin-top: 20px; 
                font-weight: bold; 
            }
            .hidden {
                display: none;
            }
            #userInfo {
                position: absolute;
                top: 10px;
                right: 10px;
            }
            #logoutButton {
                position: absolute;
                bottom: 10px;
                right: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div id="userInfo" class="hidden"></div>
            <div id="loginForm">
                <h2>登录</h2>
                <input type="text" id="username" placeholder="账号" value="admin1">
                <br>
                <input type="password" id="password" placeholder="密码" value="admin666">
                <br>
                <button id="loginButton">登录</button>
            </div>
            <div id="message"></div>
            <div id="loggedInContent" class="hidden">
                <button id="groupWebButton">groupWeb</button>
                <button id="projectSpaceButton">projectSpace</button>
                <button id="projectManagementButton" class="hidden">projectManagement</button>
            </div>
            <button id="logoutButton" class="hidden">退出登录</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const loginButton = document.getElementById('loginButton');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const messageDiv = document.getElementById('message');
            const groupWebButton = document.getElementById('groupWebButton');
            const projectSpaceButton = document.getElementById('projectSpaceButton');
            const projectManagementButton = document.getElementById('projectManagementButton');
            const loginForm = document.getElementById('loginForm');
            const userInfo = document.getElementById('userInfo');
            const logoutButton = document.getElementById('logoutButton');
            const loggedInContent = document.getElementById('loggedInContent');

            usernameInput.addEventListener('focus', () => {
                if (usernameInput.value === 'admin1') usernameInput.value = '';
            });

            passwordInput.addEventListener('focus', () => {
                if (passwordInput.value === 'admin666') passwordInput.value = '';
            });

            loginButton.addEventListener('click', () => {
                const username = usernameInput.value;
                const password = passwordInput.value;
                vscode.postMessage({
                    command: 'login',
                    username: username,
                    password: password
                });
            });

            groupWebButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openGroupWeb' });
            });

            projectSpaceButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openProjectSpace' });
            });

            projectManagementButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openProjectManagement' });
            });

            logoutButton.addEventListener('click', () => {
                loginForm.classList.remove('hidden');
                userInfo.classList.add('hidden');
                loggedInContent.classList.add('hidden');
                logoutButton.classList.add('hidden');
                messageDiv.textContent = '';
                usernameInput.value = 'admin1';
                passwordInput.value = 'admin666';
                 vscode.postMessage({ command: 'logout' });
            });

            window.addEventListener('message', event => {
                const message = event.data;
                messageDiv.textContent = message.message;
                messageDiv.style.color = message.status === 'success' ? 'green' : 'red';

                if (message.status === 'success') {
                    loginForm.classList.add('hidden');
                    userInfo.textContent = '当前用户: ' + message.username;
                    userInfo.classList.remove('hidden');
                    loggedInContent.classList.remove('hidden');
                    logoutButton.classList.remove('hidden');
                    if (message.isAdmin) {
                        projectManagementButton.classList.remove('hidden');
                    } else {
                        projectManagementButton.classList.add('hidden');
                    }
                }
            });
        </script>
    </body>
    </html>`;
}