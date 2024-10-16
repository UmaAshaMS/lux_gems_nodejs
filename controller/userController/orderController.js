const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const orderSchema = require('../../model/orderSchema')
const walletSchema = require('../../model/walletSchema')
const { ObjectId } = require('mongodb')
const mongoose = require('mongoose');



const placeOrder = async (req, res) => {
    console.log('place order reached......')
    try {
        const userId = req.session.user; 
        const cart = req.session.cart;
        const { addressToSend, selectedPaymentOption } = req.body;
        console.log(req.body)


        if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
            return res.status(400).json({ message: 'No items in cart to place an order.' });
        }

        const totalAmount = cart.subtotal + cart.deliveryCharge - cart.promotionAmount;


        // Check if total amount exceeds ₹1000 for COD
        if (parseInt(selectedPaymentOption) === 0 && totalAmount > 1000) { 
            return res.status(400).json({ message: 'Cash on Delivery is not available for orders above ₹1000.' });
        }


        // check wallet balance for WALLET PAY
        if (parseInt(selectedPaymentOption) === 2) { 
            const userWallet = await walletSchema.findOne({ userId: new ObjectId(userId) }); 
            if (!userWallet || userWallet.balance < totalAmount) {
                return res.status(400).json({ message: 'Insufficient wallet balance to place this order.' });
            }
        }

        // order details
        const order = new orderSchema({
            userId: new ObjectId(userId),
            address: addressToSend,
            items: cart.cartItems.map(item => ({
                productId: item.productId._id,
                productName: item.productId.productName,
                productPrice: item.productId.productPrice,
                productImage: item.productId.productImage[0],
                quantity: item.quantity
            })),
            paymentMethod: selectedPaymentOption, 
            totalAmount: totalAmount
        });

        // Save the order
        const savedOrder = await order.save();

        // Reduce product stock
        const updateStockPromises = cart.cartItems.map(async (item) => {
            const productId = item.productId._id;
            const quantity = item.quantity;
            await productSchema.updateOne(
                { _id: productId },
                { $inc: { stock: -quantity } } 
            );
        });

       
        await Promise.all(updateStockPromises);

        await cartSchema.deleteOne({ userId: new ObjectId(userId) });

        // Clear the cart session
        req.session.cart = null;
        res.status(201).json({ success: true, orderId: savedOrder._id });
    } catch (error) {
        console.error(`Error placing order: ${error}`);
        res.status(500).json({ error: 'Failed to place the order. Please try again later.' });
    }
};


const orderConfirmed = async(req,res) => {
    try{
        const user = req.session.user
        const orderId = req.params.orderId;

        const category = await categorySchema.find()

        const order = await orderSchema.findById(orderId).populate('items.productId');

        // Calculate the expected delivery date
        const orderDate = new Date(order.orderDate);
        const expectedDeliveryDate = new Date(orderDate);
        expectedDeliveryDate.setDate(orderDate.getDate() + 10);

        res.render('user/orderConfirmation', {title:'Order Confirmation', user, order, category, 
        expectedDeliveryDate: expectedDeliveryDate.toDateString()})
    }
    catch(error){
        console.log(`Error in loading order confirmation page, ${error}`)
    }
}

const cancelOrder = async (req, res) => {
    try {
        const {orderId, itemId} = req.params;

        const order = await orderSchema.findById(orderId).populate('items.productId');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update order status 
        order.status = 'Cancelled';
        await order.save();

        // Update stock for each product
        for (const item of order.items) {
            const product = await productSchema.findById(item.productId._id);
            if (product) {
                const quantity = Number(item.quantity);
                const stock = Number(product.stock) || 0; 
                if (!isNaN(quantity)) {
                    product.stock = stock + quantity; 
                    await product.save();
                } else {
                    console.error(`Invalid quantity for item: ${item.productId._id}`);
                }
            } else {
                console.error(`Product not found: ${item.productId._id}`);
            }
        }

        res.status(200).json({ success: true, message : 'Order canceled successfully' });
    } catch (error) {
        console.error(`Error canceling order: ${error}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const returnOrder = async(req, res) => {
    
}







module.exports = {
    placeOrder,
    orderConfirmed,
    cancelOrder,
    returnOrder

}