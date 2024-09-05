const mongoose = require('mongoose')
const addressSchema = require('./addressSchema')
const schema = new mongoose.Schema({
    name: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    email: {
        type: String,
    },
    password: {
        type: String,
    },
    isVerified: {
        type:Boolean,
        default:false
    },
    isBlocked: { 
        type: Boolean, 
        default: false 
    },
    address: {
        type:[addressSchema],
        default:[]
    }
},
    { timestamps: true })
module.exports = mongoose.model('user', schema)