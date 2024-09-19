const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const { ObjectId } = require('mongodb')

const checkout = async(req,res) => {
    try {
        const user = req.session.user
        const category = await categorySchema.find({ isBlocked: 0 })
        const cart = await cartSchema.findOne({ userId: new ObjectId(user) }).populate({path: 'product.productId',
        select: 'productName productPrice'});
        
        const userAddress = await userSchema.findOne({ _id: user }, { address: 1, _id: 0 });
        
        // Default to the first address
        let defaultAddress = null;
        if (userAddress && userAddress.address && userAddress.address.length > 0) {
            defaultAddress = userAddress.address[0]; 
        }
        // Calculate subtotal
        const subtotal = cart.product.reduce((total, item) => total + (item.productId.productPrice * item.quantity), 0);

         //delivery charge and promotion amount
        const deliveryCharge = 0.00; // Change this value as needed
        const promotionAmount = 0.00; // Change this value as needed

        res.render('user/checkOut', { title: 'Checkout', user, cart, category, userAddress, defaultAddress, subtotal, deliveryCharge, promotionAmount})
    }
    catch (error) {
        console.log(`Error in rendering checkout page, ${error}`)
    }
}

const updateDefaultAddress = async(req,res) => {
    try{
        const { addressId } = req.body;
        const userId = req.session.user; 

    // Find the user and update the default address
    userSchema.findByIdAndUpdate(userId, { defaultAddress: addressId }, (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update address.' });
        }
        res.json({ success: true, message: 'Default address updated.' });
    });
    }
    catch(error){
        console.log(`Error in selecting default address in checkout page, ${error}`)
    }
}

module.exports = {
    checkout,
    updateDefaultAddress,
}