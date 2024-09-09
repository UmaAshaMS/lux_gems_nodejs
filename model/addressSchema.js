const mongoose = require('mongoose')

// const schema = new mongoose.Schema({
const addressSchema = new mongoose.Schema({

    fullName: { 
        type: String 
    },
    phoneNumber: { 
        type: String 
    },
    email: { 
        type: String 
    },
    addressLine1: { 
        type: String 
    },
    addressLine2: { 
        type: String 
    },
    city: {
        type: String 
    },
    pincode: { 
        type: String 
    },
    state: { 
        type: String 
    },
    country: { 
        type: String 
    },
    isActive : {
        type : Boolean,
        default : true
    },
    isDefault : {
        type: Boolean,
        default:false
    }
},
    { timestamps: true })

// module.exports = mongoose.model('address', schema)
module.exports = addressSchema