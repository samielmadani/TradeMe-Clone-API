import {Express} from "express";
import {rootUrl} from "./base.routes"
import * as users from '../controllers/users.controller';

module.exports = (app: Express) => {
    app.route(rootUrl + '/users/register')
        .post(users.register);

    app.route(rootUrl + '/login')
        .post(users.login);

    app.route(rootUrl + '/users/logout')
        .post(users.logout);

    app.route(rootUrl + '/users/:id')
        .get(users.getUserInfo)
        .patch(users.editUserInfo);

    app.route(rootUrl + '/users/:id/image')
        .get(users.getUserImage)
        .put(users.editUserImage)
        .delete(users.deleteUserImage);
};