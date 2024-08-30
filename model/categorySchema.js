const mongoose = require('mongoose')
const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    
}, { timestamps: true })


module.exports = mongoose.model('category', schema)