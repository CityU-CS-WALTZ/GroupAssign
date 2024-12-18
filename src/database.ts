// src/getUserTable.ts
import mysql from 'mysql2/promise';
import { deactivate } from './extension';
// src/dbConfig.ts
export const dbConfig = {
    host: '1.94.243.147',
    port: 3306,
    user: 'root',
    password: 'Waltz_team',
    database: 'project',
    connectTimeout: 10000
};

export interface Group{
    projects: Project[];
    tasks: Task[];
    comments: Comment[];
    files: File[];
};

export interface User {
    //id: number;
    userid: number;
    username: string;
    password: string;
    title: string;
    email: string;
}

export interface File {
    id:number
    tid: number;
    filename: string;
}

export interface Task {
    tid: number;
    tname: string;
    description: string;
    pid: number;
    developer: string;
    status: string;
    deadline: Date;
}

export interface Comment {
    id: number;
    tid: number;
    publisher: string;
    body: string;
    time: Date;
}

export interface Project {
    pid: number;
    pname: string;
    admin: string;
    email: string;
    tasks: string;
    status: number;
}


export async function testConnection() {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 执行测试查询
        const [rows] = await connection.execute('SELECT 1 + 1 AS result');
        console.log('测试查询结果:', rows);

        // 查询 task 表
        const [tasks] = await connection.execute('SELECT * FROM task');
        console.log('task 表数据:', tasks);

        await connection.end();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}


export async function getUserTable(): Promise<User[]> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 查询 user 表
        const [rows, fields] = await connection.execute('SELECT * FROM user');
        
        // 检查 rows 是否为数组
        if (!Array.isArray(rows)) {
            throw new Error('查询结果不是数组');
        }

        //const userArray: User[] = rows.map((user: any) => ({
        const userArray: User[] = (rows as mysql.RowDataPacket[]).map((user: mysql.RowDataPacket) => ({
            //id: user.userid,
            userid: user.userid,
            username: user.username,
            password: user.password,
            title: user.title,
            email: user.email
        }));

        await connection.end();
        console.log('数据库连接已关闭');

        return userArray;
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function addUser( newu: User): Promise<void>  {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        //const sql: string = `INSERT INTO project (pid, pname, admin, email, tasks, status) VALUES (${newp.pid}, \'${newp.pname}\', \'${newp.admin}',\'${newp.email}\', 0 );`;
        // 
        // 插入项目数据的 SQL 语句
        const sql = `INSERT INTO user (userid, username, password, title, email) 
        VALUES (?, ?, ?, ?, ?)`;

        // 执行插入操作
        await connection.execute(sql, [newu.userid, newu.username, newu.password,newu.title,newu.email]);
        console.log(`add user`);
        

        await connection.end();
        console.log('close connect');

        return;
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}


export async function getProjectSpace(): Promise<Group> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 查询
        let [rows, fields] = await connection.execute('SELECT * FROM project');
        console.log('测试查询结果:', rows);
        
        // 检查 rows 是否为数组
        if (!Array.isArray(rows)) {
            throw new Error('查询结果不是数组');
        }

        //const userArray: User[] = rows.map((user: any) => ({
        const ps: Project[] = (rows as mysql.RowDataPacket[]).map((r: mysql.RowDataPacket) => ({
            pid: r.pid,
            pname: r.pname,
            admin: r.admin,
            email: r.email,
            tasks: r.tasks,
            status: r.status
        }));

        // 查询
        [rows, fields] = await connection.execute('SELECT * FROM task');
        console.log('测试查询结果:', rows);
        
        // 检查 rows 是否为数组
        if (!Array.isArray(rows)) {
            throw new Error('查询结果不是数组');
        }

        //const userArray: User[] = rows.map((user: any) => ({
        const ts: Task[] = (rows as mysql.RowDataPacket[]).map((r: mysql.RowDataPacket) => ({
            tid: r.tid,
            tname: r.tname,
            description: r.description,
            pid: r.pid,
            developer: r.developer,
            status: r.status,
            file: r.file,
            deadline: r.deadline
        }));

        // 查询
        [rows, fields] = await connection.execute('SELECT * FROM comment');
        console.log('测试查询结果:', rows);
        
        // 检查 rows 是否为数组
        if (!Array.isArray(rows)) {
            throw new Error('查询结果不是数组');
        }

        //const userArray: User[] = rows.map((user: any) => ({
        const cs: Comment[] = (rows as mysql.RowDataPacket[]).map((r: mysql.RowDataPacket) => ({
            id: r.id,
            tid: r.tid,
            publisher: r.publisher,
            body: r.body,
            time: r.time
        }));

        // 查询
        [rows, fields] = await connection.execute('SELECT * FROM file');
        console.log('测试查询结果:', rows);
        
        // 检查 rows 是否为数组
        if (!Array.isArray(rows)) {
            throw new Error('查询结果不是数组');
        }

        //const userArray: User[] = rows.map((user: any) => ({
        const fs: File[] = (rows as mysql.RowDataPacket[]).map((r: mysql.RowDataPacket) => ({
            id: r.id,
            tid: r.tid,
            filename: r.filename
        }));


        await connection.end();
        console.log('数据库连接已关闭');

        let gp : Group = {
            projects: ps,
            tasks: ts,
            comments: cs,
            files: fs
        };

        return gp;
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function addProject( newp:Project): Promise<void>  {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        //const sql: string = `INSERT INTO project (pid, pname, admin, email, tasks, status) VALUES (${newp.pid}, \'${newp.pname}\', \'${newp.admin}',\'${newp.email}\', 0 );`;
        // 
        // 插入项目数据的 SQL 语句
        const sql = `INSERT INTO project (pid, pname, admin, email, tasks, status) 
        VALUES (?, ?, ?, ?, ?, ?)`;

        // 执行插入操作
        await connection.execute(sql, [newp.pid, newp.pname, newp.admin, newp.email, newp.tasks, newp.status]);
        console.log(`插入项目`);
        

        await connection.end();
        console.log('数据库连接已关闭');

        return;
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function deleteProject(pid: number): Promise<void> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 删除项目的 SQL 语句
        const sql = `DELETE FROM project WHERE pid = ?`;

        // 执行删除操作
        const [result] = await connection.execute(sql, [pid]);
        // 检查 result 是否是数组
        if (!Array.isArray(result)) {
            const affectedRows = result?.affectedRows || 0;
            console.log(`Affected Rows: ${affectedRows}`);
        }

        await connection.end();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function addTask(newt: Task): Promise<void> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 插入任务数据的 SQL 语句
        const sql = `INSERT INTO task (tid, tname, description, pid, developer, status, deadline) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;

        // 执行插入操作
        await connection.execute(sql, [newt.tid, newt.tname, newt.description, newt.pid, newt.developer, newt.status,  new Date(newt.deadline)]);
        console.log(`成功添加任务: ${newt.tname}`);

        await connection.end();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function addComment(newt: Comment): Promise<void> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 插入任务数据的 SQL 语句
        const sql = `INSERT INTO comment (id, tid, publisher, body, time) 
                     VALUES (?, ?, ?, ?, ?)`;

        // 执行插入操作
        await connection.execute(sql, [newt.id, newt.tid, newt.publisher, newt.body, newt.time]);
        console.log(`成功添加Comment`);

        await connection.end();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function deleteTask(tid: number): Promise<void> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 删除任务的 SQL 语句
        const sql = `DELETE FROM task WHERE tid = ?`;

        // 执行删除操作
        const [result] = await connection.execute(sql, [tid]);
        console.log(`成功删除任务`);
        // 检查 result 是否是数组
        if (!Array.isArray(result)) {
            const affectedRows = result?.affectedRows || 0;
            console.log(`Affected Rows: ${affectedRows}`);
        }

        await connection.end();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

export async function updateTask(tid: number,newDeveloper: string): Promise<void> {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('数据库连接成功！');

        // 插入任务数据的 SQL 语句
        //UPDATE `project`.`task` SET `developer` = '1' WHERE `tid` = 1731575155
        const sql = `UPDATE task SET developer = ? WHERE tid = ?`;
        await connection.execute(sql, [newDeveloper, tid]);
        console.log(`成功更新任务 (ID: ${tid}) 的开发者为: ${newDeveloper}`);

        await connection.end();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('数据库连接或查询出错：', error);
        process.exit(1); // 添加错误退出
    }
}

// 直接调用并处理 Promise
// getProjectSpace().catch(error => {
//     console.error('未捕获的错误:', error);
//     process.exit(1);
//     });
// deleteProject(2).catch(error => {
//     console.error('未捕获的错误:', error);
//     process.exit(1);
//     });
// addProject({pid: 2,
//     pname: 'p2',
//     admin: 'lsoy',
//     email: 'lsoy@xxx.com',
//     tasks: 'task1',
//     status: 0}).catch(error => {
//     console.error('未捕获的错误:', error);
//     process.exit(1);
// });

// deleteProject(2).catch(error => {
//     console.error('未捕获的错误:', error);
//     process.exit(1);
//     });

// to be accepted
// developing
// completed
// unassigned
// addTask({
//     tid: 41,
//     tname: 'task4',
//     description: 'test_2',
//     pid: 2,
//     developer: '1',
//     status: 'to be accepted',
//     deadline: new Date('2024-11-28')
// }).catch(error => {
//     console.error('catch error: ',error);
//     process.exit(1);
// });