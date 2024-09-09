const mongoose = require('mongoose')
const product = new mongoose.Schema({

})

const schema = new mongoose.Schema({
    userId : {
        type : String
    },
    product : {
        type : [product]
    }
},{timestamps:true})

module.exports = mongoose.model('wishlist',schema)