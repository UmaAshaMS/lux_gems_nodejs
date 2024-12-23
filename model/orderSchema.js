const mongoose = require('mongoose')
const schema = new mongoose.Schema(
    {
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user', 
    },
    address: {
        fullName: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        country: String,
        pincode: String,
        phoneNumber: String
    },
    items: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'product',  
            },
            productName : {
                type: String
            },
            productPrice: {
                type : String
            },
            productImage : {
                type : String
            },
            quantity : {
                type : Number
            },
            discount : {
                type: Number
            },
            status: {
                type: String, 
                enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Rejected', 'Return Under Process', 'Payment Pending' ], 
                default: 'Pending' 
            },
            returnReason: String,
        }
    ],
    paymentMethod: {
         type: String,  
    },
    status: {
        type: String, 
        default: 'Pending'
    },
    orderDate: { 
        type: Date, 
        default: Date.now 
    },
    totalAmount: {
        type: Number, 
    },
    couponDiscount : {
        type : Number,
        default : 0
    },
    couponId : {
        type: String
    },
    isArchived : {
        type:Boolean,
        default : false
    }
    
}, { timestamps: true })

module.exports = mongoose.model('order', schema)