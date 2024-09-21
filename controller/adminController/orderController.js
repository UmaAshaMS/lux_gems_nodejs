const orderSchema = require('../../model/orderSchema')

const order = async(req,res) => {
    try{
        const orderDetails = await orderSchema.find().populate('userId')
        res.render('admin/Order', {title:'Orders', orderDetails}) 
    }
    catch(error){
        console.log(`Error in loading order page, ${error}`)
    }
}

const orderDetails = async(req,res) => {
    try{
        const orderId = req.params.orderId
        const order = await orderSchema.findById(orderId)
        if(!order){
            console.log('No order found for this ID')
        }
        res.render('admin/orderDetails', {title:'Order Details', order})
    }
    catch(error){
        console.log(`Error in loading order details page, ${error}`)
    }
}

module.exports ={
    order,
    orderDetails
}