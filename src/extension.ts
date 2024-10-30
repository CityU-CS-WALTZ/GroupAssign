import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Config } from './config';
import { GitGraphView } from './gitGraphView';

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
	

	context.subscriptions.push(vscode.commands.registerCommand('group.view', () => {
		const panel = vscode.window.createWebviewPanel('groupWebview', 'Group Webview', vscode.ViewColumn.One, {
			enableScripts: true,
		});
		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(
            message => {
				switch (message.command) {
                    case 'login':
                        if (message.username === 'admin1' && message.password === 'admin666') {
                            panel.webview.postMessage({ status: 'success', message: 'HELLO', isAdmin: true, username: message.username });
                        } else if (message.username === 'user1' && message.password === 'user666') {
                            panel.webview.postMessage({ status: 'success', message: 'HELLO', isAdmin: false, username: message.username });
                        } else {
                            panel.webview.postMessage({ status: 'error', message: '请重新输入' });
                        }
                        return;
                    case 'openGroupWeb':
                        openHtmlFile(context, 'groupWeb.html');
                        return;
                    case 'openProjectSpace':
                        openHtmlFile(context, 'projectSpace.html');
                        return;
                    case 'openProjectManagement':
                        openHtmlFile(context, 'projectManagement.html');
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

function openHtmlFile(context: vscode.ExtensionContext, fileName: string) {
    const htmlPath = path.join(context.extensionPath, 'web', fileName);
    if (fs.existsSync(htmlPath)) {
        vscode.env.openExternal(vscode.Uri.file(htmlPath));
    } else {
        vscode.window.showErrorMessage(`找不到 ${fileName} 文件`);
    }
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