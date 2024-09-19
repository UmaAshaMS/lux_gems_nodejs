const mongoose = require('mongoose')
const schema = new mongoose.Schema(
    {
    userId: { 
        type: userSchema.Types.ObjectId, 
        ref: 'User', 
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
            productId: { type: productSchema.Types.ObjectId, ref: 'Product',  },
            name: String,
            price: Number,
            quantity: Number
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
        type: Date, default: Date.now 
    },
    totalAmount: {
        type: Number, 
    }
})

module.exports = mongoose.model('order', schema)