const vscode = acquireVsCodeApi();

function selectAssignment(assignment) {
    const details = {
        'Assignment 1': {
            deadline: '2023-12-01',
            progress: '50%',
            status: 'In Progress',
            developerList: ['Alice', 'Bob'],
            priority: 'High'
        },
        'Assignment 2': {
            deadline: '2023-11-15',
            progress: '75%',
            status: 'In Progress',
            developerList: ['Charlie', 'Dave'],
            priority: 'Medium'
        },
        'Assignment 3': {
            deadline: '2023-10-30',
            progress: '100%',
            status: 'Completed',
            developerList: ['Eve', 'Frank'],
            priority: 'Low'
        }
    };

    const assignmentDetails = details[assignment];
    if (assignmentDetails) {
        document.getElementById('assignmentDetails').innerHTML = `
            <p><strong>Deadline:</strong> ${assignmentDetails.deadline} </p>
            <p><strong>Progress:</strong> ${assignmentDetails.progress} </p>
            <p><strong>Status:</strong> ${assignmentDetails.status} </p>
            <p><strong>Developers:</strong> ${assignmentDetails.developerList.join(', ')} </p>
            <p><strong>Priority:</strong> ${assignmentDetails.priority} </p>
        `;
    } else {
        document.getElementById('assignmentDetails').innerHTML = '<p>No details available.</p>';
    }
}

window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'directoryData') {
        const directoryTree = document.getElementById('directoryTree');
        directoryTree.innerHTML = renderDirectoryTree(message.data);
    }
});

function renderDirectoryTree(data) {
    let html = '';
    for (const key in data) {
        if (data[key] === null) {
            // It's a file
            html += '<div class="directory-item" draggable="true" ondragstart="drag(event)">' + key + '</div>';
        } else {
            // It's a directory
            html += '<div class="directory-folder"><details><summary>' + key + '</summary><div class="directory-folder-content">' + renderDirectoryTree(data[key]) + '</div></details></div>';
        }
    }
    return html;
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.innerText);
    event.dataTransfer.setData("sourceId", event.target.parentElement.id);
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event, targetId) {
    event.preventDefault();
    const data = event.dataTransfer.getData("text");
    const sourceId = event.dataTransfer.getData("sourceId");

    // Remove the item from the source list
    const sourceList = document.getElementById(sourceId);
    const items = sourceList.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        if (items[i].textContent === data) {
            sourceList.removeChild(items[i]);
            break;
        }
    }

    // Only append the item if the target is not 'workspace'
    if (targetId !== 'directoryTree') {
        const targetList = document.getElementById(targetId);
        
        // Check if the item already exists in the target list
        const existingItems = targetList.getElementsByTagName('li');
        let exists = false;
        for (let i = 0; i < existingItems.length; i++) {
            if (existingItems[i].textContent === data) {
                exists = true;
                break;
            }
        }

        // Check if the item already exists in the other list
        const otherListId = targetId === 'indexList' ? 'localRepoList' : 'indexList';
        const otherList = document.getElementById(otherListId);
        const otherItems = otherList.getElementsByTagName('li');
        for (let i = 0; i < otherItems.length; i++) {
            if (otherItems[i].textContent === data) {
                exists = true;
                break;
            }
        }

        // If the item does not exist in both lists, append it
        if (!exists) {
            const newItem = document.createElement('li');
            newItem.textContent = data;
            newItem.draggable = true;
            newItem.ondragstart = drag;
            targetList.appendChild(newItem);

            // Show input dialog only if the target is not 'remoteRepoList'
            if (targetId !== 'remoteRepoList') {
                showInputDialog();
            }
        }
    }
}

function showInputDialog() {
    const userInput = prompt("Please enter the necessary information to complete the operation:");
    if (userInput) {
        vscode.postMessage({ command: 'operationComplete', data: userInput });
    }
}

document.getElementById('index').addEventListener('dragover', allowDrop);
document.getElementById('index').addEventListener('drop', (event) => drop(event, 'indexList'));

document.getElementById('local-repo').addEventListener('dragover', allowDrop);
document.getElementById('local-repo').addEventListener('drop', (event) => drop(event, 'localRepoList'));

document.getElementById('remote-repo').addEventListener('dragover', allowDrop);
document.getElementById('remote-repo').addEventListener('drop', (event) => drop(event, 'remoteRepoList'));

document.getElementById('workspace').addEventListener('dragover', allowDrop);
document.getElementById('workspace').addEventListener('drop', (event) => drop(event, 'directoryTree'));

// Add this line to make sure the items in the workspace are draggable
document.getElementById('directoryTree').addEventListener('dragover', (event) => {
    if (event.target.classList.contains('directory-item')) {
        drag(event);
    }
});
