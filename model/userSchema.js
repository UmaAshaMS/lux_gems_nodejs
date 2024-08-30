const mongoose = require('mongoose')
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
    isBlocked: { 
        type: Boolean, 
        default: false },
    }, 
    { timestamps: true })
module.exports = mongoose.model('user', schema)