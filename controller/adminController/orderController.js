const orderSchema = require('../../model/orderSchema')
const productSchema = require('../../model/productSchema')
const walletSchema = require('../../model/walletSchema')
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose')



const order = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;
    try {

        // Get the total number of orders for pagination
        const totalOrders = await orderSchema.countDocuments();

        const orderDetails = await orderSchema.find().populate('userId')
            .skip(skip)
            .limit(limit);

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/Order', {
            title: 'Orders', 
            orderDetails,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1
        })
    }
    catch (error) {
        console.log(`Error in loading order page, ${error}`)
    }
}

const orderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const order = await orderSchema.findById(orderId)
        if (!order) {
            console.log('No order found for this ID')
        }
        res.render('admin/orderDetails', { title: 'Order Details', order })
    }
    catch (error) {
        console.log(`Error in loading order details page, ${error}`)
    }
}

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await orderSchema.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.items.forEach(item => {
            item.status = 'Rejected';
        });

        order.status = 'Rejected';

        for (const item of order.items) {
            const product = await productSchema.findById(item.productId);
            if (product) {
                product.stock += item.quantity; // Restock 
                await product.save();
            }
        }
        if (order.paymentMethod === 1) {
            const refundAmount = order.items.reduce((total, item) => total + item.quantity * item.price, 0);

            const wallet = await walletSchema.findOne({ user: order.userId });
            if (wallet) {
                wallet.balance += refundAmount;
                await wallet.save();
            } else {
                return res.status(404).json({ message: 'User wallet not found' });
            }
        }

        await order.save();

        return res.status(200).json({ success: true, message: 'Order rejected successfully' });

    } catch (error) {
        console.error(`Error canceling order item, ${error}`);
    }
};

const cancelProduct = async (req, res) => {
    try {
        const { orderId, productId } = req.params;

        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in the order' });
        }

        const product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        product.stock += order.items[itemIndex].quantity;
        await product.save();

        order.items[itemIndex].status = 'Cancelled';

        await order.save();

        res.status(200).json({ success: true, message: 'Product cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error cancelling product' });
    }
}

const changeProductStatus = async (req, res) => {
    try {

        const { orderId, productId } = req.params
        const { newStatus } = req.body

        const order = await orderSchema.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.items.find(item => item.productId.toString() === productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in the order' });
        }

        product.status = newStatus;

        const allItemsSameStatus = order.items.every(i => i.status === newStatus);

        if (allItemsSameStatus) {
            order.status = newStatus;
        }
        await order.save();

        return res.status(200).json({ success: true, message: 'Product status updated successfully' });

    }
    catch (error) {
        console.log('Error in changing product status:', error)
    }

}


const changeOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await orderSchema.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;

        order.items.forEach(item => {
            item.status = status;
        });

        const allItemsSameStatus = order.items.every(i => i.status === status);

        if (allItemsSameStatus) {
            order.status = status;
        }

        await order.save();

        res.json({ success: true, message: 'Order and product status updated successfully', order });
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

const returnProduct = async (req, res) => {

    try {
        const { orderId, productId } = req.params;
        const { returnDecision } = req.body;

        const order = await orderSchema.findById(orderId);

        const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in the order' }).render('pageNotFound', { title: 'Page Not Found' });
        }

        // If admin approves the return
        if (returnDecision === 'Accept') {
            order.items[itemIndex].status = 'Returned';

            await productSchema.findByIdAndUpdate(productId, { $inc: { stock: order.items[itemIndex].quantity } });


            const discount = order.items[itemIndex].discount || 0
            const originalPrice = order.items[itemIndex].productPrice
            const quantity = order.items[itemIndex].quantity
            // const discountedPrice = originalPrice - (originalPrice * (discount / 100));


            let refundAmount = originalPrice * quantity;

            // Check if all other items in the order are already returned
            const allOthersReturned = order.items.every((item, idx) => idx === itemIndex || item.status === 'Returned');

            const calculatedDeliveryCharge = order.totalAmount < 2000 ? 100 : 0;
 
            // Add delivery charge to refund if this is the last item being returned
            if (allOthersReturned && calculatedDeliveryCharge > 0) {
                refundAmount += calculatedDeliveryCharge;
            }

            let wallet = await walletSchema.findOne({ userID: order.userId.toString() });

            if (!wallet) {
                // Create a new wallet if it doesn't exist
                wallet = new walletSchema({
                    userID: order.userId,
                    balance: 0, 
                    transaction: []
                });
                await wallet.save();
            }
    
            // Update wallet balance
            wallet.balance += refundAmount;

            wallet.transaction.push({
                walletAmount: refundAmount,
                orderId : orderId,
                transactionType : 'Credited',
                transactionDate : new Date() 
            })

            await wallet.save();

        } else if (returnDecision === 'Reject') {
            order.items[itemIndex].status = 'Rejected';
        }

        // Check if all items are marked as 'Returned'
        const allReturned = order.items.every(item => item.status === 'Returned');

        if (allReturned) {
            order.status = 'Returned';  
        }

        await order.save();

        return res.status(200).json({ message: `Return ${returnDecision === 'Accept' ? 'approved' : 'rejected'} successfully.` });
    } catch (error) {
        console.error("Error in returnProduct:", error);
        return res.status(500).json({ message: 'Internal server error.' });
    }

}

module.exports = {
    order,
    orderDetails,
    cancelOrder,
    changeOrderStatus,
    cancelProduct,
    changeProductStatus,
    returnProduct

}