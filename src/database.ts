// src/getUserTable.ts
import mysql from 'mysql2/promise';
// src/dbConfig.ts
export const dbConfig = {
    host: '1.94.243.147',
    port: 3306,
    user: 'root',
    password: 'Waltz_team',
    database: 'project',
    connectTimeout: 10000
};

export interface User {
    id: number;
    userid: number;
    username: string;
    password: string;
    title: string;
    email: string;
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
            id: user.userid,
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