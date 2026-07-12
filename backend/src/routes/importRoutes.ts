import express from 'express';
import multer from 'multer';
import { importCsv } from '../controllers/importController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', upload.single('csvFile'), importCsv);

export default router;
