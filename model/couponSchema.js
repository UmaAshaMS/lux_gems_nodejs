const mongoose = require('mongoose')

const schema =  new mongoose.Schema ({
    couponCode : {
        type:String
    },
    discountType : {
        type:String
    },
    discount: {
        type: Number
    },
    expiryDate : {
        type: Date
    },
    minimumAmount : {
        type : Number
    },
    usageLimit : {
        type: Number
    },
    isActive : {
        type: Boolean,
        default : true
    }
},{timestamps : true})

module.exports = mongoose.model('coupon', schema)