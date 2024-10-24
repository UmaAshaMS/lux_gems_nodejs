const dotenv = require('dotenv').config()
const orderSchema = require('../../model/orderSchema')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');



const home = async (req, res) => {

    try {

        const orders = await orderSchema.find()
        const totalOrders = orders.length


        let overallOrderAmount = 0;
        let overallDiscount = 0;

        orders.forEach(order => {
            overallOrderAmount += order.totalAmount;
        
            if (order.coupon && order.coupon.discount) {
                overallDiscount += order.coupon.discount; // Assuming `order.coupon.discount` holds discount value
            }
        });

        res.render('admin/home', {
            title: 'Home',
            totalOrders,
            overallOrderAmount,
            overallDiscount
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
        // const totalOrders = salesData.length


        // let overallOrderAmount = 0;
        // let overallDiscount = 0;

        // salesData.forEach(order => {
        //     overallOrderAmount += order.totalAmount;
        
        //     if (order.coupon && order.coupon.discount) {
        //         overallDiscount += order.coupon.discount; // Assuming `order.coupon.discount` holds discount value
        //     }
        // });
        res.render('admin/salesReport', { title: 'SalesReport', searchQuery, salesData, 
      })
    }
    catch (error) {
        console.log('Error in rendering sales report', error)
    }

}

const generateReport = async (req, res) => {
    console.log('Reached generate report section');
    const { reportRange, startDate, endDate } = req.body;
    let filter = {};
    const currentDate = new Date();

    switch (reportRange) {
        case 'daily':
            filter.orderDate = {
                $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                $lte: new Date()
            };
            break;
        case 'weekly':
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            filter.orderDate = {
                $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
                $lte: new Date()
            };
            break;
        case 'monthly':
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            filter.orderDate = {
                $gte: new Date(startOfMonth.setHours(0, 0, 0, 0)),
                $lte: new Date()
            };
            break;
        case 'yearly':
            const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
            filter.orderDate = {
                $gte: new Date(startOfYear.setHours(0, 0, 0, 0)),
                $lte: new Date()
            };
            break;
        case 'custom':
            if (startDate && endDate) {
                filter.orderDate = {
                    $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
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
        const totalOrders = orders.length;

        console.log(reportRange)

        if (reportRange === 'custom' && (!startDate || !endDate)) {
            res.status(400).json({ message: 'Please select both end date and start date!' })
        }

        res.status(200).json({
            totalSales: totalSales.toFixed(2),
            totalOrders: totalOrders,
            orders: orders.map(order => ({
                _id: order._id,
                customer: order.address.fullName,
                totalPrice: (order.totalAmount || 0).toFixed(2),
                date: new Date(order.orderDate).toLocaleDateString(),
                status: order.status,
                products: order.items.map(item => ({
                    productName: item.productName,
                    quantity: item.quantity
                })),
                paymentMethod: order.paymentMethod,
            }))
        });

    } catch (error) {
        console.log(`Error in generating sales report: ${error}`);
        return res.status(500).send("Internal Server Error");
    }
};


const downloadReport = async (req, res) => {
    console.log('Reached download report');
    const { reportRange, startDate, endDate, format } = req.body;
    console.log(req.body)

    let normalizedFormat = format.toUpperCase();
    if (normalizedFormat === 'XLSX') {
        normalizedFormat = 'EXCEL';
    }


    let filter = {};

    if (reportRange === 'daily') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter = { createdAt: { $gte: today } };

    } else if (reportRange === 'weekly') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filter = { createdAt: { $gte: oneWeekAgo } };

    } else if (reportRange === 'monthly') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        filter = { createdAt: { $gte: oneMonthAgo } };

    } else if (reportRange === 'custom') {
        if (!startDate || !endDate) {
            return res.status(400).send('Start date and end date are required for custom reports.');
        }
        filter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
    }

    const orders = await orderSchema.find(filter);

    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = orders.length;

    if (normalizedFormat === 'PDF') {
        const doc = new PDFDocument();
        const pdfPath = `./reports/sales_report_${reportRange}.pdf`;
        doc.pipe(fs.createWriteStream(pdfPath));

        doc.fontSize(25).text(`Sales Report - ${reportRange}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Total Sales: Rs:${totalSales.toFixed(2)}`);
        doc.text(`Total Orders: ${totalOrders}`);
        doc.moveDown();

        doc.text('Order Details:', { underline: true });
        orders.forEach(order => {
            doc.text(`Order ID: ${order._id}`);
            doc.text(`Customer: ${order.address.fullName}`);
            doc.text(`Total Price: Rs${order.totalAmount.toFixed(2)}`);
            doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
            doc.text(`Order status : ${order.status}`);


            doc.moveDown();
        });

        doc.end();

        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(res);

    } else if (normalizedFormat === 'EXCEL') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: '_id', width: 20 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'Total Price', key: 'totalAmount', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Order Status', key: 'status', width: 10 }
        ];

        orders.forEach(order => {
            worksheet.addRow({
                _id: order._id,
                customer: order.address.fullName,
                totalAmount: order.totalAmount.toFixed(2),
                date: new Date(order.createdAt).toLocaleDateString(),
                status: order.status
            });
        });

        worksheet.addRow([]);
        worksheet.addRow(['Total Sales', '', `Rs:${totalSales.toFixed(2)}`]);
        worksheet.addRow(['Total Orders', '', totalOrders]);



        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await workbook.xlsx.write(res);
        res.end();
    } else {
        res.status(400).send('Invalid format');
    }
};


module.exports = {
    home,
    salesReport,
    generateReport,
    downloadReport,
}