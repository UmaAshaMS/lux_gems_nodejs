const mongoose = require('mongoose')
const schema =  new mongoose.Schema ({
    offerTitle: {
        type: String,
        required: true,
        trim: true
    },
    offerType: {
        type: String,
        enum: ['product', 'category', 'referral'], 
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'offerType', 
        required: true
    },
    discountPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100 
    },
    isActive: {
        type: Boolean,
        default: true
    },

},{timestamps:true})

module.exports = mongoose.model('offer', schema)