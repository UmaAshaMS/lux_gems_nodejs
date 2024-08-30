// const multer = require('multer');
// const path = require('path');

// // Set storage engine
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'uploads/'); // Specify the directory where files should be saved
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// });

// // Initialize upload
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1000000 }, // Limit file size to 1MB
//     fileFilter: function (req, file, cb) {
//         checkFileType(file, cb);
//     }
// }).array('productImage', 4); // Handling multiple files with a limit of 4 images

// // Check file type
// function checkFileType(file, cb) {
//     // Allowed extensions
//     const filetypes = /jpeg|jpg|png|gif/;
//     // Check extension
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     // Check mime type
//     const mimetype = filetypes.test(file.mimetype);

//     if (mimetype && extname) {
//         return cb(null, true);
//     } else {
//         cb('Error: Images Only!');
//     }
// }

// module.exports = upload;
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
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB file size limit

 })

module.exports = upload