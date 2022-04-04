import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auctions.model';
import * as users from '../models/users.model';
import fs from "mz/fs";
import {type} from "os";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';


const viewAuction = async (req: Request, res: Response):Promise<any> => {
    try {
        const sortByValues = ["ALPHABETICAL_ASC", "ALPHABETICAL_DESC", "BIDS_ASC", "BIDS_DESC", "CLOSING_SOON", "CLOSING_LAST", "RESERVE_ASC", "RESERVE_DESC"];
        let start;
        if (req.query.start) {
            start = parseInt(JSON.stringify(req.query.start).replace(/['"]+/g, ''), 10);
        } else {
            start = 0;
        }

        let end;
        if (req.query.end) {
            end = parseInt(JSON.stringify(req.query.end).replace(/['"]+/g, ''), 10);
        } else {
            end = Infinity;
        }

        let q;
        if (req.query.q) {
            q = JSON.stringify(req.query.q).replace(/['"]+/g, '');
        } else {
            q = "";
        }

        let categoryId;
        if (req.query.categoryIds) {
            categoryId = JSON.stringify(req.query.categoryIds).replace(/['"]+/g, '');
        } else {
            categoryId = "-1";
        }

        let sellerId;
        if (req.query.sellerId) {
            sellerId = JSON.stringify(req.query.sellerId).replace(/['"]+/g, '')
        } else {
            sellerId = "-1";
        }

        let bidderId;
        if (req.query.bidderId) {
            bidderId = JSON.stringify(req.query.bidderId).replace(/['"]+/g, '')
        } else {
            bidderId = "-1";
        }

        let sortBy;
        if (req.query.sortBy) {
            sortBy = JSON.stringify(req.query.sortBy).replace(/['"]+/g, '')
        } else {
            sortBy = "CLOSING_SOON";
        }

        if (sortByValues.indexOf(sortBy) < 0) {
            res.status (400).send("Bad Request");
            return;
        }

        if (categoryId !== "-1" && !await auctions.oneCategory(categoryId)) {
            res.status(400).send ("Bad Request");
            return;
        }

        const result = await auctions.viewAuctions(q, categoryId, sellerId, bidderId, sortBy);
        res.status(200).send({"auctions": result.slice(start, Math.min(result.length, start + end)), "count": result.length});
        } catch (err) {
            res.status( 500 ).send ("Internal Server Error");
        }
};

const addAuction = async (req: Request, res: Response):Promise<any> => {
    const newTitle = req.body.title;
    const newDesc = req.body.description;
    const newEnd = req.body.endDate;
    let newRes;
    newRes = req.body.reserve;
    const newCat = req.body.categoryId;

    try {
        const currentToken = req.get('X-Authorization');
        if (currentToken === undefined) {
            res.status(401).send("Unauthorized");
            return;
        }
        const sellerId = await users.findId(currentToken);
        if (newTitle === null) {
            res.status(404).send("Title not provided");
            return;
        }
        if (newDesc === null) {
            res.status(404).send("Description not provided");
            return;
        }
        if (newEnd === null || newEnd === 0) {
            res.status(404).send("End Date not provided");
            return;
        }
        const end = new Date(newEnd);
        const cur = new Date();
        if (end < cur) {
            res.status(404).send("End date must be in future");
            return;
        }
        if (newRes === null) {
            newRes = 1;
        }
        if (newCat === null) {
            res.status(404).send("New category not provided");
            return;
        } else {
            const catExists = await auctions.oneCategory(newCat);
            if (catExists === null) {
                res.status(404).send("New category invalid");
                return;
            }
        }
        const addedAuc = await auctions.addAuction(newTitle, newDesc, newEnd, newRes, sellerId, newCat);
        return res.status(201).send({"auctionId": addedAuc[0].insertId});
    } catch (err) {
        res.status(500).send(`ERROR trying to edit auction from server ` + err );
    }
};

const getAuctionInfo = async (req: Request, res: Response):Promise<any> => {
    try {
        const auctionInfo = await auctions.getAuctionInfo(req.params.id);
        if (auctionInfo.length === 0 || auctionInfo === null) {
            return res.status(404).send(`Auction details not found`);
        }
        const bidInfo = await auctions.getAuctionBids(req.params.id);
        let topBid;
        let numBids;
        if (bidInfo.length === 0) {
            topBid = null;
            numBids = 0;
        } else {
            topBid = bidInfo[0].amount;
            numBids = bidInfo.length;
        }
        const sellerInfo = await users.getUserInfo(auctionInfo[0].seller_id);
        if (auctionInfo.length === 0) {
            res.status(404).send("User not found")
            return;
        }
        return res.status(200).send(
            {"auctionId": parseInt(req.params.id, 10),
            "title": auctionInfo[0].title,
            "categoryId": auctionInfo[0].category_id,
            "sellerId": auctionInfo[0].seller_id,
            "sellerFirstName": sellerInfo[0].first_name,
            "sellerLastName": sellerInfo[0].last_name,
            "reserve": auctionInfo[0].reserve,
            "numBids": numBids,
            "highestBid": topBid,
            "endDate": auctionInfo[0].end_date,
            "description": auctionInfo[0].description});
    } catch (err) {
        res.status(500).send(`ERROR get user failed by server ` + err);
    }
};

const editAuctionInfo = async (req: Request, res: Response):Promise<any> => {
    const auctionId = req.params.id;
    const newTitle = req.body.title;
    const newDesc = req.body.description;
    const newEnd = req.body.endDate;
    const newRes = req.body.reserve;
    const newCat = req.body.categoryId;

    try {
        const currentToken = req.get('X-Authorization');
        if (currentToken === undefined) {
            res.status(401).send("Unauthorized");
            return;
        }
        const userId = await users.findId(currentToken);
        const ownerId = await auctions.auctionOwner(auctionId);
        if (ownerId.length === 0) {
            res.status(404).send("Auction not found");
            return;
        }
        if (userId === null) {
            res.status(404).send("User does not exist");
            return;
        }
        if (userId !== ownerId[0].seller_id) {
            res.status(403).send("Forbidden");
            return;
        }
        const auctionInfo = await auctions.getAuctionInfo(auctionId);
        if (auctionInfo.length === 0) {
            res.status(404).send("Auction does not exist");
            return;
        }
        const numberOfBids = await auctions.getAuctionBids(auctionId)
        if (numberOfBids.length !== 0) {
            res.status(403).send("Cannot edit auction with bids");
            return;
        }
        if (newCat !== null) {
            const catExists = await auctions.oneCategory(newCat);
            if (catExists === null) {
                res.status(404).send("New category invalid");
                return;
            }
        }
        await auctions.editAuctionInfo(auctionId, newTitle, newDesc, newEnd, newRes, newCat);
        return res.status(200).send("Edit successful.");
    } catch (err) {
    res.status(500).send(`ERROR trying to edit auction from server` + (err));

    }

};

const deleteAuction = async (req: Request, res: Response):Promise<any> => {
    const auctionId = req.params.id;
    const currentToken = req.get('X-Authorization');
    if (currentToken === undefined) {
        res.status(401).send("Unauthorized");
        return;
    }
    const userId = await users.findId(currentToken);
    const ownerId = await auctions.auctionOwner(auctionId);
    if (ownerId === null) {
        res.status(404).send("Auction not found");
        return;
    }
    if (userId === null) {
        res.status(404).send("User does not exist");
        return;
    }
    if (userId !== ownerId[0].seller_id) {
        res.status(403).send("Forbidden");
        return;
    }
    const numberOfBids = await auctions.getAuctionBids(auctionId)
    if (numberOfBids.length !== 0) {
        res.status(403).send("Cannot delete auction with bids");
        return;
    }
    const auctionInfo = await auctions.getAuctionInfo(auctionId);
    if (auctionInfo.length === 0) {
        res.status(404).send("Auction does not exist");
        return;
    }
    try {
        await auctions.deleteAuction(auctionId);
        res.status(200).send("Auction deleted");
    } catch (err) {
        res.status(500).send(`ERROR deleting auction from server`);
    }
};

const categories = async (req: Request, res: Response):Promise<any> => {
    try {
        const categoryInfo = await auctions.categories();
        if(categoryInfo.length === 0) {
            res.status(200).send([]);
            return;
        } else {
            return res.status(200).send(categoryInfo);
        }
    } catch (err) {
        res.status(500).send(`ERROR getting categories from server ` + err);
        return;
    }
};

const getAuctionImage = async (req: Request, res: Response):Promise<any> => {
    try {
        const auctionInfo = await auctions.getAuctionImage(req.params.id);
        if (auctionInfo.length === 0) {
            return res.status(404).send(`Auction not found.`);
        } else if (auctionInfo[0].image_filename === null) {
            res.status(404).send("Auction does not have a image.");
            return;
        } else {
            const imageType = auctionInfo[0].image_filename.split('.')[1];
            if (imageType === 'jpg' || imageType === 'jpeg') {
                res.setHeader('content-type', 'image/jpeg');
            } else if (imageType === 'png') {
                res.setHeader('content-type', 'image/png');
            } else if (imageType === 'gif') {
                res.setHeader('content-type', 'image/gif');
            }
            const path = await fs.readFile(imageDirectory + auctionInfo[0].image_filename);
            Logger.info(path);
            res.status(200).send(path);
            return;
        }
    } catch (err) {
        res.status(500).send("ERROR with server." + `${err}`);
    }
};

const editAuctionImage = async (req: Request, res: Response):Promise<any> => {
    try {
        const auctionId = req.params.id;
        const currentToken = req.get("X-Authorization");
        const currentUserId = await users.findId(currentToken);
        const userInfoExists = await users.getUserInfo(currentUserId);
        const ContentType= req.header('Content-Type');

        if (userInfoExists.length === 0) {
            res.status(404).send("No user exists");
            return;
        }
        if (!currentToken) {
            res.status(401).send("Unauthorized user");
            return;
        }
        const auctionInfo = await auctions.getAuctionInfo(auctionId);
        if (auctionInfo.length === 0) {
            res.status(404).send("Auction does not exist");
            return;
        }
        if (currentUserId !== auctionInfo[0].seller_id) {
            res.status(403).send("Forbidden, not your auction.");
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

            const fileSystemPath = imageDirectory + "/auctions_" + auctionId + '.' + imageExtension;
            await fs.writeFile(fileSystemPath, req.body);
            const filename = 'auction_' + auctionId + '.' + imageExtension;
            await auctions.editAuctionImage(auctionId, filename);
            if (userInfoExists[0].image_filename !== null) {
                return res.status(200).send(`Set photo successfully.`);
            } else {
                return res.status(201).send(`Create photo successfully.`);
            }
        }
    } catch (err) {
        res.status(500).send(`ERROR with image from server` + `${err}`);
    }
};

const getAuctionBids = async (req: Request, res: Response):Promise<any> => {
    try {
        const auctionId = req.params.id;
        const auctionInfo = await auctions.getAuctionInfo(auctionId);
        if (auctionInfo.length === 0) {
            res.status(404).send("Auction does not exist");
            return;
        }

        const bids = await auctions.getAuctionBids(auctionId);
        if (bids.length === 0) {
            return res.status(200).send([]);
        } else {
            return res.status(200).send(bids);
        }


    } catch (err) {
        res.status(500).send(`ERROR with image from server` + `${err}`);
    }
};

const placeBid = async (req: Request, res: Response):Promise<any> => {
    try {
        const aucId = req.params.id;
        const currentToken = req.get('X-Authorization');
        if (currentToken === undefined) {
            res.status(401).send("Unauthorized");
            return;
        }
        const userId = await users.findId(currentToken);
        const ownerId = await auctions.auctionOwner(aucId);
        if (ownerId === null) {
            res.status(404).send("Auction not found");
            return;
        }
        if (userId === null) {
            res.status(404).send("User does not exist");
            return;
        }
        if (userId === ownerId[0].seller_id) {
            res.status(403).send("Cannot bid on your own auction");
            return;
        }
        const auctionInfo = await auctions.getAuctionInfo(aucId);
        if (auctionInfo.length === 0) {
            res.status(404).send("Auction does not exist");
            return;
        }

        const end = new Date(auctionInfo.endDate);
        const cur = new Date();
        if (end < cur) {
            res.status(404).send("Auction has ended");
            return;
        }
        const numberOfBids = await auctions.getAuctionBids(aucId)
        if (numberOfBids.length !== 0) {
            const top = numberOfBids[0];
            if (parseInt(req.body.amount, 10) >= parseInt(top, 10)) {
                return res.status(404).send("Bid amount must be greater than top bidder");
            }
        }

        const makeBid = await auctions.placeBid(aucId, userId, req.body.amount, cur);
        return res.status(201).send(makeBid);
    } catch (err) {
        res.status(500).send(`ERROR with image from server ` + err);
    }
};

export {viewAuction, addAuction, getAuctionInfo, editAuctionInfo, deleteAuction, categories, getAuctionImage, editAuctionImage, getAuctionBids, placeBid}