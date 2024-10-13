const mongoose=require('mongoose')

const schema=new mongoose.Schema({
    userID:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    balance:{
        type:Number,
        default:0
    },
    transaction:[{
        walletAmount :{
            type : Number,
            default: 0
        },
        orderId:{
            type: String
        },
        transactionType:{
            type: String,
            enum:['Credited','Debited']
        },
        transactionDate:{
            type:Date,
            required: true,
            default:Date.now()
        }
    }]
  
},{timestamps:true})

module.exports=mongoose.model('wallet',schema)