import * as path from 'path';
import * as vscode from 'vscode';
import { Config } from './config';
import { DataSource } from './dataSource';
import { GitGraphViewSettings, RequestMessage, ResponseMessage } from './types';
import { testConnection,getProjectSpace,getUserTable, User,Task,Project, Group } from './database';


export function getProjectSpaceContent(groupSet: Group): string {
    // 创建下拉框选项
    const projectOptions = groupSet.projects.map(project => 
        //`<li onclick="selectProject(${project.pid})">${project.pname}</li>`
        `<option value="${project.pid}">${project.pname}</option>`
    ).join('');

    const projectList = groupSet.projects.map(project => 
        `<li onclick="selectProject(${project.pid})">${project.pname}</li>`
        //`<option value="${project.pid}">${project.pname}</option>`
    ).join('');

    // 创建任务列表的 HTML
    const projectContent = (selectedProjectId: number) => {
        const sp = groupSet.projects.find(project => project.pid === selectedProjectId);
        if(sp){
            const tl = taskList(selectedProjectId);
            return `
            <h2>${sp.pname}</h2>
            <p><strong>admin</strong> ${sp.admin}  ${sp.email}</p>
            <p><strong>Status:</strong> ${sp.status} </p>
            <p><strong>Developers:</strong> ${sp.tasks} </p>
            ${tl}
        `;
        }else{
            return '<p>No details available.</p>';
        }
    };


    // 创建任务列表的 HTML
    const taskList = (selectedProjectId: number) => {
        const filteredTasks = groupSet.tasks.filter(task => task.pid === selectedProjectId);
        console.log('1');
        let res =  filteredTasks.map(task =>{
            const taskComments = groupSet.comments.filter(comment => comment.tid === task.tid);
            // 将评论转换为HTML字符串
            const commentsHtml = taskComments.map(comment => {
                return `
                <div class="comment-item">
                <p><strong>${comment.publisher}</strong>(${comment.time})</p>
                <p>Comment: ${comment.body}</p>
                </div>
                `;
            }).join('');

            console.log('Comments HTML:', commentsHtml);

            const taskF = groupSet.files.filter(file => file.tid === task.tid);
            console.log('hit');
            const filesHtml = taskF.map(f =>{
                return `
                <p>${f.filename}</p>
                `;}).join('');

            return  `
            <div class="task-item">
                <h4>task ID: ${task.tid}</h4>
                <p>task name: ${task.tname}</p>
                <p>task desciption: ${task.description}</p>
                ${filesHtml}
                <p>task deadline: ${task.deadline}</p>
                <p>task status: <span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span></p>
                <div class="comment-section">${commentsHtml}</div>
                
                
            </div>
            `;
        }).join('');


        

        return res;
    };

    // 创建完整的 HTML 内容
    return `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>Project Management System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f9;
        }
        p, label {
            color: black;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
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
           padding: 15px;
              border: 1px solid #ddd;
           margin: 10px 0;
            border-radius: 3px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .project-item {
            border: 1px solid #ddd;
            padding: 15px;
            margin: 10px 0;
            border-radius: 3px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
            transition: border-color 0.3s;
        }
        .form-group input:focus, .form-group textarea:focus {
            border-color: #007BFF;
            outline: none;
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
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        .comment-item {
            margin: 10px 0;
            padding: 10px;
            background-color: white;
            border-radius: 3px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        h1, h2, h3, h4 {
            color: #333;
        }
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 3px;
            transition: border-color 0.3s;
        }
        select:focus {
            border-color: #007BFF;
            outline: none;
        }
        hr {
            margin: 20px 0;
            border: none;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Porject Management System</h1>
        <br>
        <button id="reloadButton">Reload Webview</button>     
        <hr>
        
        <!-- 创建项目部分 -->
        <div class="project-section">
            <h2>Project</h2>
            <label for="projectSelect">select project</label>
            <select id="projectSelect">
                <option value="">Please select a project</option>
                ${projectOptions}
            </select>
            <div id="selectedProject" class="hidden"><p>select a project</p></div>
            <hr>
            <button id="deleteProjectButton" class="hidden">delete this project</button>
        </div>
        <hr>
        <div class="project-section">
            <h2>Create Project</h2>
            <form id="projectForm">
                <div>
                    <label>project name</label>
                    <input type="text" id="projectName" required>
                    <button type="submit">create project</button>
                </div>              
            </form>
        </div>

        <!-- 任务管理部分 -->
        <div class="project-section">
            <h2>task management</h2>

            <div id="taskManagement" style="display:none">
                <h3>add new task</h3>
                <form id="taskForm" class="form-group">
                    <div>
                        <label>Task name</label>
                        <input type="text" id="taskName" required>
                    </div>
                    <br>
                    <div>
                        <label>Task description</label>
                        <textarea id="taskDescription" required></textarea>
                    </div>
                    <br>
                    <div>
                        <label>Developer</label>
                        <input type="text" id="taskDeveloper" required>
                    </div>
                    <br>                
                    <div>
                        <label>deadline </label>
                        <input type="date" id="taskDeadline" required>
                    </div>
                    <div class="form-group" id="fileSection">
                        <label for="fileInput">Select file</label>
                        <input type="file" id="fileInput" name="fileInput" multiple>
                        <button type="submit">upload file</button>
                        <div id="fileList"></div>
                        <br>                      
                    </div>
                    <button type="submit">Add Task</button>
                    
                </form>
                <br>
                <div class="task-list" id="taskList"></div>
            </div>
            <div id="taskSection"></div>
        </div>
        <div class="project-section">
            <h2>Comment</h2>
            <form id="commentSection">
                <div>
                    <label>task id</label>
                    <input type="text" id="commentTaskID" required>
                    <br>
                    <label>comment</label>
                    <input type="text" id="commentBody" required>
                    <button type="submit">submit</button>
                </div>              
            </form>
        </div>
        <div class="project-section">
            <h2>Delete Task</h2>
            <form id="deleteTaskSection">
                <div>
                    <label>task id</label>
                    <input type="text" id="deleteTaskID" required>
                    <button type="submit">delete task</button>
                </div>              
            </form>
        </div>
    </div>
        <script>

            //window.taskList = ${JSON.stringify(taskList)};
            window.taskList = ${taskList};

           
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
                    updateTaskList(message.pid);//
                }else if(message.action === 'showTask'){
                    taskSection.innerHTML = message.text;
                    taskManagement.style.display = 'block';

                }else if(message.action === 'refresh'){
                    groupSet=
                }

            });

            // 处理创建项目表单提交
            projectForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const projectName = document.getElementById('projectName').value;
                vscode.postMessage({ command: 'createProject', name: projectName });
            });

            document.getElementById('deleteTaskSection').addEventListener('submit',function(event) {
                event.preventDefault();
                const taskID = document.getElementById('deleteTaskID').value;
                vscode.postMessage({ command: 'deleteTask', tid: taskID });
            });

            document.getElementById('commentSection').addEventListener('submit',function(event) {
                event.preventDefault();
                const taskID = document.getElementById('commentTaskID').value;
                const body = document.getElementById('commentBody').value;
                vscode.postMessage({ command: 'commentTask', tid: taskID, body:body });
            });

            //文件提交
            document.getElementById('fileInput').addEventListener('submit', function(event) {
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

            function updateTaskList(value) {
                const selectedProjectId = value;//projectSelect.value;
                if (selectedProjectId) {
                    const taskListDiv = document.getElementById('taskList');
                    taskManagement.style.display = 'block';
                    taskListDiv.innerHTML = window.taskList(parseInt(selectedProjectId));
                } else {
                    document.getElementById('taskList').innerHTML = '';
                }
            }



        </script>
        </body>
        </html>
    `;
}