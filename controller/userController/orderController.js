const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const wishlistSchema = require('../../model/wishlistSchema')
const orderSchema = require('../../model/orderSchema')
const { ObjectId } = require('mongodb')


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = req.session.cart;
        const address = req.session.address;

        const { paymentMethod } = req.body; 
        

        if (!cart || cart.cartItems.length === 0) {
            return res.status(400).json({message:'No items in cart to place an order.'});
        }

        // Prepare order details
        const order = new orderSchema({
            userId: new ObjectId(userId),
            address: address, // Use the selected address
            items: cart.cartItems.map(item => ({
                productId: item.productId._id,
                productName: item.productId.productName,
                productPrice: item.productId.productPrice,
                productImage: item.productId.productImage[0]
            })),
            paymentMethod: paymentMethod,
            totalAmount: cart.subtotal + cart.deliveryCharge - cart.promotionAmount
        });

        // Save the order
        const savedOrder = await order.save();

        // Reduce product stock
        const updateStockPromises = cart.cartItems.map(async (item) => {
            const productId = item.productId._id;
            const quantity = item.quantity; // assuming you have quantity in the cart
            await productSchema.updateOne(
                { _id: productId },
                { $inc: { stock: -quantity } } // reduce stock by the quantity ordered
            );
        });

        // Wait for all stock updates to finish
        await Promise.all(updateStockPromises);

        // Clear the cart from the database
        await cartSchema.deleteOne({ userId: new ObjectId(userId) });

        // Clear the cart session
        req.session.cart = null;
        res.status(201).json({ success: true, orderId: savedOrder._id });
    } catch (error) {
        console.error(`Error placing order: ${error}`);
        res.status(500).json({message:'Internal Server Error'});
    }
};

const orderConfirmed = async(req,res) => {
    try{
        const user = req.session.user
        const orderId = req.params.orderId

        const category = await categorySchema.find()

        const order = await orderSchema.findById(orderId).populate('items.productId');
        res.render('user/orderConfirmation', {title:'Order Confirmation', user, order, category})
    }
    catch(error){
        console.log(`Error in loading order confirmation page, ${error}`)
    }
}




module.exports = {
    placeOrder,
    orderConfirmed,

}