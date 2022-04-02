import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as auctions from '../models/auctions.model';
import * as users from '../models/users.model';
import fs from "mz/fs";

const imageDirectory = './storage/images/';
const defaultPhotoDirectory = './storage/default/';


const viewAuction = async (req: Request, res: Response):Promise<any> => {
    return ;
};

const addAuction = async (req: Request, res: Response):Promise<any> => {
    const newTitle = req.body.title;
    const newDesc = req.body.description;
    const newEnd = req.body.end_date;
    let newRes;
    newRes = req.body.reserve;
    const newCat = req.body.category_id;

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
        if (newEnd === null) {
            res.status(404).send("End Date not provided");
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
        await auctions.addAuction(newTitle, newDesc, newEnd, newRes, sellerId, newCat);
        return res.status(200).send("Edit successful.");
    } catch (err) {
        res.status(500).send(`ERROR trying to edit auction from server`);

    }
};

const getAuctionInfo = async (req: Request, res: Response):Promise<any> => {
    try {
        const auctionInfo = await auctions.getAuctionInfo(req.params.id);
        if (auctionInfo.length === 0 || !auctionInfo) {
            return res.status(404).send(`Auction details not found`);
        }

        const userInfo = await users.getUserInfo(auctionInfo[0].seller_id);
        const auctionBids = await auctions.getAuctionBids(req.params.id);
        const topBidder = await auctions.topBid(req.params.id);
        return res.status(200).send(
            {"auctionId": req.params.id,
            "title": auctionInfo[0].title,
            "categoryId": auctionInfo[0].category_id,
            "sellerId": auctionInfo[0].seller_id,
            "sellerFirstName": userInfo[0].first_name,
            "sellerLastName": userInfo[0].last_name,
            "reserve": auctionInfo[0].reserve,
            "numBids": auctionBids[0].length,
            "highestBid": topBidder,
            "endDate": auctionInfo[0].end_date,
            "description": auctionInfo[0].description});
    } catch (err) {
        res.status(500).send(`ERROR get user failed by server`);
    }
};

const editAuctionInfo = async (req: Request, res: Response):Promise<any> => {
    const auctionId = req.params.id;
    const newTitle = req.body.title;
    const newDesc = req.body.description;
    const newEnd = req.body.end_date;
    const newRes = req.body.reserve;
    const newCat = req.body.category_id;

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
        if (userId.length === 0) {
            res.status(404).send("User does not exist");
            return;
        }
        if (userId[0].id !== ownerId) {
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
            res.status(403).send("Cannot delete auction with bids");
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
    res.status(500).send(`ERROR trying to edit auction from server`);

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
    if (ownerId.length === 0) {
        res.status(404).send("Auction not found");
        return;
    }
    if (userId.length === 0) {
        res.status(404).send("User does not exist");
        return;
    }
    if (userId[0].id !== ownerId) {
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
        res.status(403).send("Cannot delete auction with bids");
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
        return res.status(200).send(categoryInfo);
    } catch (err) {
        res.status(500).send(`ERROR getting categories from server`);
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
            res.status(200).send(path);
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
    return ;
};

const placeBid = async (req: Request, res: Response):Promise<any> => {
    try {
        const currentToken = req.get('X-Authorization');
        if (currentToken === undefined) {
            res.status(401).send("Unauthorized");
            return;
        }
        const auctionId = req.params.id;
        const currentUserId = await users.findId(currentToken);
        const userInfoExists = await users.getUserInfo(currentUserId);
        // * Not finished. */
    } catch (err) {
        res.status(500).send(`ERROR with image from server` + `${err}`);
    }
};

export {viewAuction, addAuction, getAuctionInfo, editAuctionInfo, deleteAuction, categories, getAuctionImage, editAuctionImage, getAuctionBids, placeBid}