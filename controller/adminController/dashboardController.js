const dotenv = require('dotenv').config()
const orderSchema = require('../../model/orderSchema')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');



const home = async (req, res) => {

    try {
        res.setHeader('Cache-Control', 'no-store'); // Prevent caching

        // Fetching order details for calculations
        const orderDetailsProfit = await orderSchema.find({ status: { $nin: ['Pending'] } })
            .populate('items.productId')
            .sort({ createdAt: -1 });

        // Total number of orders
        const totalCollections = await orderSchema.countDocuments();

        // Current date
        const currentDate = new Date();
        // Start of today, week, and month
        const startOfToday = new Date(currentDate.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // Arrays for daily sales and daily array
        const dailySalesArray = [];
        const dailyArray = [];

        // Iterate over days starting from today to start of the month
        let dayIterator = new Date(currentDate);
        while (dayIterator >= startOfMonth) {
            const dayStart = new Date(dayIterator);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayIterator);
            dayEnd.setHours(23, 59, 59, 999);

            // Calculate total sales for the day
            const dayTotal = orderDetailsProfit.reduce((acc, ele) => {
                const eleDate = new Date(ele.createdAt);
                if (eleDate >= dayStart && eleDate <= dayEnd) {
                    return acc + ele.totalPrice;
                }
                return acc;
            }, 0);

            dailySalesArray.push(dayTotal);
            dailyArray.push(dayStart.getDate());

            dayIterator.setDate(dayIterator.getDate() - 1); // Move to the previous day
        }

        // Monthly sales array
        const monthlySalesArray = new Array(12).fill(0); // Initialize array with 12 zeros
        orderDetailsProfit.forEach(order => {
            const month = new Date(order.createdAt).getMonth();
            monthlySalesArray[month] += order.totalPrice;
        });

        // find the number of payment methods
        let payByCash = 0
        let payByRazorPay = 0
        let payByWallet = 0

        orderDetailsProfit.forEach((order) => {
            if (order.paymentMethod === 'Cash on delivery') {
                payByCash++;
            }
            if (order.paymentMethod === 'Razor pay') {
                payByRazorPay++;
            }
            if (order.paymentMethod === 'Wallet') {
                payByWallet++;
            }
        })

        const paymentMethodChart = [payByCash, payByRazorPay, payByWallet]

        res.render('admin/home', {
            title: 'Home',
            dailySalesArray,
            dailyArray,
            monthlySalesArray,
            paymentMethodChart,
            totalCollections
        })
    }
    catch (err) {
        console.log(`Error in rendering admin home page ${err}`)
    }
}

const salesReport = async (req, res) => {
    try {
        const searchQuery = req.query.searchQuery || ''
        const salesData = await orderSchema.find()
        res.render('admin/salesReport', { title: 'SalesReport', searchQuery, salesData })
    }
    catch (error) {
        console.log('Error in rendering sales report', error)
    }

}

const generateReport = async (req, res) => {
    console.log('Reached generate report section')
    const { reportRange, startDate, endDate } = req.body;
    let filter = {};
    const currentDate = new Date();

    switch (reportRange) {
        case 'daily':
            filter.orderDate = {
                $gte: new Date(currentDate.setHours(0, 0, 0, 0)), // Start of today
                $lte: new Date() // End of today
            };
            break;
        case 'weekly':
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start of the week (Sunday)
            filter.orderDate = {
                $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
                $lte: new Date() // Current date
            };
            break;
        case 'monthly':
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start of month
            filter.orderDate = {
                $gte: new Date(startOfMonth.setHours(0, 0, 0, 0)),
                $lte: new Date() // Current date
            };
            break;
        case 'custom':
            if (startDate && endDate) {
                filter.orderDate = {
                    $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)), // Custom start date
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) // Custom end date
                };
            } else {
                return res.status(400).send("Please provide both start and end dates.");
            }
            break;
        default:
            return res.status(400).send("Invalid report range selected.");
    }


    try {
        const orders = await orderSchema.find(filter);

        const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        // const totalDiscounts = orders.reduce((sum, order) => sum + order.couponDiscount, 0);
        const totalOrders = orders.length;

        res.status(200).json({
            totalSales: totalSales.toFixed(2),
            // totalDiscounts: totalDiscounts.toFixed(2),
            totalOrders: totalOrders,
            orders: orders.map(order => ({
                _id: order._id,
                customer: order.address.fullName,
                totalPrice: (order.totalAmount || 0).toFixed(2),
                discount: (order.couponDiscount || 0).toFixed(2),
                date: new Date(order.orderDate).toLocaleDateString()
            }))
        });

        
        
    }
    catch (error) {
        console.log(`Error in generating sales report, ${error}`)
    }
}

const downloadReport = async(req,res) => {
    const { reportData, format } = req.body;

    if (format === 'PDF') {
        const doc = new PDFDocument();
        const pdfPath = './reports/sales_report.pdf';
        doc.pipe(fs.createWriteStream(pdfPath));

        doc.fontSize(25).text(`Sales Report - ${reportRange}`, {
            align: 'center'
        });

        doc.moveDown();
        doc.fontSize(14).text(`Total Sales: $${totalSales.toFixed(2)}`);
        doc.text(`Total Discounts: $${totalDiscounts.toFixed(2)}`);
        doc.text(`Total Orders: ${totalOrders}`);
        doc.moveDown();

        doc.text('Order Details:', { underline: true });
        orders.forEach(order => {
            doc.text(`Order ID: ${order._id}`);
            doc.text(`Customer: ${order.address.fullName}`);
            doc.text(`Total Price: $${order.totalPrice.toFixed(2)}`);
            doc.text(`Discount: $${order.couponDiscount.toFixed(2)}`);
            doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
            doc.moveDown();
        });
        
        doc.end();

        res.setHeader('Content-disposition', 'attachment; filename=sales_report.pdf');
        res.setHeader('Content-type', 'application/pdf');
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(res);
    }

    else if (format === 'EXCEL') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: '_id', width: 20 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'Total Price', key: 'totalAmount', width: 15 },
            // { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Date', key: 'date', width: 15 }
        ];

        orders.forEach(order => {
            worksheet.addRow({
                _id: order._id,
                customer: order.address.fullName,
                totalPrice: order.totalPrice,
                discount: order.couponDiscount,
                date: new Date(order.createdAt).toLocaleDateString()
            });
        });

        worksheet.addRow([]);
        worksheet.addRow(['Total Sales', '', `$${totalSales.toFixed(2)}`]);
        worksheet.addRow(['Total Discounts', '', `$${totalDiscounts.toFixed(2)}`]);
        worksheet.addRow(['Total Orders', '', totalOrders]);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    }


}

module.exports = {
    home,
    salesReport,
    generateReport,
    downloadReport,
}