import * as path from 'path';
import * as vscode from 'vscode';
import { Config } from './config';
import { DataSource } from './dataSource';
import { GitGraphViewSettings, RequestMessage, ResponseMessage } from './types';
import { testConnection,getProjectSpace,getUserTable, User,Task,Project } from './database';


export function getProjectSpaceContent(projects: Project[], tasks: Task[]): string {
    // 创建下拉框选项
    const projectOptions = projects.map(project => 
        `<option value="${project.pid}">${project.pname}</option>`
    ).join('');


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

    // 创建完整的 HTML 内容
    return `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>项目任务管理系统</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .project-section {
            border: 1px solid #ddd;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .task-list {
            margin-top: 15px;
        }
        .task-item {
            border: 1px solid #eee;
            padding: 15px;
            margin: 10px 0;
            border-radius: 3px;
        }
        .project-item {
            border: 1px solid #eee;
            padding: 15px;
            margin: 10px 0;
            border-radius: 3px;
        }
        .status-badge {
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            color: white;
        }
             .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #555;
        }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 3px;
        }
        .form-group button {
            padding: 10px 20px;
            background-color: #007BFF;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .form-group button:hover {
            background-color: #0056b3;
        }
        .hidden { display: none; }
        .status-pending { background-color: #ffd700; }
        .status-inprogress { background-color: #87ceeb; }
        .status-review { background-color: #ffa500; }
        .status-completed { background-color: #90ee90; }
        .comment-section {
            margin-top: 10px;
            padding: 10px;
            background-color: #f9f9f9;
        }
        .comment-item {
            margin: 10px 0;
            padding: 10px;
            background-color: white;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>项目任务管理系统</h1>
        <br>
        <button id="reloadButton">Reload Webview</button>     
        <br>
        <br>
        <!-- 创建项目部分 -->
        <div class="project-section">
            <h2>Project</h2>
            <label for="projectSelect">选择项目:</label>
            <select id="projectSelect">
                <option value="">请选择项目</option>
                ${projectOptions}
            </select>
            <div id="selectedProject" class="hidden">请选择一个项目</div>
            <br>
            <button id="deleteProjectButton" class="hidden">删除当前项目</button>

            <h2>Create Project</h2>
            <form id="projectForm">
                <div>
                    <label>项目名称：</label>
                    <input type="text" id="projectName" required>
                </div>
                <button type="submit">创建项目</button>
            </form>
        </div>

        <!-- 任务管理部分 -->
        <div class="project-section">
            <h2>任务管理</h2>

            <div id="taskManagement" style="display:none">
                <h3>添加新任务</h3>
                <form id="taskForm">
                    <div>
                        <label>任务名称：</label>
                        <input type="text" id="taskName" required>
                    </div>
                    <br>
                    <div>
                        <label>任务描述：</label>
                        <textarea id="taskDescription" required></textarea>
                    </div>
                    <br>
                    <div>
                        <label>开发者名称：</label>
                        <input type="text" id="taskDeveloper" required>
                    </div>
                    <br>                 
                    <div>
                        <label>截止日期：</label>
                        <input type="date" id="taskDeadline" required>
                    </div>
                    <br>
                    <button type="submit">添加任务</button>
                    <br>
                    <div class="form-group" id="fileSection">
                        <label for="fileInput">选择文件:</label>
                        <input type="file" id="fileInput" name="fileInput" multiple>
                        <div id="fileList"></div>
                        <br>
                        <button type="submit">提交文件</button>
                    </div>
                    <br>
                    
                </form>

                <div class="task-list" id="taskList"></div>
            </div>
            <div id="taskSection"></div>
        </div>
    </div>
        <script>

            window.taskList = ${JSON.stringify(taskList)};
           
            const vscode = acquireVsCodeApi();
            const projectForm = document.getElementById('projectForm');
            const projectSelect = document.getElementById('projectSelect');
            const selectedProjectDiv = document.getElementById('selectedProject');
            const deleteProjectButton = document.getElementById('deleteProjectButton');

            const taskManagement = document.getElementById('taskManagement');
            const taskForm = document.getElementById('taskForm');
            const taskSection = document.getElementById('taskSection');

            //刷新页面
            document.getElementById('reloadButton').addEventListener('click', () => {
                vscode.postMessage({ command: 'reload' });
            });


            // 监听下拉框的 onchange 事件
            projectSelect.addEventListener('change', function() {
                const selectedValue = this.value;
                selectedProjectDiv.classList.remove('hidden');
                if (selectedValue) {
                    taskManagement.style.display = 'block';
                    vscode.postMessage({ command: 'changeProject', pid: parseInt(selectedValue) });
                    vscode.postMessage({ command: 'showTask', pid: parseInt(selectedValue) });
                } else {
                    selectedProjectDiv.classList.add('hidden');
                    taskManagement.style.display = 'none';
                }
            });

            //监听deleteProject 事件
            deleteProjectButton.addEventListener('click', () => {
                const selectedValue = projectSelect.value;
                vscode.postMessage({ command: 'deleteProject', pid:  parseInt(selectedValue) });
            } );
           

            // 处理 VSCode 返回的信息
            window.addEventListener('message', event => {
                const message = event.data;

                if (message.action === 'showProject') {
                    selectedProjectDiv.classList.remove('hidden');
                    selectedProjectDiv.classList.add('project-item');
                    const text1 = '<h2>' + message.pname + '</h2>';
                    const text2 = '<p>Admin: ' + message.admin + '</p>';
                    const text3 = '<p>Admin Email: ' + message.email + '</p>';
                    selectedProjectDiv.innerHTML = text1 + text2 + text3;
                    taskManagement.style.display = 'block';
                    deleteProjectButton.classList.remove('hidden');
                    updateTaskList();
                }else if(message.action === 'showTask'){
                    taskSection.innerHTML = message.text;
                    taskManagement.style.display = 'block';

                }

            });

            // 处理创建项目表单提交
            projectForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const projectName = document.getElementById('projectName').value;
                vscode.postMessage({ command: 'createProject', name: projectName });
            });

            //文件提交
            document.getElementById('fileInput').addEventListener('change', function(event) {
                const files = event.target.files;
                const fileList = document.getElementById('fileList');
                fileList.innerHTML = '';

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileName = file.name;
                    const fileSize = file.size;
                    const fileType = file.type;

                    const fileEntry = document.createElement('div');
                    fileEntry.textContent = "文件名:" +fileName+", 大小: " +fileSize+ "字节, 类型: "+fileType;
                    fileList.appendChild(fileEntry);
                }

                let fnames = "";
                for (let i = 0; i < files.length; i++) {
                    if(i != 0)  fnames += ","
                    fnames+=fnames;
                }
                vscode.postMessage({ command: 'updateFile', file: fnames });

            });

            // 处理创建任务表单提交
            taskForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const taskName = document.getElementById('taskName').value;
                const taskDescription = document.getElementById('taskDescription').value;
                const devName =  document.getElementById('taskDeveloper').value;
                const fileList = document.getElementById('fileList');
                const taskDeadline = document.getElementById('taskDeadline').value;
                const selectedProjectId = projectSelect.value;


                vscode.postMessage({
                    command: 'createTask',
                    name: taskName,
                    description: taskDescription,
                    deadline: taskDeadline,
                    pid: selectedProjectId,
                    developer: devName,
                });
            });

            function updateTaskList() {
                const selectedProjectId = projectSelect.value;
                if (selectedProjectId) {
                    const taskListDiv = document.getElementById('taskList');
                    taskManagement.style.display = 'block';
                    taskListDiv.innerHTML = window.taskList(parseInt(selectedProjectId));
                } else {
                    document.getElementById('taskList').innerHTML = '';
                }
            }



        </script>
    `;
}