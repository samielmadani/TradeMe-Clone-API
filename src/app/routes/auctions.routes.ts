import {Express} from "express";
import {rootUrl} from "./base.routes"
import * as auctions from '../controllers/auctions.controller';

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .post(auctions.viewAuction);

    app.route(rootUrl + '/auctions')
        .post(auctions.addAuction);

    app.route(rootUrl + '/auctions/:id')
        .post(auctions.getAuctionInfo);

    app.route(rootUrl + '/auctions/:id')
        .post(auctions.editAuctionInfo);

    app.route(rootUrl + '/auctions/:id')
        .post(auctions.deleteAuction);

    app.route(rootUrl + '/auctions/categories')
        .post(auctions.categories)

    app.route(rootUrl + '/auctions/:id/image')
        .post(auctions.getAuctionImage);

    app.route(rootUrl + '/auctions/:id/image')
        .post(auctions.editAuctionImage);

    app.route(rootUrl + '/auctions/:id/bids')
        .post(auctions.getAuctionBids);

    app.route(rootUrl + '/auctions/:id/bids')
        .post(auctions.placeBid);

};