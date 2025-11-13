// const multer = require('multer');
// const xlsx = require('xlsx');
// const Tasks = require('../models/taskModel');

// const storage = multer.memoryStorage(); 
// const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('file'); 

// const bulkUploadTasks = (req, res, next) => {
//     upload(req, res, async (err) => {
//         if (err) {
//             return res.status(400).json({ error: 'File upload error', message: err.message });
//         }
        
//         if (!req.file) {
//             return res.status(400).json({ error: 'No file uploaded' });
//         }

//         try {
            
//             const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
//             const sheetName = workbook.SheetNames[0];
//             const sheet = workbook.Sheets[sheetName];
//             const data = xlsx.utils.sheet_to_json(sheet);

//             const tasksToInsert = data.map((record) => {
//                 const { empCode, firstName, lastName, birthDate, workEmail } = record;

//                 if (!empCode || !firstName || !lastName || !birthDate || !workEmail) {
//                     throw new Error(`Missing required fields in record: ${JSON.stringify(record)}`);
//                 }

//                 return {
//                     empCode,
//                     firstName,
//                     lastName,
//                     birthDate,
//                     workEmail
//                 };
//             });

//             const existingTasks = await Tasks.find({
//                 $or: tasksToInsert.map(task => ({ empCode: task.empCode }))
//             });

//             const existingEmpCodes = existingTasks.map(task => task.empCode);
//             const newTasks = tasksToInsert.filter(task => !existingEmpCodes.includes(task.empCode));

            
//             if (newTasks.length > 0) {
//                 const insertedTasks = await Tasks.insertMany(newTasks);
//                 res.status(201).json({
//                     message: `${insertedTasks.length} tasks uploaded successfully`,
//                     data: insertedTasks
//                 });
//             } else {
//                 res.status(200).json({
//                     message: 'All tasks already exist in the database',
//                 });
//             }
//         } catch (error) {
//             next(error);
//         }
//     });
// };

// module.exports = {
//     bulkUploadTasks
// };

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const Tasks = require('../models/taskModel');

const bulkUploadTasks = async (req, res) => {
    try {
        
        const tasksToInsert = req.body;

        if (!Array.isArray(tasksToInsert) || tasksToInsert.length === 0) {
            return res.status(400).json({
                error: 'Invalid data',
                message: 'Request body must be a non-empty array of tasks'
            });
        }

        
        const validatedTasks = tasksToInsert.map((task, index) => {
            const { empCode, firstName, lastName, birthDate, workEmail } = task;

            
            if (!empCode || !firstName || !lastName || !birthDate || !workEmail) {
                throw new Error(`Missing required fields in task at index ${index}: ${JSON.stringify(task)}`);
            }

            
            if (typeof empCode !== 'string' || empCode.length > 20) {
                throw new Error(`Invalid empCode format at index ${index}`);
            }
            if (typeof workEmail !== 'string' || !workEmail.includes('@')) {
                throw new Error(`Invalid email format at index ${index}`);
            }

            return {
                empCode: empCode.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                birthDate: birthDate, // Ensure valid date here...
                workEmail: workEmail.trim()
            };
        });

      
        const existingTasks = await Tasks.find({
            empCode: { $in: validatedTasks.map(task => task.empCode) }
        });

        const existingEmpCodes = new Set(existingTasks.map(task => task.empCode));
        const newTasks = validatedTasks.filter(task => !existingEmpCodes.has(task.empCode));

        if (newTasks.length === 0) {
            return res.status(200).json({
                message: 'All tasks already exist in the database',
                totalRecords: tasksToInsert.length,
                duplicates: tasksToInsert.length
            });
        }

        
        const insertedTasks = await Tasks.insertMany(newTasks, { ordered: false });

        res.status(201).json({
            message: `${insertedTasks.length} tasks uploaded successfully`,
            totalRecords: tasksToInsert.length,
            inserted: insertedTasks.length,
            duplicates: tasksToInsert.length - insertedTasks.length,
            data: insertedTasks
        });

    } catch (error) {
        res.status(500).json({
            error: 'Bulk upload failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    bulkUploadTasks
};

