import {Express} from "express";
import {rootUrl} from "./base.routes"
import * as auctions from '../controllers/auctions.controller';

module.exports = (app: Express) => {
    app.route(rootUrl + '/auctions')
        .get(auctions.viewAuction)
        .post(auctions.addAuction);

    app.route(rootUrl + '/auctions/:id')
        .get(auctions.getAuctionInfo)
        .patch(auctions.editAuctionInfo)
        .delete(auctions.deleteAuction);

    app.route(rootUrl + '/auctions/categories')
        .get(auctions.categories);

    app.route(rootUrl + '/auctions/:id/image')
        .get(auctions.getAuctionImage)
        .put(auctions.editAuctionImage);

    app.route(rootUrl + '/auctions/:id/bids')
        .get(auctions.getAuctionBids)
        .post(auctions.placeBid);

};