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
        const orderId = req.params.orderId;

        // Fetch the order
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        for (const item of order.items) {
            const product = await productSchema.findById(order.productId);
            if (product) {

                product.stock -= item.quantity;


                if (product.stock < 0) {
                    product.stock = 0;
                }


                await product.save();
            }
        }

        // Update the order status to 'Canceled'
        order.status = 'Rejected';
        await order.save();


        // res.status(200).json({ message: 'Order canceled and stock updated' });
        res.redirect('/admin/Orders')
    } catch (error) {
        console.log(`Error canceling order, ${error}`);
        res.status(500).json({ message: 'Error canceling order' });
    }
}

const changeStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        try {

            const order = await orderSchema.findByIdAndUpdate(orderId, { status }, { new: true });

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            res.json({ success: true, message: 'Order status updated successfully', order });
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
    catch (error) {
        console.log(`Error in changing status, ${error}`)
    }
}
module.exports = {
    order,
    orderDetails,
    cancelOrder,
    changeStatus,

}