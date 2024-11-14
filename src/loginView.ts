import * as path from 'path';
import * as vscode from 'vscode';
import { Config } from './config';
import { DataSource } from './dataSource';
import { GitGraphViewSettings, RequestMessage, ResponseMessage } from './types';

export function getWebviewContent() {
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
                <button id="projectSpaceButton">projectSpace</button>
                <button id="userSpaceButton">projectSpace</button>
            </div>
            <button id="logoutButton" class="hidden">退出登录</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const loginButton = document.getElementById('loginButton');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const messageDiv = document.getElementById('message');
            const projectSpaceButton = document.getElementById('projectSpaceButton');
            const userSpaceButton = document.getElementById('userSpaceButton');
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


            projectSpaceButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openProjectSpace' });
            });

            userSpaceButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openUserSpace' });
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
                        projectSpaceButton.classList.remove('hidden');
                        userSpaceButton.classList.add('hidden');
                    } else {
                        projectSpaceButton.classList.add('hidden');
                        userSpaceButton.classList.remove('hidden');
                    }
                }
            });
        </script>
    </body>
    </html>`;
}
