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
        const wishlist = await wishlistSchema.findOne({ userId: new ObjectId(user)})
        .populate('product.productId')
        .populate('product.categoryid') 

        res.render('user/wishlist',{title:'Wishlist', user, category, wishlist})
    }
    catch(error){
        console.log(`Error in rendering wishlist, ${error}`)
    }
}

const addToWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        console.log('----------------- user id : ', user)
        const productId = req.params.productId;

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
            price: product.productPrice,
            categoryid: product.productCategory,
            productImage: product.productImage 
        };

        if (!wishlist) {
            wishlist = new wishlistSchema({
                userId: new ObjectId(user._id),
                product: [newWishlistItem],
            });
            await wishlist.save();
            return res.status(200).json({ message: 'Product added to wishlist.' });
        } else {
            // Check if the product already exists in the wishlist
            const existingProduct = wishlist.product.find(item => item.productId.equals(productId));

            if (existingProduct) {
                return res.status(400).json({ message: 'Product is already in your wishlist.' });
            } else {
                // Add the product to the wishlist
                wishlist.product.push(newWishlistItem);
                await wishlist.save();
                return res.status(200).json({ message: 'Product added to wishlist.' });
            }
        }
    } catch (error) {
        console.log(`Error in adding product to wishlist, ${error}`);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteFromWishlist = async(req,res) => {
    try{
        const user = req.session.user
        const productId = req.params.productId
        
        const wishlist = await wishlistSchema.findOne({ userId: user}); 
        
        const productIndex = wishlist.product.findIndex(item => item.productId.equals(productId));

        if (productIndex === -1) {
            return res.status(400).json({ message: 'Product not found in wishlist.' });
        }

        wishlist.product.splice(productIndex, 1);
        await wishlist.save(); 

        return res.status(200).json({ message: 'Product removed from wishlist successfully!' });

    }
    catch(error){
        console.log(`Error in deleting product from Wishlist, ${error}`)
    }
} 

const addToCart = async(req,res) => {
    try{
        const wishlist = await wishlistSchema.findOne({ userId: new ObjectId(user) })
            .populate('product.productId'); 

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found.' });
        }

        const wishlistItem = wishlist.product.find(item => item.productId.equals(new ObjectId(productId)));

        if (!wishlistItem) {
            return res.status(404).json({ message: 'Product not found in wishlist.' });
        }

        const product = await productSchema.findOne({ _id: wishlistItem.productId, isActive: true, stock: { $gt: 0 } });

        if (!product) {
            return res.status(400).json({ message: 'Product is out of stock or not available.' });
        }

        let cart = await cartSchema.findOne({ userId: new ObjectId(user) });

        const newCartItem = {
            productId: wishlistItem.productId,
            quantity: 1, 
            price: wishlistItem.price,
            productImage: wishlistItem.productImage,
            categoryid: wishlistItem.categoryid,
        };

        if (!cart) {
            cart = new cartSchema({
                userId: new ObjectId(user),
                items: [newCartItem],
            });
            await cart.save();
            return res.status(200).json({ message: 'Product added to cart.' });
        } else {
            // Check if the product is already in the cart
            const existingCartItem = cart.items.find(item => item.productId.equals(wishlistItem.productId));

            if (existingCartItem) {
                existingCartItem.quantity += 1; 
            } else {
                cart.items.push(newCartItem);
            }
            await cart.save();
            return res.status(200).json({ message: 'Product added to cart.' });
        }
    }
    catch(error){
        console.log(`Error in adding product to the cart,${error}`)
    }
}


module.exports = {
    wishlist,
    addToWishlist,
    deleteFromWishlist,
    addToCart,
}