import {getPool} from "../../config/db";

import bcrypt from "bcrypt";
import randtoken from "rand-token";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

const hash = async (password: string) => {
    const salt = 10
    const hashed = await bcrypt.hash(password, salt)
    return hashed;
}

const compare = async (password: string, hashed: string) => {
    const match = await bcrypt.compare(password, hashed);
    return match;
};

const onlyEmail = async (email: string) => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query("SELECT email FROM user WHERE email=?", email);
    connection.release();
    if (result.length === 0) {
        return true
    }
    return false;
};

const register = async (firstName: string, lastName: string, email: string, password: string): Promise<any> => {
    const connection = await getPool().getConnection();
    await connection.query( "INSERT INTO user (first_name, last_name, email, password) VALUES (?, ?, ?, ?)", [firstName, lastName, email, password] );
    const newUser = await connection.query( "SELECT * FROM user WHERE email=?", email );
    connection.release();
    return newUser;
};

const newToken = async (): Promise<any> => {
    return randtoken.generate(32);
};

const login = async (email: string, password: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT * FROM user WHERE email = ?', [email]);
    const match = await compare(password, result.password);
    if(match === true ) {
        const token = await newToken();
        await connection.query('UPDATE user SET auth_token = ? WHERE email = ?', [token, email]);
        connection.release();
        return [token, result.id];
    } else {
        connection.release();
        return -1;
    }
};

const logout = async (token: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query( "UPDATE user SET auth_token = null WHERE auth_token=(?)", [token] );
    connection.release();
    return result
};

const findId = async (token: string): Promise<any> => {
    const connection = await getPool().getConnection();
    if (token === null)
        return null;
    const [result]= await connection.query('SELECT * FROM user WHERE auth_token = ?', [token]);
    connection.release();
    if (result) {
        return result.id;
    }
    return -1;
};


const getUserInfo = async (userID: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT * FROM user WHERE id = ?', [userID]);
    connection.release();
    return result;
};

const editUserInfo = async (): Promise<any> => {
    return;
};

const getUserImage = async (userID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [rows] = await connection.query(`SELECT image_filename FROM user WHERE user.id = ${userID}`);
    connection.release();
    return rows;
};

const editUserImage = async (userID: string, filename: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('UPDATE user SET image_filename = ? WHERE id = ?', [filename, userID]);
    connection.release();
    return result;
};

const deleteUserImage = async (userID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('UPDATE user SET image_filename = null WHERE id = ?', [userID]);
    connection.release();
    return result;
};

export {hash, compare, onlyEmail, register, login, logout, findId, getUserInfo, editUserInfo, getUserImage, editUserImage, deleteUserImage}