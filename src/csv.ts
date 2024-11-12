import * as path from 'path';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

export interface User {
    userid:  string;
    username: string;
    password: string;
    title: string;
    email: string;
}

export function readUserData(filePath: string): User[] {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        return records.map((record: any) => ({
            userid: record.userid,
            username: record.username,
            password: record.password,
            title: record.title,
            email: record.email,
        }));
    } catch (error) {
        console.error('Error reading user data:', error);
        return [];
    }
}

export default function validateTitle(users: User[], username: string, password: string): User | null {
    return users.find(user => 
        user.username === username && user.password === password
    ) || null;
}

export function validateUser(users: User[], username: string, password: string): User | null {
    return users.find(user => 
        user.username === username && user.password === password
    ) || null;
}