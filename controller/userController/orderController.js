const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const { ObjectId } = require('mongodb')

const placeOrder = async(req,res) => {
    try{
        const userId = req.session.user; 
        const { addressId, cartItems, paymentMethod } = req.body;

        const address = await userschema.findById(userId, { "address._id": addressId });

        if (!address) {
             return res.status(400).json({ success: false, message: 'Address not found' });
        }

        // Create a new order
        const newOrder = new Order({
            userId: userId,
            address: address.address[0],
            items: cartItems,
            paymentMethod: paymentMethod,
            status: 'Pending',
            orderDate: new Date(),
            totalAmount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) // Calculate total price
        });

        // Save the order
        await newOrder.save();

        // Optionally, update stock of products in cart
        for (const item of cartItems) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        res.json({ success: true, orderId: newOrder._id });
    }
    catch(error){
        console.log(`Error in placing order, ${error}`)
    }
}