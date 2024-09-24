const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const { ObjectId } = require('mongodb')


const wishlist = async(req, res) => {
    try{
        const user = req.session.user
        const category = await categorySchema.find()
        const wishlist = await wishlistSchema.findOne({user}).populate('product.productId')  
        res.render('user/wishlist',{title:'Wishlist', user, category, wishlist})
    }
    catch(error){
        console.log(`Error in rendering wishlist, ${error}`)
    }
}

const addToWishlist = async(req,res) => {
    try{
        const user = req.session.user
        const productId = req.params.productId

        if (!user) {
            return res.status(401).json({ message: 'User not authenticated. Please log in to add items to your wishlist.' });
        }

        const product = await productSchema.findOne({
            _id: new ObjectId(productId),
            isActive: true,
            stock: { $gt: 0 },
        });

        if (!product) {
            return res.status(400).json({ message: 'Product is out of stock or not available' });
        }

        let wishlist = await wishlistSchema.findOne({ userId: new ObjectId(user) });

        const newWishlistItem = {
            productId: new ObjectId(productId),
            productName : product.productName,
            price : product.productPrice,
            category : product.productCategory,
            productImage: product.productImage 
        }

        if (!wishlist) {
            wishlist = new wishlistSchema({
                userId: new ObjectId(user),
                product: [newWishlistItem],
            });
            await wishlist.save();
            return res.status(200).json({ message: 'Product added to wishlist.' });
    }
    else {
        // Check if the product already exists in the wishlist
        if (wishlist.product.includes(productId)) {
            return res.status(400).json({ message: 'Product is already in your wishlist.' });
        } else {
            // Add the product to the wishlist
            wishlist.product.push(newWishlistItem);
            await wishlist.save();
            return res.status(200).json({ message: 'Product added to wishlist.' });
        }
    }
}
    catch(error){
        console.log(`Error in adding product to wishlist,${error}`)
    }
}


module.exports = {
    wishlist,
    addToWishlist,
}