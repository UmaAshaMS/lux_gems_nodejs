const mongoose = require('mongoose')
const dotenv = require('dotenv').config()

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
        console.log('MongoDB connected')
    }
    catch(err){
        console.error('Error during connection : ',err )
    }
}


module.exports = connectDB