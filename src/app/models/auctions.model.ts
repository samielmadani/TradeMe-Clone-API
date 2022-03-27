import {getPool} from "../../config/db";
import fs from 'mz/fs';
import * as defaultUsers from "../resources/default_users.json"

const imageDirectory = './storage/images/';

const defaultPhotoDirectory = './storage/default/';
import Logger from "../../config/logger";
import {Request, Response} from "express";

const viewAuction = async (): Promise<void> => {
    return ;
};

const addAuction = async ():Promise<void> => {
    return ;
};

const getAuctionInfo = async ():Promise<void> => {
    return ;
};

const editAuctionInfo = async ():Promise<void> => {
    return ;
};

const deleteAuction = async ():Promise<void> => {
    return ;
};

const categories = async ():Promise<void> => {
    return ;
};

const getAuctionImage = async ():Promise<void> => {
    return ;
};

const editAuctionImage = async ():Promise<void> => {
    return ;
};

const getAuctionBids = async ():Promise<void> => {
    return ;
};

const placeBid = async ():Promise<void> => {
    return ;
};

export {viewAuction, addAuction, getAuctionInfo, editAuctionInfo, deleteAuction, categories, getAuctionImage, editAuctionImage, getAuctionBids, placeBid}