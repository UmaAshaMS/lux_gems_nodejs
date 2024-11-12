const dotenv = require('dotenv').config()
const orderSchema = require('../../model/orderSchema')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { order } = require('paypal-rest-sdk');



const home = async (req, res) => {
    try {
        const orders = await orderSchema.find({status:'Delivered'})
        const totalOrders = orders.length

        let overallOrderAmount = 0;
        let overallDiscount = 0;
        const salesData = new Array(12).fill(0);

        orders.forEach(order => {
            overallOrderAmount += order.totalAmount;
        
            if (order.couponDiscount) {
                overallDiscount += order.couponDiscount; 
            }
        
        const month = order.orderDate.getMonth();
        salesData[month] += order.totalAmount; 
        });

        const pendingOrdersCount = await orderSchema.countDocuments({ status: 'Pending' });


        const distribution = await orderSchema.aggregate([
            {
                $match: { status: 'Delivered' }  
            },
            {
                $group: {
                    _id: '$paymentMethod',       
                    count: { $sum: 1 }          
                }
            }
        ]);

        const paymentMethodMap = {
            0: 'COD',
            1: 'Paypal',
            2: 'Wallet',
            3: 'InstaMojo',
            4: 'Razorpay',
        };

        const transformedDistribution = distribution.map(item => ({
            method: paymentMethodMap[item._id] || 'Unknown', 
            count: item.count,
        }));
        res.render('admin/home', {
            title: 'Home',
            totalOrders,
            overallOrderAmount,
            overallDiscount,
            salesData,
            distribution : transformedDistribution,
            pendingOrdersCount,
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
        res.render('admin/salesReport', { title: 'SalesReport', searchQuery, salesData, 
      })
    }
    catch (error) {
        console.log('Error in rendering sales report', error)
    }

}

const generateReport = async (req, res) => {
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
    const { reportRange, startDate, endDate, format } = req.body;

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

const salesChart = async (req, res) => {
    console.log('Reached chart data');
    const { reportRange, startDate, endDate } = req.body;

    console.log(req.body)

    let filter = {};
    const currentDate = new Date();

    // Determine the date range based on the report type
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
                return res.status(400).json({ message: "Please provide both start and end dates for custom range." });
            }
            break;
        default:
            return res.status(400).json({ message: "Invalid report range selected." });
    }
    console.log('Filter conditions:', filter);

    try {
        // Fetch orders based on the filter
        const orders = await orderSchema.find(filter);
        console.log('Orders fetched:', orders);

        // Initialize the sales data to build the chart dataset
        const salesData = {};

        orders.forEach(order => {
            let dateKey;

            // Group data based on reportRange
            switch (reportRange) {
                case 'daily':
                    // Group by hour
                    const orderDate = new Date(order.orderDate);
                    dateKey = `${orderDate.getHours()}:00`; // Hourly format
                    break;
                case 'weekly':
                    // Group by day of the week
                    dateKey = new Date(order.orderDate).toLocaleDateString(); // Date format
                    break;
                case 'monthly':
                    // Group by week in the month
                    const weekNumber = Math.ceil(new Date(order.orderDate).getDate() / 7);
                    dateKey = `Week ${weekNumber}`;
                    break;
                case 'yearly':
                    // Group by month
                    dateKey = new Date(order.orderDate).toLocaleString('default', { month: 'long' });
                    break;
            }

            // Sum the total amount for each group
            salesData[dateKey] = (salesData[dateKey] || 0) + order.totalAmount;
        });


        const labels = [];
        const data = [];

        switch (reportRange) {
            case 'daily':
                for (let i = 0; i < 24; i++) {
                    const hourLabel = `${i}:00`;
                    labels.push(hourLabel);
                    data.push(salesData[hourLabel] || 0);
                }
                break;
            case 'weekly':
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                for (let i = 0; i < 7; i++) {
                    const dayLabel = new Date(startOfWeek);
                    dayLabel.setDate(startOfWeek.getDate() + i);
                    const dayString = dayLabel.toLocaleDateString();
                    labels.push(dayString);
                    data.push(salesData[dayString] || 0);
                }
                break;
                case 'monthly':
                    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                    for (let i = 1; i <= daysInMonth; i++) {
                        const date = new Date(startOfMonth);
                        date.setDate(i);
                        const weekNumber = `Week ${Math.ceil(i / 7)}`;
                        labels.push(weekNumber);
                        data.push(salesData[weekNumber] || 0);
                    }
                    break;
                case 'yearly':
                    const months = Array.from({ length: 12 }, (_, i) => 
                        new Date(currentDate.getFullYear(), i).toLocaleString('default', { month: 'long' })
                    );
                    months.forEach(month => {
                        labels.push(month);
                        data.push(salesData[month] || 0);
                    });
                    break;
            }


        res.status(200).json({ labels, datasets  : [
            {
                label: 'Total Sales',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            }
        ]});
    } catch (error) {
        console.error(`Error generating sales chart data: ${error}`);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const paymentMethodStats = async(req,res) => {
    try{
        

    }
    catch(error){
        console.log(`Error in creating payment method pie chart`)
    }
}

const trendingProducts = async(req,res) => {
    const searchQuery = req.query.searchQuery || ''

    try{
        const topProducts = await orderSchema.aggregate([
            { $unwind: "$items" }, 
            {
                $group: {
                    _id: "$items.productId", 
                    totalSold: { $sum: "$items.quantity" } 
                }
            },
            {
                $lookup: {
                    from: "products", 
                    localField: "_id", 
                    foreignField: "_id",
                    as: "productInfo" 
                }
            },
            { $unwind: "$productInfo" }, 
            { $sort: { totalSold: -1 } },
            { $limit: 3 }, 
            {
                $project: {
                    productId: "$_id", 
                    productName: "$productInfo.productName", 
                    productPrice: "$productInfo.productPrice",
                    productImage:  { $arrayElemAt: ["$productInfo.productImage", 0] },
                    totalSold: 1 
                }
            }
        ]);

        const topCategories = await orderSchema.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId", 
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            {
                $lookup: {
                    from: "products", 
                    localField: "_id", 
                    foreignField: "_id", 
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $lookup: {
                    from: "categories", 
                    localField: "productInfo.productCategory", 
                    foreignField: "_id", 
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            {
                $group: {
                    _id: "$categoryInfo._id", 
                    categoryName: { $first: "$categoryInfo.name" },
                    totalSold: { $sum: "$totalSold" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 3 },
            {
                $project: {
                    categoryId: "$_id", 
                    categoryName: 1,
                    totalSold: 1 
                }
            }
        ]);

        res.render('admin/trending', {
            topProducts,
            topCategories,
            title: 'Trending Products', 
            searchQuery,
        })
    }
    catch(error){
        console.log(`Error in getting trending products: ${error}`)
    }
}




module.exports = {
    home,
    salesReport,
    generateReport,
    downloadReport,
    salesChart,
    paymentMethodStats,
    trendingProducts,
}