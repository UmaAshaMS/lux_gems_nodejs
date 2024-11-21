
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// multer for storing images from input type files

const storage = multer.diskStorage({
    // destination of the file to store is set as ./uploads
    destination: function (req, file, cb) {
        cb(null, `./uploads/`)
    },
    // file name of the images stored which is start with date inn milliseconds and a random long numbers and the file name at the end 
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + `-${file.originalname}`)
    }
})


const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
    // fileFilter: function (req, file, cb) {
    //     console.log('File filter triggered:', file);
    //     // checkFileType(file, cb);
    // }
 })

module.exports = upload