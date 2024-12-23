const categorySchema = require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')
const offerSchema = require('../../model/offerSchema')
const { ObjectId } = require('mongodb')
const mongoose = require('mongoose');



const offers = async(req,res) => {
    try{
        const offers = await offerSchema.find()
        // const offers = await offerSchema.find().populate({path: 'referenceId'})

        console.log(offers);

        const products = await productSchema.find({isActive:true})
        const category = await categorySchema.find({isBlocked:false})

        const searchQuery = req.query.searchQuery || ''
        res.render('admin/Offers', {title:'Offers', offers, searchQuery, products, category})
    }
    catch(error){
        console.log(`Error in rendering offer page, ${error}`)
    }
}

const addOfferPost = async (req, res) => {
    try {
        const { offerTitle, offerType, referenceId, discountPercent } = req.body;
        console.log('Reference ID: ', referenceId)

        // Check for missing fields
        if (!offerTitle || !offerType || (offerType !== 'none' && !referenceId) || !discountPercent) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check for valid discount percent
        if (discountPercent > 100) {
            return res.status(400).json({ message: 'Discount amount cannot exceed 100%' });
        }

        // Check if the offer already exists
        const offerExists = await offerSchema.findOne({ offerTitle });
        if (offerExists) {
            return res.status(400).json({ message: 'Offer Already Exists' });
        }

        // Delete existing offers
        await offerSchema.deleteMany({ referenceId });

        // Handle category offers
        if (offerType === 'category') {
            const category = await categorySchema.findById(referenceId);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }

            // Add new category offer
            const newOffer = new offerSchema({
                offerTitle,
                offerType,
                referenceId: category._id,
                discountPercent,
            });
            await newOffer.save();

            // Update all products under this category
            const allProducts = await productSchema.find({ productCategory: category._id });
            console.log('All products under this category are : ', allProducts)
            const bulkOperations = allProducts.map(product => ({
                updateOne: {
                    filter: { _id: product._id },
                    update: { productDiscount: discountPercent },
                },
            }));

            if (bulkOperations.length > 0) {
                await productSchema.bulkWrite(bulkOperations);
            }

            return res.status(200).json({ message: 'Offer added successfully for the products under ' + category.name });
        }

        // Handle product offers
        if (offerType === 'product') {
            const product = await productSchema.findById(referenceId);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Add new product offer
            const newOffer = new offerSchema({
                offerTitle,
                offerType,
                referenceId: product._id,
                discountPercent,
            });
            await newOffer.save();

            // Update product discount and discount price
            product.productDiscount = discountPercent;
            await product.save();

            return res.status(200).json({ message: 'Offer added successfully to product ' + product.productName });
        }

        return res.status(400).json({ message: 'Invalid offer type' });
    } catch (error) {
        console.error(`Error from addOfferPost: ${error}`);
        return res.status(500).json({ message: 'An error occurred while adding the offer' });
    }
};

const editOfferPost = async(req,res) => {
    try{
        const { offerTitle, offerType, referenceId, discountPercent } = req.body;
    
            // Validate required fields
            if (!offerTitle || !offerType || !referenceId || !discountPercent) {
                return res.status(400).json({ message: 'All fields are required' });
            }
    
            // Update the offer
            const updatedOffer = await offerSchema.findByIdAndUpdate(
                req.params.id,
                { offerTitle, offerType, referenceId, discountPercent },
                { new: true }
            );
    
            if (!updatedOffer) {
                return res.status(404).json({ message: 'Offer not found' });
            }
    
            res.status(200).json({ message: 'Offer updated successfully!' });
    }
    catch(error){
        console.log('Error in editing offer page: ', error)
    }
}

const editOffer = async(req,res) => {
        try {
            const offerId = req.params.id

            const offers = await offerSchema.findById(offerId).populate('referenceId')
            const products = await productSchema.find({isActive:true})
            const category = await categorySchema.find({isBlocked:false})

            const searchQuery = req.query.searchQuery || ''

        let referenceName = offers.referenceId ? offers.referenceId.name : 'Unknown';
        console.log(referenceName);  

            res.render('admin/editOffer', {title:'Edit Offer', offers, searchQuery, products, category, offerId, referenceName})
    }
    catch(error){
        console.log(`Error in  rendering edit offer, ${error}`)
    }
}

const deleteOffer = async(req,res) => {
    try{
        const offerId = req.params.id
        const deletedOffer = await offerSchema.findByIdAndDelete(offerId);
        if (!deletedOffer) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        res.status(200).json({message:'Offer deleted Successfully'})
    }
    catch(error){
        console.log(`Error in deleting an offer, ${error}`)
    }
}

const offerById = async(req,res) => {
    try{
        const offer = await offerSchema.findById(req.params.id);
        if (!offer) {
            return res.status(400).json({ message: 'Offer not found' });
        }
        res.status(200).json(offer);
    }
    catch(error){
        console.log(`Error in getting offer by id, ${error}`)
    }
}
module.exports = {
    offers,
    addOfferPost,
    editOffer,
    editOfferPost,
    deleteOffer,
    offerById,
}