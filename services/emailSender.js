const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:process.env.SMTP_PORT,
    secure:false,
    auth: {
        user: process.env.MAIL,
        pass: process.env.PASS
    }
})

function sendOTP(email,otp){

    const mailOptions ={
        from:"LuxGems",
        to:email,
        subject:"Verification code from LuxGems",
        text: `Enter the One Time Password ${otp} to verify your account`
    }

    transporter.sendMail(mailOptions,(err,info)=>{
        if(err){
            console.log(`Error while sending mail ${err}`)
        }else{
            console.log('Email sent successfully')
        }
    })
}

module.exports=sendOTP;