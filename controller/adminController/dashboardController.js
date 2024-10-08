const dotenv = require('dotenv').config()
const orderSchema = require('../../model/orderSchema')


const home = async(req, res) => {

    try {
        res.setHeader('Cache-Control', 'no-store'); // Prevent caching
        
        // Fetching order details for calculations
        const orderDetailsProfit = await orderSchema.find({status: { $nin: ['Pending']} })
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

        res.render('admin/home', { title: 'Home' ,
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




module.exports = {
    home,
}