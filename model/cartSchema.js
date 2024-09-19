const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    userId : {
        type: String,
    },
    product : [{
        productId : {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'product'
        },
        quantity : {
            type:Number,
            default : 1
        },
        price: {
            type:Number,
        },
        categoryid : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'category'
        },
    },{timestamps : true}],
    
},{timestamps : true}
)

module.exports = mongoose.model('cart', schema)
