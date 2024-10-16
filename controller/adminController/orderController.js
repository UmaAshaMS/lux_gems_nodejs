const orderSchema = require('../../model/orderSchema')
const productSchema = require('../../model/productSchema')

const order = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
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
            title: 'Orders', orderDetails,
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
        const { orderId, itemId } = req.params;

        // Fetch the order by ID
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the item within the order that matches the provided itemId
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in the order' });
        }

        // Get the specific item from the order
        const item = order.items[itemIndex];
        const product = await productSchema.findById(item.productId);
        if (product) {
            // Update the stock based on the item quantity
            product.stock += item.quantity;

            // Ensure the stock doesn't go below 0 (just in case)
            if (product.stock < 0) {
                product.stock = 0;
            }

            // Save the product with updated stock
            await product.save();
        }

        // Option 1: Remove the item from the order
        // order.items.splice(itemIndex, 1); // Remove the item from the array

        // Option 2: Mark the item as "Canceled"
        order.items[itemIndex].status = 'Canceled'; // Mark the item as canceled

        // Check if all items are now canceled, and update the order status if necessary
        const allItemsCanceled = order.items.every(item => item.status === 'Canceled');
        if (allItemsCanceled) {
            order.status = 'Rejected'; // Mark the entire order as rejected if all items are canceled
        }

        // Save the updated order
        await order.save();

        // Redirect or send a response
        res.redirect('/admin/Orders');
    } catch (error) {
        console.error(`Error canceling order item, ${error}`);
        res.status(500).json({ message: 'Error canceling order item' });
    }
};


// const changeStatus = async (req, res) => {
//     try {
//         const { orderId } = req.params;
//         const { status } = req.body;

//         try {

//             const order = await orderSchema.findByIdAndUpdate(orderId, { status }, { new: true });

//             if (!order) {
//                 return res.status(404).json({ success: false, message: 'Order not found' });
//             }

//             res.json({ success: true, message: 'Order status updated successfully', order });
//         } catch (error) {
//             console.error('Error updating order status:', error);
//             res.status(500).json({ success: false, message: 'Server error' });
//         }
//     }
//     catch (error) {
//         console.log(`Error in changing status, ${error}`)
//     }
// }

const changeStatus = async (req, res) => {
    try {
        const { orderId, itemId } = req.params; 
        const { status } = req.body;

        // Find the order by orderId
        const order = await orderSchema.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the item in the order by itemId
        const item = order.items.id(itemId); // Mongoose provides a method to get the sub-document by ID

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in the order' });
        }

        // Update the status of the specific item
        item.status = status;
        await order.save(); // Save the updated order document

        res.json({ success: true, message: 'Item status updated successfully', order });
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

module.exports = {
    order,
    orderDetails,
    cancelOrder,
    changeStatus,

}