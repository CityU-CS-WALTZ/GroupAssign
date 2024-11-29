import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';

const app = express();
app.use(bodyParser.json());

const dbConfig = {
    host: '1.94.243.147',
    port: '3306',
    user: 'root',
    password: 'Waltz_team',
    database: 'project',
    connectTimeout: 10000
};

const pool = mysql.createPool(dbConfig);

app.post('/task/underaccept', async (req, res) => {
    const { id } = req.body; 

    if (!id) {
        return res.status(400).send('Task ID is required');
    }

    try {
        const [result] = await pool.execute(
            'UPDATE task SET status = ? WHERE tid = ?',
            ['to be accepted', id]
        );

        if (result.affectedRows > 0) {
            res.send('Status updated to "to be accepted" successfully');
        } else {
            res.status(404).send('Task not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating status');
    }
});

app.put('/task/developing/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const [result] = await pool.execute(
            'UPDATE task SET status = ? WHERE tid = ?',
            ['developing', id]
        );

        if (result.affectedRows > 0) {
            res.send('Status updated to "developing" successfully');
        } else {
            res.status(404).send('Task not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating status');
    }
});

app.post('/file', async (req, res) => {
    const { a, filenames } = req.body; 

    if (!Array.isArray(filenames) || filenames.length === 0) {
        return res.status(400).send('Filenames must be a non-empty array');
    }

    try {
        const insertPromises = filenames.map(filename => {
            return pool.execute(
                'INSERT INTO file (filename, tid) VALUES (?, ?)',
                [filename, a]
            );
        });

        await Promise.all(insertPromises);
        res.send('Files added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding files');
    }
});

app.post('/show', async (req, res) => {
    const { userid } = req.body; 

    if (!userid) {
        return res.status(400).send('User ID is required');
    }

    try {
        const [tasks] = await pool.execute(
            'SELECT * FROM task WHERE developer = ? AND (status = ? OR status = ?)',
            [userid, 'developing', 'to be accepted']
        );

        if (tasks.length > 0) {
            res.json(tasks); 
        } else {
            res.status(404).send('No tasks found for the given user ID');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching tasks');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});