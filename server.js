const express = require('express');
const mysql = require('mysql2/promise'); // Import mysql2 with promise support
const app = express();
const port = 3000;

// Database configuration
const dbConfig = {
    host: '1.94.243.147',
    port: '3306',
    user: 'root',
    password: 'Waltz_team',
    database: 'project',
    connectTimeout: 10000
};

// 获取所有任务
app.get('/api/tasks', async (req, res) => {
    try {
        // 创建数据库连接
        const connection = await mysql.createConnection(dbConfig);

        // 查询所有任务
        const [tasks] = await connection.execute('SELECT * FROM task');

        console.log('所有任务列表:', tasks);

        // 关闭连接
        await connection.end();

        // 返回任务列表
        res.json(tasks);
    } catch (error) {
        console.error('获取所有任务失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});


// 获取指定用户的所有任务
app.get('/api/user-tasks/:email', async (req, res) => {
    try {
        const userEmail = req.params.email; // 获取用户邮箱

        console.warn('userEmail:', userEmail);

        // 创建数据库连接
        const connection = await mysql.createConnection(dbConfig);

        // Prepare the SQL query with a parameter
        const sqlQuery = `
            SELECT 
                t.tid id,
                tname,
                t.description,
                GROUP_CONCAT(DISTINCT u2.username ORDER BY u2.userid) AS developers,
                t.status,
                f.filename,
                t.deadline,
                c.comments
            FROM 
                Task t
                LEFT JOIN user u1 ON u1.email = ?
                LEFT JOIN user u2 ON FIND_IN_SET(u2.userid, REPLACE(t.developer, ' ', ''))
								LEFT JOIN file f  ON t.tid = f.tid
								LEFT JOIN (SELECT tid, GROUP_CONCAT(CONCAT(' Comment from: ', username, ' ', time, ' : ', body, '<br>') SEPARATOR '') as comments
													 FROM comment c 
													 LEFT JOIN user u 
													 ON c.publisher = u.userid
													 GROUP BY tid) c 
													 ON t.tid = c.tid
            WHERE 
                FIND_IN_SET(u1.userid, REPLACE(t.developer, ' ', ''))
                                AND t.status <> 'completed' AND t.status <> 'unassigned'
                GROUP BY t.tid;
										
        `;

        // Log the SQL query and parameters
        console.log(`Executing SQL: ${sqlQuery} with parameters: [${userEmail}]`);

        // Execute the query with the userEmail parameter
        const [tasks] = await connection.execute(sqlQuery, [userEmail]);


        console.log(`用户 ${userEmail} 的任务列表:`, tasks);

        // 关闭连接
        await connection.end();

        // 返回任务列表
        res.json(tasks);
    } catch (error) {
        console.error('获取用户任务失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
