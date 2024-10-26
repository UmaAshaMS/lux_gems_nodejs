const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const orderSchema = require('../../model/orderSchema')
const walletSchema = require('../../model/walletSchema')
const { ObjectId } = require('mongodb')
const mongoose = require('mongoose');
const { refund } = require('paypal-rest-sdk')



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
            const userWallet = await walletSchema.findOne({ userID: new ObjectId(userId) });
            if (!userWallet || userWallet.balance < totalAmount) {
                return res.status(400).json({ message: 'Insufficient wallet balance to place this order.' });
            }
            
            userWallet.balance -= totalAmount;
            await userWallet.save();

        }

        // order details
        const order = new orderSchema({
            userId: new ObjectId(userId),
            address: addressToSend,
            items: cart.cartItems.map(item => {
                const originalPrice = item.productId.productPrice;
                const discount = item.productId.productDiscount || 0;  
                const discountedPrice = originalPrice - (originalPrice * (discount / 100));
                
                return {
                    productId: item.productId._id,
                    productName: item.productId.productName,
                    productPrice: discountedPrice.toFixed(2), 
                    productImage: item.productId.productImage[0],
                    discount : discount,
                    quantity: item.quantity
                };
            }),
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


const orderConfirmed = async (req, res) => {
    try {
        const user = req.session.user
        const orderId = req.params.orderId;

        const category = await categorySchema.find()

        const order = await orderSchema.findById(orderId).populate('items.productId');

        // Calculate the expected delivery date
        const orderDate = new Date(order.orderDate);
        const expectedDeliveryDate = new Date(orderDate);
        expectedDeliveryDate.setDate(orderDate.getDate() + 10);

        res.render('user/orderConfirmation', {
            title: 'Order Confirmation', user, order, category,
            expectedDeliveryDate: expectedDeliveryDate.toDateString()
        })
    }
    catch (error) {
        console.log(`Error in loading order confirmation page, ${error}`)
    }
}

const cancelOrder = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        const order = await orderSchema.findById(orderId).populate('items.productId');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the specific item to cancel in the order
        const itemToCancel = order.items.find(item => item.productId._id.toString() === itemId);

        if (!itemToCancel) {
            return res.status(404).json({ message: 'Item not found in order' });
        }

        // Update the product stock
        const product = await productSchema.findById(itemToCancel.productId._id);
        if (product) {
            const quantity = Number(itemToCancel.quantity);
            const stock = Number(product.stock) || 0;
            if (!isNaN(quantity)) {
                product.stock = stock + quantity;
                await product.save();
            } else {
                console.error(`Invalid quantity for item: ${itemToCancel.productId._id}`);
            }
        } else {
            console.error(`Product not found: ${itemToCancel.productId._id}`);
        }

        itemToCancel.status = 'Cancelled';

        if (order.items.every(item => item.status === 'Cancelled')) {
            order.status = 'Cancelled';
        }

        await order.save();

        res.status(200).json({ success: true, message: 'Item marked as cancelled successfully' });
    } catch (error) {
        console.error(`Error canceling order item: ${error}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const returnOrder = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { returnReason } = req.body;

        const order = await orderSchema.findById(orderId);
        const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product Not found' }).render('pageNotFound', { title: 'Page Not Found' });
        }

        // Update the status of the product in the order to 'Return Under Process'
        order.items[itemIndex].status = 'Return Under Process';
        order.items[itemIndex].returnReason = returnReason;

        await order.save();

        return res.status(200).json({ success: true, message: 'Return request submitted. Waiting for admin approval.' });
    } catch (error) {
        console.log('Error in returning product', error)
        return res.status(500).json({ message: 'Internal server error.' });

    }
}



module.exports = {
    placeOrder,
    orderConfirmed,
    cancelOrder,
    returnOrder

}