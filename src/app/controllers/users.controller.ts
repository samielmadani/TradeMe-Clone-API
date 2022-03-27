import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as users from '../models/users.model';

const register = async (req: Request, res: Response):Promise<any> => {
    const first = req.body.firstName;
    const last = req.body.lastName;
    const email = req.body.email;
    const pass = req.body.password;
    try {
        if (!first || !last || !email || !pass) {
            res.status(400).send("Please provide information to all fields fields");
            return
        }

        if (first.length === 0 || last.length === 0 || email.length === 0 || pass.length === 0) {
            res.status(400).send("Fields cannot be empty");
            return
        }

        if (!email.includes("@")) {
            res.status(400).send("Email must contain '@'");
            return
        }

        if (!pass.trim()) {
            res.status( 400 ).send( "Password can not be empty!!" )
        } else {
            const singleEmail = await users.onlyEmail(email);
            if (!singleEmail) {
                res.status( 400 ).send("Email already exists");
            } else {
                const hashed = await users.hash(pass);
                const result = await users.register(first, last, email, hashed);
                res.status(201).send({"userId": result[0][0].id});
            }
        }

    } catch (err) {
        res.status( 500 ).send( `ERROR registering user by server` );
    }
};

const login = async (req: Request, res: Response):Promise<any> => {
    const email = req.body.email;
    const pass = req.body.password;
    try {
        const singleEmail = await users.onlyEmail(email);
        if (singleEmail) {
            const result = await users.login(email, pass);
            if (result === -1) {
                return res.status(400).send(`Password is incorrect`);
            } else {
                return res.status(200).send({userId: result[1], token: result[0]});
            }
        } else {
            return res.status(400).send(`Email does not exist`);
        }
    } catch (err) {
        res.status(500).send(`ERROR logging in user by server`);
    }
};

const logout = async (req: Request, res: Response):Promise<any> => {
    try {
        const token = req.get('X-Authorization');
        const userId = await users.findId(token);
        await users.logout(token);
        if (userId !== -1) {
            return res.status(200).send(`User has been logged out.`);
        } else {
            return res.status(401).send(`User not authorized to log out.`);
        }
    } catch (err) {
        res.status(500).send(`ERROR logging out user by server.`);
    }
};

const getUserInfo = async (req: Request, res: Response):Promise<any> => {
    return ;
};

const editUserInfo = async (req: Request, res: Response):Promise<any> => {
    return ;
};

const getUserImage = async (req: Request, res: Response):Promise<any> => {
    return ;
};

const editUserImage = async (req: Request, res: Response):Promise<any> => {
    return ;
};

const deleteUserImage = async (req: Request, res: Response):Promise<any> => {
    return ;
};


export {register, login, logout, getUserInfo, editUserInfo, getUserImage, editUserImage, deleteUserImage}