import {getPool} from "../../config/db";

import bcrypt from "bcrypt";
import randtoken from "rand-token";
import Logger from "../../config/logger";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';

const hash = async (password: string) => {
    const salt = bcrypt.genSaltSync(10)
    const hashed = await bcrypt.hash(password, salt)
    return hashed;
}

const compare = async (password: string, hashed: string) => {
    const match = bcrypt.compareSync(password, hashed);
    return match;
};

const onlyEmail = async (email: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query("SELECT * FROM user WHERE email=?", [email]);
    connection.release();
    return result.length !== 0;
};

const register = async (firstName: string, lastName: string, email: string, password: string): Promise<any> => {
    const connection = await getPool().getConnection();
    await connection.query( "INSERT INTO user (first_name, last_name, email, password) VALUES (?, ?, ?, ?)", [firstName, lastName, email, password] );
    const newUser = await connection.query( "SELECT * FROM user WHERE email=?", email );
    connection.release();
    return newUser;
};

const newToken = async () => {
    const token = randtoken.generate(32);
    return token;
};

const login = async (email: string, password: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT * FROM user WHERE email = ?', [email]);
    if (result.length === 0) {
        connection.result();
        return -1;
    }

    const match = await compare(password, result[0].password);
    if(match === true ) {
        const token = await newToken();
        await connection.query('UPDATE user SET auth_token = ? WHERE email = ?', [token, email]);
        connection.release();
        return [result[0].id, token];
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
    const [result] = await connection.query('SELECT * FROM user WHERE auth_token = ?', [token]);
    connection.release();
    if (result) {
        return result[0].id;
    }
    return -1;
};


const getUserInfo = async (userID: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT * FROM user WHERE id = ?', [userID]);
    connection.release();
    return result;
};

const editUserInfo = async (userId: string, newFirst: string, newLast: string, newEmail: string, newPass: string, oldPass: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const userToUpdate = await getUserInfo(userId);
    if (newFirst) {
        userToUpdate[0].first_name = newLast;
    }

    if (newLast) {
        userToUpdate[0].las_name = newLast;
    }

    if (newEmail) {
        userToUpdate[0].email = newEmail;
    }

    if (oldPass) {
        const match = await compare(oldPass, userToUpdate[0].password);
        if(match) {
            if (newPass) {
                const hashed = await hash(newPass);
                await connection.query('UPDATE user SET email = ?, first_name = ?, last_name = ?, password = ? WHERE id = ?',
                    [userToUpdate[0].email, userToUpdate[0].first_name, userToUpdate[0].last_name, hashed, userId]);
            } else {
                await connection.query('UPDATE user SET email = ?, first_name = ?, last_name = ? WHERE id = ?',
                    [userToUpdate[0].email, userToUpdate[0].first_name, userToUpdate[0].last_name, userId]);
            }
            connection.release();
            return 1;
        } else{
            return -1;
        }
    } else {
        await connection.query('UPDATE user SET email = ?, first_name = ?, last_name = ? WHERE id = ?',
            [userToUpdate[0].email, userToUpdate[0].first_name, userToUpdate[0].last_name, userId]);
        connection.release();
        return 1;
    }
};

const getUserImage = async (userID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [rows] = await connection.query(`SELECT image_filename FROM user WHERE id = ${userID}`);
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