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
            .close-button {
                position: absolute;
                top: 10px;
                right: 10px;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div id="userInfo" class="hidden"></div>
            <div id="loginForm">
                <h2>LOGIN</h2>
                <input type="text" id="username" placeholder="username" value="admin1">
                <br>
                <input type="password" id="password" placeholder="password" value="admin666">
                <br>
                <button id="loginButton">Login</button>
                <br>
                <button id="registerLink">Register</button>
            </div>
                <div id="registerForm" class="hidden">
                <span class="close-button" id="closeRegister">&times;</span>
                <h2>REGISTER</h2>
                <input type="text" id="regUsername" placeholder="username">
                <br>
                <input type="text" id="regEmail" placeholder="email">
                <br>
                <input type="password" id="regPassword" placeholder="password">
                <br>
                <input type="password" id="confirmPassword" placeholder="confirm password">
                <br>
                <button id="registerButton">Register</button>
            </div>
            <div id="message"></div>
            <div id="loggedInContent" class="hidden">
                <button id="projectSpaceButton">projectSpace</button>
                <button id="userSpaceButton">projectSpace</button>
            </div>
            <button id="logoutButton" class="hidden">login out</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const loginButton = document.getElementById('loginButton');
            const registerLink = document.getElementById('registerLink');
            const closeRegister = document.getElementById('closeRegister');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const regUsernameInput = document.getElementById('regUsername');
            const regPasswordInput = document.getElementById('regPassword');
            const regEmailInput = document.getElementById('regEmail');
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const registerButton = document.getElementById('registerButton');
            const messageDiv = document.getElementById('message');
            const projectSpaceButton = document.getElementById('projectSpaceButton');
            const userSpaceButton = document.getElementById('userSpaceButton');
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
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

            registerLink.addEventListener('click', () => {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
            });

            closeRegister.addEventListener('click', () => {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            });

            registerButton.addEventListener('click', () => {
                const regUsername = regUsernameInput.value;
                const regPassword = regPasswordInput.value;
                const regEmail = regEmailInput.value;
                const confirmPassword = confirmPasswordInput.value;

                if (regPassword !== confirmPassword) {
                    messageDiv.textContent = 'passwords do not match';
                    messageDiv.style.color = 'red';
                    return;
                }
                
                if (!regEmail) {
                    messageDiv.textContent = 'no email';
                    messageDiv.style.color = 'red';
                    return;
                }

                vscode.postMessage({
                    command: 'register',
                    username: regUsername,
                    password: regPassword,
                    email: regEmail
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

                
                if (message.command === 'loginResponse' && message.status === 'success') {
                    loginForm.classList.add('hidden');
                    userInfo.textContent = 'account: ' + message.username;
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
                }else if (message.command === 'registerResponse') {

                    if (message.status === 'success') {
                        loginForm.classList.remove('hidden');
                        registerForm.classList.add('hidden');
                    }else if (message.status === 'fail') {
                        messageDiv.textContent = 'Account already exists!';
                    }

                }
            });
        </script>
    </body>
    </html>`;
}
