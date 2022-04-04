import {getPool} from "../../config/db";
import fs from 'mz/fs';
import * as defaultUsers from "../resources/default_users.json"

const imageDirectory = './storage/images/';

const defaultPhotoDirectory = './storage/default/';
import Logger from "../../config/logger";
import {Request, Response} from "express";
import {getUserInfo} from "./users.model";

const auctionOwner = async (auctionID: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT seller_id FROM auction WHERE id = ?', [auctionID]);
    connection.release();
    return result;
}

const viewAuctions = async (q: string, categoryID: string, sellerID: string, bidderID: string, sortBy: string) : Promise<any> => {
    let script = 'SELECT auction.id as auctionId, auction.title as title, auction.category_id as categoryId, auction.seller_id as sellerId, user.first_name as sellerFirstName, user.last_name as sellerLastName, auction.reserve as reserve,  ' +
        'COUNT(auction_bid.auction_id) AS numBids, ' +
        'MAX(auction_bid.amount) AS highestBid, ' +
        'auction.end_date as endDate, auction.description as description ' +
        'FROM auction ' +
        'LEFT JOIN auction_bid ON auction_bid.auction_id = auction.id ' +
        'JOIN user ON user.id = auction.seller_id WHERE 1 ';

    if (q !== "") {
        script += 'AND title LIKE "%' + q + '%" OR description LIKE "%' + q + '%" ';
    }
    if (categoryID !== "-1") {
        script += 'AND category_id=' + categoryID + ' ';
    }
    if (sellerID !== "-1") {
        script += 'AND seller_id=' + sellerID + ' ';
    }
    if (bidderID !== "-1") {
        script += 'AND auction_bid.user_id=' + bidderID + ' ';
    }
    script += 'GROUP BY auction.id ';
    const sorting = sortBy.split("_");
    if (sorting[0] === "ALPHABETICAL") {
        script += 'ORDER BY title '
    } else if (sorting[0] === "BIDS") {
        script += 'ORDER BY amount '
    } else if (sorting[0] === "CLOSING") {
        script += 'ORDER BY auction.end_date '
    } else if (sorting[0] === "RESERVE") {
        script += 'ORDER BY reserve '
    }
    if (sorting[1] === "ASC") {
        script += 'ASC, auction.id '
    } else if (sorting[0] === "SOON") {
        script += 'ASC, auction.id '
    } else if (sorting[0] === "DESC") {
        script += 'DESC, auction.id '
    } else if (sorting[0] === "LAST") {
        script += 'DESC, auction.id '
    }
    const [result] = await getPool().query(script);
    return result;
};

const addAuction = async (newTitle: string, newDesc: string, newEnd: string, newRes: number, sellerId: number, newCat: number):Promise<any> => {
    const connection = await getPool().getConnection();
    const result = await connection.query( `INSERT INTO auction (title, description, end_date, reserve, seller_id, category_id) VALUES (?, ?, ?, ?, ?, ?)`, [newTitle, newDesc, newEnd, newRes, sellerId, newCat] );
    connection.release();
    return result;
};

const getAuctionInfo = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query(`SELECT * FROM auction WHERE id = ?`, [auctionID]);
    connection.release();
    return result;
};

const editAuctionInfo = async (auctionId: string, newTitle: string, newDesc: string, newEnd: string, newRes: string, newCat: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const auctionToUpdate = await getAuctionInfo(auctionId);
    if (newTitle) {
        auctionToUpdate[0].title = newTitle;
    }

    if (newDesc) {
        auctionToUpdate[0].description = newDesc;
    }

    if (newEnd) {
        auctionToUpdate[0].end_date = newEnd;
    }

    if (newRes) {
        auctionToUpdate[0].reserve = newRes;
    }

    auctionToUpdate[0].category_id = newCat;

    await connection.query(`UPDATE auction SET title = ?, description = ?, end_date = ?, reserve = ?, category_id = ? WHERE id = ?`,
        [auctionToUpdate[0].title,
         auctionToUpdate[0].description,
         auctionToUpdate[0].end_date,
         auctionToUpdate[0].reserve,
         auctionToUpdate[0].category_id]);

    connection.release();
};

const deleteAuction = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    await connection.query(`DELETE FROM auction WHERE id = ${auctionID}`);
    connection.release();
};

const categories = async ():Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query(`SELECT id as categoryId, name FROM category`);
    connection.release();
    return result;
};

const oneCategory = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query(`SELECT * FROM category WHERE id = '${auctionID}'`);
    connection.release();
    return result;
};

const getAuctionImage = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [rows] = await connection.query(`SELECT image_filename FROM auction WHERE id = '${auctionID}'`);
    connection.release();
    return rows;
};

const editAuctionImage = async (auctionID: string, filename: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query(`UPDATE auction SET image_filename = ? WHERE id = ?`, [filename, auctionID]);
    connection.release();
    return result;
};

const getAuctionBids = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [results] = await connection.query("SELECT auction_bid.user_id AS bidderId, auction_bid.amount AS amount, user.first_name AS firstName, user.last_name AS lastName, auction_bid.timestamp AS timestamp FROM auction_bid JOIN user ON auction_bid.user_id = user.id WHERE auction_bid.auction_id = ? ORDER BY auction_bid.amount DESC", [auctionID]);
    connection.release();
    return results;
};

const topBid = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const topBidder = await connection.query(`SELECT max(amount) FROM auction_bid GROUP by AMOUNT`);
    connection.release();
    return topBidder;
};

const placeBid = async (auctionId: string, userId: string, amount: string, time: Date):Promise<any> => {
    const connection = await getPool().getConnection();
    const bidMade = await connection.query(`INSERT INTO auction_bid (auction_id, user_id, amount, timestamp) VALUES (?, ?, ?, ?)`, [auctionId, userId, amount, time]);
    connection.release();
    return bidMade;
};

export {auctionOwner, viewAuctions, addAuction, oneCategory, topBid, getAuctionInfo, editAuctionInfo, deleteAuction, categories, getAuctionImage, editAuctionImage, getAuctionBids, placeBid}