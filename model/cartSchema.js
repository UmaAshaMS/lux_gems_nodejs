const mongoose = require('mongoose')

const item = new mongoose.Schema({

})

const schema = new mongoose.Schema({
    userId : {
        type: String,
    },
    items : {
        type : [item]
    },
    totalAmount : {
        type: Number,
        default : 0
    },
    payableAmount : {
        type: Number,
        default : 0
    }
},{timestamps:true})

module.exports = moongose.model('cart', schema)
