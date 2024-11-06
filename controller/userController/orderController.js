const userSchema = require('../../model/userSchema')
const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const orderSchema = require('../../model/orderSchema')
const walletSchema = require('../../model/walletSchema')
const couponSchema = require('../../model/couponSchema')
const { ObjectId } = require('mongodb')
const mongoose = require('mongoose');
const { refund } = require('paypal-rest-sdk')
const fs = require('fs');
const PDFDocument = require('pdfkit');





const placeOrder = async (req, res) => {
    console.log('place order reached......')
    try {
        const userId = req.session.user;
        const cart = req.session.cart;
        const { addressToSend, selectedPaymentOption, couponCode } = req.body;

        if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
            return res.status(400).json({ message: 'No items in cart to place an order.' });
        }

        let coupon;
        if (couponCode) {
            coupon = await couponSchema.findOne({ couponCode: couponCode });
            if (coupon && coupon.usageLimit > 0) {
                promotionAmount = coupon.discountAmount || 0; // Use coupon discount
            } else {
                return res.status(400).json({ message: 'Invalid or expired coupon.' });
            }
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
                    discount: discount,
                    quantity: item.quantity
                };
            }),
            paymentMethod: selectedPaymentOption,
            totalAmount: totalAmount,
            couponDiscount: cart.promotionAmount
        });

        // Save the order
        const savedOrder = await order.save();

        if (coupon) {
            coupon.usageLimit -= 1;
            await coupon.save();
        }

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

const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(400).json({ success: true, message: 'No order found' });
        }

        const doc = new PDFDocument();
        const pdfPath = `./reports/invoice_${orderId}.pdf`;
        const writeStream = fs.createWriteStream(pdfPath);

        doc.pipe(writeStream);

        // Header Information
        doc.fontSize(20).text("Tax Invoice/Bill of Supply/Cash Memo", { align: 'right', bold: true });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${order._id}`, { align: 'left' });
        doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, { align: 'left' });

        doc.moveDown();
        doc.fontSize(15).text("Sold By:");
        doc.fontSize(12).moveDown().text("LuxGems", { italics: true });
        doc.text("Building 2 (Wh 2),Defence and Aerospace Park, Devanahalli, Bengaluru, Karnataka, 562149 IN");

        // Customer Information
        doc.moveDown();
        doc.fontSize(12).text(`Shipping Address: `);
        doc.text(`${order.address.fullName}`);
        doc.text(`${order.address.addressLine1}`);
        doc.text(`${order.address.addressLine2}`);
        doc.text(`${order.address.city}`);
        doc.text(`${order.address.state}`);
        doc.text(`${order.address.country}`);
        doc.text(`PINCODE :  ${order.address.pincode}`);
        doc.text(`Phone Number: ${order.address.phoneNumber}`);
        doc.moveDown();

        // Table Headers
        doc.fontSize(12).text("Items:", { underline: true }).moveDown();
        const tableTop = doc.y;
        const rowHeight = 20;

        doc.fontSize(10)
            .text("Sl.No", 50, tableTop, { width: 40, align: 'center' })
            .text("Product Name", 100, tableTop, { width: 100, align: 'center' })
            .text("Product Price", 200, tableTop, { width: 80, align: 'center' })
            .text("Quantity", 280, tableTop, { width: 80, align: 'center' })
            .text("Discount  ", 360, tableTop, { width: 80, align: 'center' })
            .text("Total Amount", 440, tableTop, { width: 80, align: 'center' });
        
        doc.moveTo(50, tableTop + rowHeight - 5).lineTo(520, tableTop + rowHeight - 5).stroke();

        // Draw table rows with items data
        let rowY = tableTop + rowHeight;
        order.items.forEach((item, index) => {
            const discount = item.discount || 0;
            const originalPrice = item.productPrice / (1 - discount / 100); 

            // const originalPrice = parseInt(item.productPrice + (item.productPrice * discount/100))
            const amountAfterDiscount = item.productPrice * item.quantity;


            doc.text(index + 1, 50, rowY, { width: 40, align: 'center' })
                .text(item.productName, 100, rowY, { width: 100, align: 'center' })
                .text(`Rs. ${originalPrice}`, 200, rowY, { width: 80, align: 'center' })
                .text(item.quantity, 280, rowY, { width: 80, align: 'center' })
                .text(` ${discount} %`, 360, rowY, { width: 80, align: 'center' })
                .text(`Rs. ${amountAfterDiscount}`, 440, rowY, { width: 80, align: 'center' });

            rowY += rowHeight;
        });
        doc.moveTo(50, tableTop + rowHeight - 5).lineTo(520, tableTop + rowHeight - 5).stroke(); 
        //Coupon Discount
        const couponDiscount = order.couponDiscount || 0; 
        if (couponDiscount >= 0) {
            doc.moveDown();
            doc.text("Coupon Discount", 360, rowY, { width: 80, align: 'center' });
            doc.text(`Rs. ${couponDiscount.toFixed(2)}`, 440, rowY, { width: 80, align: 'center' });
            rowY += rowHeight;
        }

        // Delivery charges row
        const deliveryCharge = order.totalAmount < 2000 ? 100 : 0;
        doc.moveDown();
        doc.text("Delivery Charges", 360, rowY, { width: 80, align: 'center' });
        doc.text(`Rs. ${deliveryCharge.toFixed(2)}`, 440, rowY, { width: 80, align: 'center' });
        rowY += rowHeight;

        // Final total row
        const finalAmount = order.totalAmount - couponDiscount;
        doc.font('Helvetica-Bold').text("Total Amount", 360, rowY, { width: 80, align: 'center', bold : true });
        doc.font('Helvetica');
        doc.text(`Rs. ${finalAmount.toFixed(2)}`, 440, rowY, { width: 80, align: 'center' });

        doc.end();

        writeStream.on('finish', () => {
            res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
            res.setHeader('Content-Type', 'application/pdf');
            const fileStream = fs.createReadStream(pdfPath);

            fileStream.on('error', (err) => {
                console.error('Error reading PDF file:', err);
                res.status(500).json({ success: false, message: 'Failed to download invoice' });
            });
            fileStream.pipe(res);
        });

        writeStream.on('error', (err) => {
            console.error('Error writing PDF file:', err);
            res.status(500).json({ success: false, message: 'Failed to create invoice' });
        });
    }
    catch (error) {
        console.log(`Error in downloading invoice : ${error}`);
    }
};



module.exports = {
    placeOrder,
    orderConfirmed,
    cancelOrder,
    returnOrder,
    downloadInvoice
}