import {getPool} from "../../config/db";
import fs from 'mz/fs';
import * as defaultUsers from "../resources/default_users.json"

const imageDirectory = './storage/images/';

const defaultPhotoDirectory = './storage/default/';
import Logger from "../../config/logger";
import {Request, Response} from "express";

const auctionOwner = async (auctionID: string): Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT seller_id FROM auction WHERE id = ?', [auctionID]);
    connection.release();
    return result;
}

const viewAuction = async (): Promise<any> => {
    return ;
};

const addAuction = async ():Promise<any> => {
    return ;
};

const getAuctionInfo = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query(`SELECT * FROM auction_bid WHERE id = ${auctionID}`);
    connection.release();
    return result;
};

const editAuctionInfo = async ():Promise<any> => {
    return ;
};

const deleteAuction = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    await connection.query(`DELETE FROM auction WHERE id = ${auctionID}`);
    connection.release();
};

const categories = async ():Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('SELECT category.id, category.name FROM category');
    connection.release();
    return result;
};

const getAuctionImage = async (auctionID: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [rows] = await connection.query(`SELECT image_filename FROM auction WHERE id = ${auctionID}`);
    connection.release();
    return rows;
};

const editAuctionImage = async (auctionID: string, filename: string):Promise<any> => {
    const connection = await getPool().getConnection();
    const [result] = await connection.query('UPDATE auction SET image_filename = ? WHERE id = ?', [filename, auctionID]);
    connection.release();
    return result;
};

const getAuctionBids = async (auctionID: string):Promise<any> => {
    return ;
};

const placeBid = async ():Promise<any> => {
    return ;
};


export {auctionOwner, viewAuction, addAuction, getAuctionInfo, editAuctionInfo, deleteAuction, categories, getAuctionImage, editAuctionImage, getAuctionBids, placeBid}