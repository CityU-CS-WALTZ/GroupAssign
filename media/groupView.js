
           
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
