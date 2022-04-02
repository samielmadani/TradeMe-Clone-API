import {Request, Response} from "express";
import * as users from '../models/users.model';
import fs from "mz/fs";
import Logger from "../../config/logger";

const imageDirectory = './storage/images/';
// const defaultPhotoDirectory = './storage/default/';


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
            const emailInUse = await users.onlyEmail(email);
            if (emailInUse) {
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
        const emailInUse = await users.onlyEmail(email);
        if (!(emailInUse)) {
            return res.status(400).send(`Email does not exist.`);
        } else {
            const result = await users.login(email, pass);
            if (result === -1) {
                return res.status(400).send(`Password wrong.`);
            } else {
                return res.status(200).send({userId : result[0], token : result[1]});
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR login user`);
    }
};

const logout = async (req: Request, res: Response):Promise<any> => {
    try {
        const currentToken = req.get('X-Authorization');
        if (!currentToken) {
            return res.status(401).send(`User not authorized to log out.`);
        }
        const userId = await users.findId(currentToken);
        await users.logout(currentToken);
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
    try {
        const token = req.get('X-Authorization');
        const userInfo = await users.getUserInfo(req.params.id);
        if (userInfo.length === 0 || !userInfo) {
            return res.status(404).send(`User details not found`);
        }
        if (userInfo[0].auth_token === token) {
            return res.status(200).send({firstName: userInfo[0].first_name, lastName: userInfo[0].last_name, email: userInfo[0].email});
        } else {
            return res.status(200).send({firstName: userInfo[0].first_name, lastName: userInfo[0].last_name});
        }
    } catch (err) {
        res.status(500).send(`ERROR get user failed by server`);
    }
};

const editUserInfo = async (req: Request, res: Response):Promise<any> => {
    const userId = req.params.id;
    const newFirst = req.body.firstName;
    const newLast = req.body.lastName;
    const newEmail = req.body.email;
    const newPass = req.body.password;
    const oldPass = req.body.currentPassword;

    try {
        const token = req.get("X-Authorization");
        const userInfoExists = await users.getUserInfo(userId);

        if (userInfoExists.length === 0) {
            res.status(404).send("No user exists");
            return;
        }
        if (!token) {
            res.status(401).send("Unauthorized user");
            return;
        }
        if (token !== userInfoExists[0].auth_token) {
            res.status(403).send("Forbidden, not your token.");
            return;
        }
        if (newPass !== undefined && oldPass === undefined) {
            res.status(400).send("New password not provided");
            return;
        } else {
            if (newEmail !== undefined && !(newEmail.includes("@"))) {
                res.status(400).send("Email must contain '@'");
                return;
            }
            if (newPass !== undefined) {
                if (!newPass.trim()) {
                    res.status(400).send("Password cannot be empty.");
                    return;
                }
            }
            const result = await users.editUserInfo(userId, newFirst, newLast, newEmail, newPass, oldPass);
            if (result === -1) {
                return res.status(400).send(`Incorrect password.`);
            } else {
                return res.status(200).send("Edit successful.")
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR trying to edit user`);
    }
};

const getUserImage = async (req: Request, res: Response):Promise<any> => {
    try {
        const userInfo = await users.getUserImage(req.params.id);
        if (userInfo.length === 0) {
            return res.status(404).send(`Not Found the user.`);
        } else if (userInfo[0].image_filename === null) {
            res.status(404).send("User does not have a image.");
            return;
        } else {
            const imageType = userInfo[0].image_filename.split('.')[1];
            if (imageType === 'jpg' || imageType === 'jpeg') {
                res.setHeader('content-type', 'image/jpeg');
            } else if (imageType === 'png') {
                res.setHeader('content-type', 'image/png');
            } else if (imageType === 'gif') {
                res.setHeader('content-type', 'image/gif');
            }
            const path = await fs.readFile(imageDirectory + userInfo[0].image_filename);
            res.status(200).send(path);
        }
    } catch (err) {
        res.status(500).send('ERROR with image from server');
    }
};

const editUserImage = async (req: Request, res: Response):Promise<any> => {
    const userId = req.params.id;
    try {
        const token = req.get("X-Authorization");
        const userInfoExists = await users.getUserInfo(userId);
        const ContentType= req.header('Content-Type');

        if (userInfoExists.length === 0) {
            res.status(404).send("No user exists");
            return;
        }
        if (!token) {
            res.status(401).send("Unauthorized user");
            return;
        }
        if (token !== userInfoExists[0].auth_token) {
            res.status(403).send("Forbidden, not your token.");
            return;
        } else {
            const imageExtension = ContentType.slice(ContentType.indexOf('/') + 1);

            if (ContentType !== 'image/png' && ContentType !== 'image/jpeg' && ContentType !== 'image/gif') {
                return res.status(400).send(`Wrong image type.`);
            } else {
                if (imageExtension === 'jpg' || imageExtension === 'jpeg') {
                    res.setHeader('content-type', 'image/jpeg');
                } else if (imageExtension === 'png') {
                    res.setHeader('content-type', 'image/png');
                } else if (imageExtension === 'gif') {
                    res.setHeader('content-type', 'image/gif');
                }
            }

            const fileSystemPath = imageDirectory + "/user_" + userId + '.' + imageExtension;
            const filename = 'user_' + userId + '.' + imageExtension;
            await fs.writeFile(fileSystemPath, req.body);
            await users.editUserImage(userId, filename);
            if (userInfoExists[0].image_filename !== null) {
                return res.status(200).send(`Set photo successfully.`);
            } else {
                return res.status(201).send(`Create photo successfully.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR with image from server`);
    }
};

const deleteUserImage = async (req: Request, res: Response):Promise<any> => {
    const id = req.params.id;
    try {
        const token = req.get('X-Authorization');
        if (!token) {
            res.status(401).send("Unauthorized user");
            return;
        }
        const userId = await users.findId(token);
        const userInfoExists = await users.getUserInfo(userId);
        if (userInfoExists.length === 0) {
            res.status(404).send("No user exists");
            return;
        }

        if (userInfoExists[0].auth_token === token) {
            if (userInfoExists[0].image_filename !== null) {
                // await fs.unlink(imageDirectory + userInfoExists[0].id.image_filename);
                await users.deleteUserImage(id);
                return res.status(200).send(`Deleted image`);
            } else {
                return res.status(404).send(`Image not found`);
            }
        } else {
            if (userId !== 0) {
                return res.status(403).send(`Forbidden.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR deleting image by server`);
    }
};


export {register, login, logout, getUserInfo, editUserInfo, getUserImage, editUserImage, deleteUserImage}