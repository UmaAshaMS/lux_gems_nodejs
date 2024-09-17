const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    productName: {
        type : String,
    },
    stock: {
        type : Number,
        
    },
    productPrice : {
        type : Number,
    },
    productDescription:{
        type: String,
    },
    productDiscount:{
        type:Number,
    },
    productCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category'
    },
    productOffer : {
        type: Number
    },
    productImage: {
        type: [String] 
    },
    isActive: {
        type: Boolean,
        default: true
    }
},{timestamps:true})

module.exports = mongoose.model("product",schema)